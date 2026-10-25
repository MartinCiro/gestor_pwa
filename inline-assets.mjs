import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const distDir = './dist';
const htmlFile = join(distDir, 'index.html');

if (!existsSync(htmlFile)) {
  console.error('❌ No se encontró index.html en dist/');
  process.exit(1);
}

let html = readFileSync(htmlFile, 'utf-8');

// 1. Inlinear CSS
html = html.replace(/<link\s+[^>]*href="([^"]*\.css)"[^>]*>/g, (match, href) => {
  const cleanPath = href.replace(/^\//, '');
  const filePath = join(distDir, cleanPath);
  if (existsSync(filePath)) {
    const css = readFileSync(filePath, 'utf-8');
    console.log(`✅ CSS inlined: ${href}`);
    return `<style>\n${css}\n</style>`;
  }
  return match;
});

// 2. Inlinear JS
html = html.replace(/<script\s+([^>]*?)src="([^"]*\.js)"([^>]*?)><\/script>/g, (match, beforeSrc, src, afterSrc) => {
  const cleanPath = src.replace(/^\//, '');
  const filePath = join(distDir, cleanPath);
  if (existsSync(filePath)) {
    const js = readFileSync(filePath, 'utf-8');
    const attributes = `${beforeSrc} ${afterSrc}`.trim();
    return `<script ${attributes}>\n${js}\n</script>`;
  }
  return match;
});

// 3. Eliminar referencias a iconos externos (para que no haya 404 en file://)
html = html.replace(/<link\s+[^>]*rel="icon"[^>]*>/g, '');
html = html.replace(/<link\s+[^>]*rel="apple-touch-icon"[^>]*>/g, '');

writeFileSync(htmlFile, html);

// 4. Eliminar carpeta assets (ya no es necesaria)
const assetsDir = join(distDir, 'assets');
if (existsSync(assetsDir)) {
  rmSync(assetsDir, { recursive: true, force: true });
}

// 5. Eliminar archivos de iconos sueltos
for (const f of readdirSync(distDir)) {
  if ((f.endsWith('.svg') || f.endsWith('.ico')) && f !== 'index.html') {
    rmSync(join(distDir, f));
  }
}