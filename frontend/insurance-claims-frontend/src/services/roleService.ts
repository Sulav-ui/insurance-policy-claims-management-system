import { getAuth } from "./authService";

export function getUserRole(): "USER" | "ADMIN" | null {
  return getAuth()?.role ?? null;
}

export function isAdmin(): boolean {
  return getUserRole() === "ADMIN";
}
