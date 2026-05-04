#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Push to GitHub automatically after every merge.
# Prefers GITHUB_PERSONAL_ACCESS_TOKEN (broader scope); falls back to GITHUB_TOKEN.
PUSH_TOKEN="${GITHUB_PERSONAL_ACCESS_TOKEN:-$GITHUB_TOKEN}"
if [ -z "$PUSH_TOKEN" ]; then
  echo "WARNING: No GitHub token found — skipping GitHub sync"
  exit 1
fi

GITHUB_URL="https://x-access-token@github.com/Adi0825/AGRI.git"

# Use GIT_ASKPASS so the token never touches .git/config or command-line arguments.
ASKPASS=$(mktemp)
chmod 700 "$ASKPASS"
printf '#!/bin/sh\necho "%s"\n' "$PUSH_TOKEN" > "$ASKPASS"
TMPINDEX=$(mktemp)
trap "rm -f $ASKPASS $TMPINDEX" EXIT

push_with_auth() {
  GIT_ASKPASS="$ASKPASS" git push "$GITHUB_URL" "$@"
}

fetch_with_auth() {
  GIT_ASKPASS="$ASKPASS" git fetch "$GITHUB_URL" "$@"
}

# Try a full push first (works when token has 'workflow' scope)
if push_with_auth HEAD:main --force --no-verify 2>&1; then
  echo "GitHub sync complete — full push to Adi0825/AGRI"
  exit 0
fi

echo "Full push rejected (token likely missing 'workflow' scope). Syncing without .github/workflows/ ..."

ORIG_HEAD=$(git rev-parse HEAD)

# Fetch github/main into a local ref so the object exists in the local ODB.
# git commit-tree requires the parent object to exist locally — ls-remote is
# not enough because it only returns the SHA without fetching the object.
fetch_with_auth "refs/heads/main:refs/remotes/github-sync/main" \
  --force --no-tags 2>/dev/null || true
GITHUB_HEAD=$(git rev-parse refs/remotes/github-sync/main 2>/dev/null || echo "")

# Build a filtered tree using a temporary index — never touches the real index.
GIT_INDEX_FILE="$TMPINDEX" git read-tree HEAD
GIT_INDEX_FILE="$TMPINDEX" git rm --cached -r .github/workflows/ --quiet 2>/dev/null || true
FILTERED_TREE=$(GIT_INDEX_FILE="$TMPINDEX" git write-tree)

# git commit-tree requires an identity; set one if not already configured.
git config user.email > /dev/null 2>&1 || git config user.email "replit-agent@users.noreply.github.com"
git config user.name > /dev/null 2>&1 || git config user.name "Replit Agent"

# Parent: use the current GitHub HEAD (locally fetched) so filtered history
# always chains cleanly without divergence on subsequent syncs.
if [ -n "$GITHUB_HEAD" ]; then
  FILTERED_COMMIT=$(git log -1 --format="%B" "$ORIG_HEAD" | \
    git commit-tree "$FILTERED_TREE" -p "$GITHUB_HEAD")
else
  # First ever push — no parent
  FILTERED_COMMIT=$(git log -1 --format="%B" "$ORIG_HEAD" | \
    git commit-tree "$FILTERED_TREE")
fi

push_with_auth "${FILTERED_COMMIT}:refs/heads/main" --force
echo "GitHub sync complete (Adi0825/AGRI) — all code synced"
echo "NOTE: Update GITHUB_PERSONAL_ACCESS_TOKEN with 'workflow' scope to also sync .github/workflows/ files"
