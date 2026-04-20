# Studio Agent — Prospection IA

## URLs de la aplicación desplegada

Una vez en Vercel, tu app vive en:

```
https://tu-proyecto.vercel.app/          ← Prospección + Pipeline
https://tu-proyecto.vercel.app/veille    ← Veille AO + freelance
```

## Deploy en Vercel — paso a paso

### 1. Subir a GitHub
```bash
# En esta carpeta (prospection-agent/), ejecutar:
git init
git add .
git commit -m "Studio agent v1"
# Crear repo en github.com y seguir las instrucciones
```

### 2. Conectar a Vercel
- Ir a vercel.com → "Add New Project"
- Importar el repo de GitHub
- Vercel detecta Next.js automáticamente

### 3. Variable de entorno (OBLIGATOIRE antes de deploy)
En Vercel → Settings → Environment Variables:
```
Name:  ANTHROPIC_API_KEY
Value: sk-ant-xxxxxxxxxxxxxxxx
```
Obtener clave: https://console.anthropic.com/

### 4. Deploy
Clicar "Deploy". En ~2 minutos la app está en línea.

## Desarrollo local
```bash
npm install
cp .env.example .env.local
# Editar .env.local con tu API key
npm run dev
# Abrir http://localhost:3000
```

## Estructura de rutas
```
/              → Formulario prospección + pipeline kanban
/veille        → Dashboard veille AO (BOAMP) + freelance
/api/prospect  → POST: genera email/candidature AO
/api/veille    → GET: scan BOAMP + web, scoring Claude
/api/generate-email → POST: emails de relance
```

## Stack
- Next.js 14 App Router
- Claude claude-sonnet-4-20250514
- Deploy: Vercel (plan Free suficiente)
- Coste API: ~0.003€/email generado, ~0.02€/scan veille
