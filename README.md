# Folkleaf CRM

Réplica de folk.app: pipeline de leads con drag & drop, paneles de clientes/partners/contactos, y una extensión de Chrome para guardar perfiles de LinkedIn.

Desplegado en Vercel + Supabase.

- App: Next.js 16 + Prisma + Postgres (Supabase) + Supabase Auth, pensada para desplegar en Vercel.
- Extensión: `../folk-crm-extension` (Manifest V3, sin dependencias de build).

## 1. Crear el proyecto de Supabase (gratis)

1. Ve a [supabase.com](https://supabase.com) → crea una cuenta → **New project**.
2. Cuando esté listo, entra en **Project Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (no se usa todavía, pero déjala lista)
3. Entra en **Project Settings → Database → Connection string**:
   - Copia la conexión en modo **Transaction/Pooled** (puerto 6543) → `DATABASE_URL`
   - Copia la conexión **Direct** (puerto 5432) → `DIRECT_URL`
4. Pega todo en `.env.local` (ya existe, basado en `.env.example`).

## 2. Preparar la base de datos

```bash
npm install
npx prisma migrate dev --name init
```

Esto crea las tablas en tu Supabase. `npx prisma studio` te deja ver/editar los datos con una UI.

## 3. Arrancar en local

```bash
npm run dev
```

Abre http://localhost:3000, crea una cuenta (Supabase Auth por email/contraseña). Al entrar por primera vez se crea automáticamente tu workspace con 5 fases de pipeline por defecto.

> Si tu proyecto de Supabase tiene activada la confirmación por email, revisa la bandeja de entrada antes de poder iniciar sesión.

## 4. Conectar la extensión de Chrome

1. En el CRM, ve a **Ajustes → Extensión de Chrome → Generar token**. Cópialo (solo se muestra una vez).
2. Abre `chrome://extensions`, activa **Modo desarrollador** → **Cargar descomprimida** → selecciona la carpeta `folk-crm-extension` (al mismo nivel que esta carpeta).
3. Haz clic en el icono de la extensión → pega la URL de tu CRM (en local: `http://localhost:3000`) y el token → **Guardar** → **Probar conexión**.
4. Entra a cualquier perfil de LinkedIn (`linkedin.com/in/...`) → botón flotante **"+ Guardar en CRM"** abajo a la derecha.

## 5. Desplegar en producción (Vercel)

1. Sube este repo a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New Project** → importa el repo → carpeta raíz `folk-crm`.
3. Añade las variables de entorno (las mismas de `.env.local`, con `NEXT_PUBLIC_APP_URL` apuntando a tu dominio de Vercel).
4. Tras el primer deploy, corre las migraciones contra la base de producción (puedes usar el mismo Supabase, no hace falta uno nuevo):
   ```bash
   npx prisma migrate deploy
   ```
5. Actualiza el token/URL en el popup de la extensión con tu dominio real de Vercel.

## Estructura

- `src/app/(dashboard)` — pipeline, clientes, partners, contactos, ajustes (protegido por sesión).
- `src/app/api` — endpoints CRUD (autenticados por cookie de sesión) y `api/extension/*` (autenticado por token Bearer, usado por la extensión).
- `src/proxy.ts` — protege rutas y refresca la sesión de Supabase en cada request.
- `prisma/schema.prisma` — modelo de datos (Workspace, Contact, PipelineStage, ApiToken).
