export interface ConstituencyOption {
  id: string;
  name: string;
}

export interface RegisterUserRequest {
  displayName: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
  constituencyId: string;
}

export interface RegistrationMessage {
  message: string;
  email?: string;
}
