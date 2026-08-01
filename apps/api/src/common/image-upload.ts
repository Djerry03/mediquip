import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, join, resolve } from 'path';

/** Formats acceptés pour un visuel produit ou une bannière. */
const ALLOWED: { mime: string; ext: string; magic: number[] }[] = [
  { mime: 'image/jpeg', ext: '.jpg', magic: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', ext: '.png', magic: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp', ext: '.webp', magic: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'image/gif', ext: '.gif', magic: [0x47, 0x49, 0x46, 0x38] },
];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Répertoire de stockage des médias, servi en lecture seule sous /api/uploads. */
export function mediaDir(subfolder: string): string {
  return resolve(process.cwd(), 'uploads', 'media', subfolder);
}

/**
 * Écrit une image téléversée après validation.
 *
 * Le type déclaré par le navigateur n'est qu'une déclaration : on vérifie
 * la signature binaire, et on impose l'extension déduite du format réel.
 * Le nom d'origine n'est jamais réutilisé — il peut contenir « ../ » ou une
 * double extension destinée à faire exécuter le fichier.
 */
export async function storeImage(
  file: Express.Multer.File,
  subfolder: string,
): Promise<{ fileName: string; url: string }> {
  if (!file) throw new BadRequestException('Aucun fichier reçu.');

  if (file.size > MAX_IMAGE_BYTES) {
    throw new BadRequestException('Image trop volumineuse (5 Mo maximum).');
  }

  const format = ALLOWED.find((a) => a.mime === file.mimetype);
  if (!format) {
    throw new BadRequestException('Format non accepté. Utilisez JPEG, PNG, WebP ou GIF.');
  }

  const header = Array.from(file.buffer.subarray(0, format.magic.length));
  if (!format.magic.every((byte, i) => header[i] === byte)) {
    throw new BadRequestException(
      "Le contenu du fichier ne correspond pas à son format annoncé.",
    );
  }

  const dir = mediaDir(subfolder);
  await mkdir(dir, { recursive: true });

  const fileName = `${randomUUID()}${format.ext}`;
  await writeFile(join(dir, fileName), file.buffer, { mode: 0o644 });

  return { fileName, url: `/api/uploads/${subfolder}/${fileName}` };
}

/**
 * Supprime un média à partir de son URL publique.
 * Ne touche qu'aux fichiers du dossier attendu : une URL forgée pointant
 * ailleurs est ignorée plutôt que suivie.
 */
export async function deleteImageByUrl(url: string, subfolder: string): Promise<boolean> {
  const prefix = `/api/uploads/${subfolder}/`;
  if (!url.startsWith(prefix)) return false;

  const fileName = basename(url.slice(prefix.length));
  if (!fileName || fileName.includes('/') || fileName.includes('..')) return false;

  try {
    await unlink(join(mediaDir(subfolder), fileName));
    return true;
  } catch {
    // Fichier déjà absent : l'objectif (qu'il n'existe plus) est atteint.
    return false;
  }
}
