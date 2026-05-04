import React, { createContext, useContext, useState, useCallback } from "react";
import { apiFetch, setToken, clearTokens } from "./api";

export type Role =
  | "FARMER"
  | "SUPER_ADMIN"
  | "STATE_HEAD"
  | "DC"
  | "DISTRICT_OFFICER"
  | "FIELD_INSPECTOR"
  | "ANALYST";

interface User {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  role: Role;
  udlrn?: string;
}

interface AuthCtx {
  user: User | null;
  isLoading: boolean;
  farmerLogin: (mobile: string) => Promise<unknown>;
  farmerVerifyOtp: (mobile: string, otp: string) => Promise<void>;
  adminLogin: (email: string, password: string, totp: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("bhuvigyan_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const farmerLogin = useCallback(async (mobile: string) => {
    setIsLoading(true);
    try {
      return await apiFetch("/v1/farmer/login", {
        method: "POST",
        body: JSON.stringify({ mobile }),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const farmerVerifyOtp = useCallback(async (mobile: string, otp: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ data: { accessToken: string; refreshToken: string; farmer: { id: string; fullName: string; mobile: string }; udlrn: string } }>(
        "/v1/farmer/verify-otp",
        { method: "POST", body: JSON.stringify({ mobile, otp }) },
      );
      const u: User = {
        id: res.data.farmer.id,
        name: res.data.farmer.fullName,
        mobile: res.data.farmer.mobile,
        role: "FARMER",
        udlrn: res.data.udlrn,
      };
      setToken(res.data.accessToken);
      localStorage.setItem("bhuvigyan_refresh", res.data.refreshToken);
      localStorage.setItem("bhuvigyan_role", "FARMER");
      localStorage.setItem("bhuvigyan_user", JSON.stringify(u));
      setUser(u);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const adminLogin = useCallback(async (email: string, password: string, totpCode: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ data: { accessToken: string; refreshToken: string; officer: { id: string; fullName: string; email: string; role: string } } }>(
        "/v1/admin/login",
        { method: "POST", body: JSON.stringify({ email, password, totpCode }) },
      );
      const u: User = {
        id: res.data.officer.id,
        name: res.data.officer.fullName,
        email: res.data.officer.email,
        role: res.data.officer.role as Role,
      };
      setToken(res.data.accessToken);
      localStorage.setItem("bhuvigyan_refresh", res.data.refreshToken);
      localStorage.setItem("bhuvigyan_role", u.role);
      localStorage.setItem("bhuvigyan_user", JSON.stringify(u));
      setUser(u);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, farmerLogin, farmerVerifyOtp, adminLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
