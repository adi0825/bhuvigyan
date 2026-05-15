interface Props {
  message: string
  hint?: string
  onRetry?: () => void
}

export default function ErrorBox(
  { message, hint, onRetry }: Props
) {
  return (
    <div className="bg-red-50 border border-red-200
      rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <span className="text-red-500 text-xl">⚠️</span>
        <div className="flex-1">
          <div className="font-semibold text-red-800
            text-sm">
            {message}
          </div>
          {hint && (
            <div className="text-xs text-red-600 mt-1">
              💡 {hint}
            </div>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-xs bg-red-100
                hover:bg-red-200 text-red-700
                px-3 py-1.5 rounded-lg
                transition-colors font-medium">
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
