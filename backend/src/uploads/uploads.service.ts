import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { APP_DEFAULTS } from '../config/database.config';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly baseDir: string;
  private readonly publicUrlPrefix = '/uploads';

  constructor() {
    this.baseDir = path.resolve(APP_DEFAULTS.uploadDir);
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  /**
   * Guarda un archivo y devuelve la URL pública relativa.
   * Si el backend se sirve detrás de un proxy, el frontend debe poder
   * resolver esa URL contra el host del backend.
   */
  async save(
    file: Express.Multer.File,
    subfolder: 'jugadores' | 'documentos' | 'pagos' | 'logos' = 'documentos',
  ): Promise<{ url: string; filename: string; size: number; mimetype: string }> {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}. Permitidos: imágenes (jpg, png, webp, gif) y PDF.`,
      );
    }
    const maxBytes = APP_DEFAULTS.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `El archivo excede el máximo permitido (${APP_DEFAULTS.maxFileSizeMb} MB).`,
      );
    }
    const dir = path.join(this.baseDir, subfolder);
    fs.mkdirSync(dir, { recursive: true });
    const ext = path.extname(file.originalname) || this.extFromMime(file.mimetype);
    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    const fullPath = path.join(dir, filename);
    fs.writeFileSync(fullPath, file.buffer);
    const url = `${this.publicUrlPrefix}/${subfolder}/${filename}`;
    this.logger.log(`📎 Upload guardado: ${url} (${file.size} bytes)`);
    return { url, filename, size: file.size, mimetype: file.mimetype };
  }

  async remove(publicUrl: string): Promise<void> {
    if (!publicUrl) return;
    const rel = publicUrl.replace(/^\/+/, '').replace(/^uploads\//, '');
    const fullPath = path.join(this.baseDir, rel);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (e) {
        this.logger.warn(`No se pudo borrar ${fullPath}: ${e}`);
      }
    }
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
    };
    return map[mime] || '';
  }
}
