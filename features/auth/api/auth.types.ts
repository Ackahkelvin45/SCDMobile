export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  phone_number: string;
  password: string;
  password2: string;
  genotype: string;
};

export type UserProfile = {
  id: string;
  patient_id?: string;
  email: string;
  date_of_birth?: string;
  firstName?: string;
  lastName?: string;
  full_name?: string;
  fullName?: string;
  genotype?: string;
  gender?: string;
  phone_number?: string;
  avatarUrl?: string;
};

export type AuthResponse = {
  access: string;
  refresh: string;
  accessTokenExpiresAt?: number;
  refreshTokenExpiresAt?: number;
  user?: UserProfile;
};

export type RegisterResponse = {
  id?: string;
  email?: string;
  full_name?: string;
  [key: string]: unknown;
};
