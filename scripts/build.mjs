import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webDir = resolve(projectRoot, 'www');
const webFiles = [
  'index.html',
  'juego.html',
  'manifest.json',
  'version.json',
  'sw.js',
  'css',
  'icons',
  'js',
  'musica',
  'preguntas',
  'descargas',
];

for (const path of webFiles) {
  if (!existsSync(resolve(projectRoot, path))) {
    throw new Error(`No se encontró el archivo o carpeta requerido: ${path}`);
  }
}

rmSync(webDir, { recursive: true, force: true });
mkdirSync(webDir, { recursive: true });

for (const path of webFiles) {
  cpSync(resolve(projectRoot, path), resolve(webDir, path), { recursive: true });
}

cpSync(resolve(projectRoot, 'juego.html'), resolve(webDir, 'index.html'));

console.log(`Archivos web preparados en ${webDir}`);
