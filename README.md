# 📝 Gestor de Tipificaciones

Aplicación web de **una sola página (SPA)** para gestionar tipificaciones de contacto con clientes. Diseñada para operar en centros de atención sin dependencia de servidores: todos los datos se almacenan localmente en el navegador mediante **IndexedDB**.

---

## ✨ Características

| Función | Descripción |
|---|---|
| 🔐 **Autenticación simulada** | Login con roles (Administrador / Operador) persistido en `localStorage` |
| 🗄️ **Base de datos local** | CRUD completo sobre IndexedDB (crear, editar, eliminar, listar) |
| 📥 **Importar CSV** | Detección automática de delimitadores (`,` `;` `\t` `\|`), normalización de columnas con alias y confirmación (agregar o reemplazar) |
| 📤 **Exportar CSV** | Descarga con BOM UTF-8 para compatibilidad con Excel en español |
| 📋 **Copiar / Pegar** | Copiado al portapapeles con fallback para `file://` y pegado inteligente con inserción en cursor |
| 🔎 **Búsqueda y paginación** | Filtro en tiempo real sobre título y descripción |
| 🌗 **Modo claro / oscuro** | Respeta la preferencia del sistema y persiste la elección del usuario |
| 📱 **Responsive** | Interfaz adaptada a escritorio y móvil |
| 📦 **Archivo único** | Build portable: HTML + CSS + JS embebidos, ejecutable sin servidor |

---

## 🧰 Stack Tecnológico

- **[Vite](https://vitejs.dev/)** — Bundler y dev server
- **[Vue 3](https://vuejs.org/)** — Framework (Composition API + `<script setup>`)
- **[TypeScript](https://www.typescriptlang.org/)** — Tipado estático
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Estilos utilitarios
- **[lucide-vue-next](https://lucide.dev/)** — Iconografía
- **[IndexedDB](https://developer.mozilla.org/docs/Web/API/IndexedDB_API)** — Persistencia local

---

## 📂 Estructura del Proyecto

```
gestor-tipificaciones/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   └── ConfirmModal.vue      # Modal de confirmación (eliminar)
│   │   ├── CasosManager.vue          # Panel principal (CRUD + CSV + búsqueda)
│   │   ├── LoginView.vue             # Pantalla de acceso
│   │   └── ...
│   ├── composables/
│   │   ├── useAuth.ts                # Sesión y roles (mock)
│   │   ├── useTheme.ts               # Modo claro / oscuro
│   │   └── useToast.ts               # Notificaciones
│   ├── utils/
│   │   ├── db.ts                     # Capa de acceso a IndexedDB
│   │   └── csv.ts                    # Parseo y generación de CSV
│   ├── App.vue                       # Enrutado condicional (login ↔ panel)
│   ├── main.ts                       # Punto de entrada
│   └── style.css                     # Tailwind + tema
├── dist/                             # Salida del build (index.html único)
├── inline-assets.mjs                 # Post-build: fusiona assets en index.html
├── index.html                        # Shell HTML
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
└── package.json
```

---

## 🚀 Requisitos

- **Node.js** `>= 22.12.0`
- **Podman** (opcional, recomendado en entornos Rocky Linux / SELinux)

---

## ⚙️ Instalación

### Con Podman (recomendado en servidor)

```bash
# Instalar dependencias base
podman run --rm -it -v "$(pwd)":/app:z -w /app node:22-alpine npm install

# Dependencias de desarrollo y UI
podman run --rm -it -v "$(pwd)":/app:z -w /app node:22-alpine npm install -D tailwindcss @tailwindcss/vite
podman run --rm -it -v "$(pwd)":/app:z -w /app node:22-alpine npm install lucide-vue-next
```

> **Nota:** la etiqueta `:z` en el volumen es necesaria en sistemas con **SELinux** para que el contenedor pueda escribir en el directorio montado.

### Local

```bash
npm install
```

---

## 🛠️ Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:5173` |
| `npm run build` | Type-check (`vue-tsc`) → build Vite → fusión en archivo único |
| `npm run preview` | Sirve la carpeta `dist/` para verificación local |

### Con Podman

```bash
# Desarrollo
podman run --rm -it -v "$(pwd)":/app:z -w /app -p 5173:5173 node:22-alpine npm run dev -- --host 0.0.0.0

# Build de archivo único
podman run --rm -it -v "$(pwd)":/app:z -w /app node:22-alpine npm run build
sudo chown -R $USER:$USER dist
```

---

## 🐳 Docker Compose (desarrollo)

```yaml
# docker-compose.dev.yml
services:
  gestor:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: gestor
    user: "${UID}:${GID}"
    ports:
      - "5173:5173"
    volumes:
      - .:/app:z
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - CHOKIDAR_USEPOLLING=true
    command: ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

networks:
  proxy_net:
    external: true
```

```bash
podman compose -f docker-compose.dev.yml up -d --build
```

---

## 📦 Build de Archivo Único

El proyecto se compila en **un solo `index.html`** autocontenido.

```bash
npm run build
```

El proceso ejecuta tres fases:

1. **`vue-tsc -b`** — Verificación de tipos
2. **`vite build`** — Empaquetado de JS y CSS
3. **`node inline-assets.mjs`** — Inyecta los assets en el HTML y elimina la carpeta `assets/`

Resultado:

```
dist/
└── index.html   # HTML + CSS + JS embebidos
```

Este archivo es **100% portable**: puede copiarse a una unidad USB, enviarse por correo o abrirse con doble clic, y funcionará sin conexión ni servidor.

---

## 🔑 Credenciales de Prueba

| Correo | Rol |
|---|---|
| `admin@test.com` | Administrador (todos los permisos) |
| `user@test.com` | Operador (todos los permisos) |

> El login es un **mock**: no se envía información a ningún servidor.

---

## 📄 Formato de Importación CSV

El parser acepta encabezados en español e inglés mediante alias:

| Campo interno | Encabezados reconocidos |
|---|---|
| `tipificacion` | `tipificacion`, `titulo`, `nombre`, `texto`, `asunto`, `name`, `title` |
| `descripcion` | `descripcion`, `detalle`, `resultado`, `nota`, `observacion`, `description` |
| `fecha` | `fecha`, `date`, `created`, `creado`, `fecha registro` |

- Se detecta automáticamente el delimitador (`,`, `;`, tabulador o `|`).
- Se soporta comilla doble con escapado (`""`) y saltos de línea dentro de campos.
- Las filas sin descripción se omiten e informan al usuario antes de confirmar.
- Exportación con **BOM UTF-8** para que Excel respete tildes y eñes.

---

## 💾 Base de Datos Local

- **Nombre:** `TipificacionesDB`
- **Almacén:** `tipificaciones` (clave autoincremental `id`)

Los datos residen en el navegador del usuario. Para respaldarlos, utilice la función **Exportar Todo**; para restaurarlos en otro equipo, **Importar CSV**.

> ⚠️ Limpiar los datos de navegación o usar una ventana privada eliminará los registros.

---

## 🧩 Consideraciones Técnicas

### Modo `file://`
Al abrir el `index.html` generado sin servidor, el navegador aplica restricciones de origen nulo. Por ello:

- **Copiado:** se implementa fallback con `document.execCommand('copy')` cuando `navigator.clipboard` no está disponible.
- **Pegado:** la lectura del portapapeles está bloqueada por política de seguridad. El botón enfoca el campo y solicita al usuario pulsar `Ctrl+V` / `Cmd+V`, capturando el evento `paste` e insertando el texto en la posición del cursor.
- **No se usan** `import()` dinámicos ni recursos externos, evitando errores CORS.

### Modo oscuro
Se aplica la clase `.dark` sobre `<html>` mediante una variante personalizada de Tailwind:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

La preferencia se guarda en `localStorage` y, si no existe, se hereda de `prefers-color-scheme`.

### Alias de rutas

```ts
'@'             → src/
'@components'   → src/components/
'@ui'           → src/components/ui/
'@composables'  → src/composables/
'@utils'        → src/utils/
'@styles'       → src/styles/
```

Declarados en `vite.config.ts` (resolución) y en `tsconfig.app.json` (tipado).

---

## 🗺️ Hoja de Ruta

- [ ] Categorización de tipificaciones por tipo de gestión
- [ ] Historial de versiones por registro
- [ ] Plantillas configurables desde la interfaz
- [ ] Sincronización opcional con backend propio

---

## 📝 Licencia

Uso interno. Todos los derechos reservados.