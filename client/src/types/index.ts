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

export interface Streak {
  current_count: number;
  longest_count: number;
  last_completed_at: string | null;
}

export interface SpecialDate {
  id: number;
  title: string;
  date: string;
}

export interface Partnership {
  id: number;
  initiator: User;
  partner: User;
  status: 'pending' | 'active' | 'paused' | 'ended';
  relation: string;
  streak: Streak | null;
  stardust: number;
  started_at: string;
  ended_at: string | null;
  anniversary: string | null;
  special_dates: SpecialDate[];
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isNewUser: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (birthday: string, firstName?: string) => Promise<void>;
}
