import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  login: (passcode: string) => Promise<{ success: boolean; needsSetup?: boolean }>;
  loginAsGuest: () => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("eim_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (passcode: string) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem("eim_user", JSON.stringify(data.user));
        return { success: true, needsSetup: data.needsSetup };
      }
      return { success: false };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false };
    }
  };

  const loginAsGuest = () => {
    const guestUser: User = {
      id: 0,
      name: "Guest",
      role: "Guest",
      is_active: 1,
    };
    setUser(guestUser);
    localStorage.setItem("eim_user", JSON.stringify(guestUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("eim_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, loginAsGuest, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
