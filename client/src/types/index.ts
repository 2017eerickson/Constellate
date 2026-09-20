export interface User {
  id: number;
  email: string;
  first_name: string;
  birthday: string | null;
  partner_code: string;
  is_verified: boolean;
  onboarding_complete: boolean;
  created_at: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
  is_new_user: boolean;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isNewUser: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (birthday: string) => Promise<void>;
}
