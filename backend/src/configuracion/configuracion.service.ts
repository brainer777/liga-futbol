import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { UpdateConfiguracionDto } from './dto/configuracion.dto';

/** Valores por defecto si la fila aún no existe (deben coincidir con la migración). */
const DEFAULTS = {
  nombreLiga: 'Liga de Fútbol',
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  colorPrimario: '142 70% 35%',
};

@Injectable()
export class ConfiguracionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly tenant: TenantContextService,
  ) {}

  /** Branding de la liga del request; lo crea con defaults si por algún motivo falta. */
  async get() {
    const ligaId = await this.tenant.getLigaId();
    const row = await this.prisma.configuracion.findUnique({ where: { ligaId } });
    if (row) return row;
    return this.prisma.configuracion.create({
      data: { ...DEFAULTS, liga: { connect: { id: ligaId } } },
    });
  }

  /** Campos seguros para consumo PÚBLICO (login y portal, sin auth). */
  async getPublic() {
    const ligaId = await this.tenant.getLigaId();
    const [row, liga] = await Promise.all([
      this.prisma.configuracion.findUnique({ where: { ligaId } }),
      // `Liga` queda fuera del enforcement de tenant; lookup directo por id.
      this.prisma.liga.findUnique({ where: { id: ligaId }, select: { slug: true } }),
    ]);
    const src = row ?? DEFAULTS;
    return {
      slug: liga?.slug ?? null,
      nombreLiga: src.nombreLiga,
      logoUrl: src.logoUrl,
      faviconUrl: src.faviconUrl,
      colorPrimario: src.colorPrimario,
    };
  }

  async update(dto: UpdateConfiguracionDto) {
    const ligaId = await this.tenant.getLigaId();
    return this.prisma.configuracion.upsert({
      where: { ligaId },
      update: { ...dto },
      create: { ...DEFAULTS, ...dto, liga: { connect: { id: ligaId } } },
    });
  }

  async setLogo(file: Express.Multer.File) {
    return this.replaceImage(file, 'logoUrl');
  }

  async setFavicon(file: Express.Multer.File) {
    return this.replaceImage(file, 'faviconUrl');
  }

  /** Sube la imagen, actualiza el campo y borra el archivo anterior si existía. */
  private async replaceImage(file: Express.Multer.File, field: 'logoUrl' | 'faviconUrl') {
    const current = await this.get();
    const { url } = await this.uploads.save(file, 'logos');
    const updated = await this.prisma.configuracion.update({
      where: { id: current.id },
      data: { [field]: url },
    });
    const previous = current[field];
    if (previous && previous !== url) {
      await this.uploads.remove(previous);
    }
    return updated;
  }
}
