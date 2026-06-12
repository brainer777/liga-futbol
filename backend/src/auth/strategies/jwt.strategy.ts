import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'change-me-dev-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { rol: true } } },
    });
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');
    if (usuario.estado !== 'activo') {
      throw new UnauthorizedException(`Usuario ${usuario.estado}`);
    }
    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      roles: usuario.roles.map((ur) => ({ id: ur.rol.id, nombre: ur.rol.nombre })),
    };
  }
}
