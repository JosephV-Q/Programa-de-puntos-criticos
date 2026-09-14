export type UserRole =
  | "admin"
  | "structural_engineer"
  | "instrumentation_specialist";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};
