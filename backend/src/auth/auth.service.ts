import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { roles: { include: { rol: true } } },
    });
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (usuario.estado !== 'activo') {
      throw new UnauthorizedException(`Usuario ${usuario.estado}`);
    }
    const ok = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = { sub: usuario.id, email: usuario.email };
    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn });

    return {
      accessToken,
      expiresIn,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        roles: usuario.roles.map((ur) => ({ id: ur.rol.id, nombre: ur.rol.nombre })),
      },
    };
  }

  async getProfile(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { roles: { include: { rol: true } } },
    });
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      estado: usuario.estado,
      roles: usuario.roles.map((ur) => ({ id: ur.rol.id, nombre: ur.rol.nombre })),
      createdAt: usuario.createdAt,
    };
  }
}
