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
        roles: usuario.roles.map((ur) => ({ id: ur.rol.id, nombre: ur.rol.nombre, ligaId: ur.ligaId })),
      },
    };
  }

  /**
   * Ligas a las que el usuario puede acceder (para el selector del dashboard).
   * Espeja la membresía del RolesGuard: un rol de plataforma (ligaId null, p.ej.
   * Superadministrador) habilita TODAS las ligas; los demás, solo las de sus
   * roles. `Liga` está fuera del enforcement de tenant, así que esta consulta no
   * depende del header X-Liga-Slug.
   */
  async misLigas(roles: { ligaId: string | null }[]) {
    const esPlataforma = roles.some((r) => r.ligaId == null);
    const where = esPlataforma
      ? { estado: 'activo' as const }
      : {
          estado: 'activo' as const,
          id: { in: [...new Set(roles.map((r) => r.ligaId).filter((x): x is string => !!x))] },
        };
    return this.prisma.liga.findMany({
      where,
      select: { id: true, nombre: true, slug: true },
      orderBy: { nombre: 'asc' },
    });
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
      roles: usuario.roles.map((ur) => ({ id: ur.rol.id, nombre: ur.rol.nombre, ligaId: ur.ligaId })),
      createdAt: usuario.createdAt,
    };
  }
}
