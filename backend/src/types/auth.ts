export type AuthenticatedUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  athleteId: string | null;
  roles: string[];
  permissions: string[];
};

export type JwtPayload = {
  sub: string;
  email?: string;
};
