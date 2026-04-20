# Studio Veille — Système de veille & opportunités

Outil privé de gestion des opportunités commerciales pour studio de design graphique.  
Stack: **Next.js 14 · Supabase · Vercel · Anthropic API**

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Vercel                             │
│  Next.js 14 (App Router)                                │
│  ├── /dashboard          → KanbanBoard + IA             │
│  ├── /api/opportunities  → CRUD opportunités            │
│  ├── /api/analyze        → Analyse IA d'un AO           │
│  ├── /api/generate       → Génération docs + templates  │
│  ├── /api/template       → CRUD templates               │
│  └── /api/scan           → Scan hebdo (Vercel Cron)     │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
        ┌──────▼──────┐      ┌────────▼────────┐
        │  Supabase   │      │  Anthropic API  │
        │  Postgres   │      │  claude-sonnet  │
        │  Auth       │      │  Analyse AO     │
        │  RLS        │      │  Génération doc │
        └─────────────┘      └─────────────────┘
```

---

## Déploiement — 4 étapes

### 1. Supabase — Base de données

1. Crée un projet sur [supabase.com](https://supabase.com)
2. Va dans **SQL Editor** et exécute le fichier :
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Va dans **Settings → API** et note :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

4. Dans **Authentication → URL Configuration**, ajoute :
   - Site URL: `https://ton-app.vercel.app`
   - Redirect URL: `https://ton-app.vercel.app/auth/callback`

### 2. GitHub — Dépôt privé

```bash
cd studio-veille
git init
git add .
git commit -m "feat: initial studio veille setup"

# Crée un repo PRIVÉ sur github.com, puis :
git remote add origin https://github.com/TON_USER/studio-veille.git
git branch -M main
git push -u origin main
```

### 3. Vercel — Déploiement

1. Va sur [vercel.com](https://vercel.com) → **New Project**
2. Importe ton repo GitHub `studio-veille`
3. Dans **Environment Variables**, ajoute :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `CRON_SECRET` | générer avec `openssl rand -base64 32` |

4. **Deploy** → l'app est live sur `https://studio-veille-xxx.vercel.app`

5. Copie l'URL et mets-la dans Supabase Auth → Site URL

### 4. Configuration du scan hebdo (Vercel Cron)

Le fichier `vercel.json` configure un cron **chaque lundi à 07h00 UTC** (08h00 Paris).  
Le cron appelle `/api/scan` avec le header `Authorization: Bearer CRON_SECRET`.

Sur le plan Vercel **Hobby**, les crons sont limités à 1/jour — c'est suffisant pour un scan hebdo.

---

## Utilisation

### Connexion
L'app utilise des **liens magiques** (magic link) — pas de mot de passe.  
Saisis ton email → reçois le lien → accès direct.

### Pipeline Kanban
5 colonnes : **Détectée → Qualifiée → En rédaction → Envoyée → Gagnée**

- Clique sur `+ Opportunité` pour une saisie manuelle
- Menu `⋯` sur chaque carte : modifier, changer statut, ouvrir l'IA, voir l'annonce originale
- Indicateurs visuels : délai urgent (amber), expiré (rouge), analysé IA (✦)

### Analyse IA d'un AO
1. Ouvre ou crée une opportunité
2. Dans l'onglet "Texte de l'AO", colle le texte brut
3. Clique **Analyser** → l'IA retourne : type de mission, adéquation, stratégie, points d'attention
4. La priorité est auto-ajustée selon le score

### Modèles de réponse (Templates)
1. Va dans **Modèles** → **Nouveau modèle**
2. Colle ton modèle habituel avec des zones `[EN CROCHETS]` à personnaliser
3. Marque-le comme **modèle par défaut** pour son type
4. Dans l'onglet **IA & Rédaction**, sélectionne une opportunité → le modèle est auto-adapté

### Génération de documents
- **Avec modèle** : l'IA adapte ton template au contexte de l'AO
- **Sans modèle** : génération libre dans ton style
- Types : email, lettre de motivation, note d'intention, devis, proposition complète
- Export : copier, télécharger en `.txt`, sauvegarder en base

---

## Structure des fichiers

```
studio-veille/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── opportunities/    CRUD opportunités
│   │   │   ├── analyze/          Analyse IA d'un AO
│   │   │   ├── generate/         Génération docs
│   │   │   ├── template/         CRUD templates
│   │   │   └── scan/             Scan hebdo + manuel
│   │   ├── auth/callback/        OAuth callback
│   │   ├── dashboard/            Page principale
│   │   ├── login/                Page de connexion
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── kanban/               Board, Card, Modal
│   │   ├── ia/                   IAPanel, TemplatePanel
│   │   ├── veille/               VeillePanel
│   │   └── ui/                   TopBar, StatsRow, Settings
│   ├── lib/
│   │   ├── supabase/             Client browser + server
│   │   └── ai/                   Service Anthropic
│   └── types/                    Types TypeScript
├── supabase/migrations/          Schéma SQL
├── middleware.ts                 Auth guard
├── vercel.json                   Cron config
└── .env.local.example            Variables d'env
```

---

## Ajout de sources futures

### Webhook Malt / LinkedIn / Zapier
Crée un webhook Zapier qui POST vers :
```
POST https://ton-app.vercel.app/api/opportunities
Content-Type: application/json
Authorization: Bearer TON_TOKEN

{
  "title": "Titre de la mission",
  "client": "Nom client",
  "source": "malt",
  "source_url": "https://...",
  "status": "detected",
  "priority": "medium"
}
```

### Ajouter une source dans le scan
Dans `src/app/api/scan/route.ts`, ajoute un bloc `if (config?.nouvelle_source?.enabled)` avec l'appel API correspondant.

---

## Sécurité

- **Authentification** : Supabase Auth (magic link) — aucun mot de passe stocké
- **RLS** : Row Level Security activé sur toutes les tables — chaque user ne voit que ses données
- **Cron** : endpoint `/api/scan` protégé par `CRON_SECRET`
- **Repo privé** : GitHub repo en accès privé
- **Clés API** : jamais committées (.gitignore strict)
- **HTTPS** : obligatoire via Vercel

---

## Développement local

```bash
# Clone
git clone https://github.com/TON_USER/studio-veille.git
cd studio-veille

# Install
npm install

# Env
cp .env.local.example .env.local
# → remplis les valeurs

# Dev
npm run dev
# → http://localhost:3000
```
