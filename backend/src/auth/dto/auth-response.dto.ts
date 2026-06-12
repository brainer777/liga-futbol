export class AuthResponseDto {
  accessToken: string;
  expiresIn: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    roles: { id: string; nombre: string }[];
  };
}
