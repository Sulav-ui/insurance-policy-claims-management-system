const API_URL = "/api/auth";

export interface AuthResponse {
  token: string;
  tokenType: string;
  role: "USER" | "ADMIN";
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Invalid email or password");
  }

  return response.json();
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Registration failed");
  }

  return response.json();
}

export function saveAuth(auth: AuthResponse): void {
  sessionStorage.setItem("auth", JSON.stringify(auth));
}

export function getAuth(): AuthResponse | null {
  const stored = sessionStorage.getItem("auth");

  if (!stored) return null;

  try {
    return JSON.parse(stored) as AuthResponse;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getAuth()?.token ?? null;
}

export function logout(): void {
  sessionStorage.removeItem("auth");
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
