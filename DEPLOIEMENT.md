# Studio Veille Pro — Guide de déploiement complet
## Système d'agents IA pour studio de design graphique

---

## Architecture globale

```
┌─────────────────────────────────────────────────────┐
│                   VERCEL (Frontend)                  │
│   Next.js 14 App Router                             │
│   Dashboard · Pipeline · Dossiers · Analyse IA      │
└────────────────┬────────────────────────────────────┘
                 │ API Routes
┌────────────────▼────────────────────────────────────┐
│               AGENTS IA (Vercel Edge Functions)      │
│                                                      │
│  Agent Veille (cron: lun 08h00)                     │
│   └─ Scrape BOAMP → LinkedIn RSS → Malt → Behance  │
│   └─ Analyse Claude → Score 0-100 → Alerte email   │
│                                                      │
│  Agent Scoring (on-demand)                          │
│   └─ Analyse contextuelle de chaque opportunité     │
│   └─ Recommandation candidature oui/non             │
│                                                      │
│  Agent Dossier (on-demand)                          │
│   └─ Génère trame de dossier de candidature         │
│   └─ Checklist personnalisée par type AO            │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│              SUPABASE (Database + Auth)              │
│                                                      │
│  Tables:                                            │
│   opportunities    contacts    dossiers              │
│   sources_config   logs        user_settings         │
└─────────────────────────────────────────────────────┘
```

---

## Étape 1 — Créer le dépôt GitHub (sans terminal)

1. Allez sur **github.com** → New repository
2. Nommez-le `studio-veille-pro`
3. **Public** ou Private (selon préférence)
4. Cochez "Add README"
5. Créez le repo

### Structure de fichiers à créer via l'interface GitHub web :

```
studio-veille-pro/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    ← Dashboard principal
│   ├── opportunities/
│   │   └── page.tsx
│   ├── pipeline/
│   │   └── page.tsx
│   └── dossiers/
│       └── page.tsx
├── api/
│   ├── sync/route.ts               ← Endpoint de synchronisation
│   ├── analyze/route.ts            ← Analyse IA d'une opportunité
│   └── cron/weekly/route.ts        ← Cron hebdomadaire (veille)
├── lib/
│   ├── supabase.ts                 ← Client Supabase
│   ├── anthropic.ts                ← Client Claude
│   └── scrapers/
│       ├── boamp.ts                ← Scraper BOAMP API officielle
│       ├── aopublic.ts             ← Scraper marchés publics
│       ├── linkedin-rss.ts         ← RSS LinkedIn jobs
│       ├── malt.ts                 ← Malt scraper
│       └── behance.ts              ← Behance jobs RSS
├── components/
│   ├── OpportunityCard.tsx
│   ├── PipelineBoard.tsx
│   └── AIDigest.tsx
├── package.json
├── vercel.json                     ← Config cron Vercel
└── .env.local.example
```

---

## Étape 2 — Configurer Supabase

### 2.1 Créer le projet
1. Allez sur **supabase.com** → New project
2. Notez votre `Project URL` et `anon key`

### 2.2 Créer les tables (copiez dans l'éditeur SQL Supabase)

```sql
-- Table principale des opportunités
CREATE TABLE opportunities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Source
  source text NOT NULL, -- 'boamp' | 'linkedin' | 'malt' | 'behance' | 'manual' | 'cold'
  source_id text,       -- ID externe si disponible
  source_url text,
  
  -- Contenu
  title text NOT NULL,
  client text,
  description text,
  budget_min int,
  budget_max int,
  deadline date,
  location text,
  
  -- Qualification IA
  ai_score int DEFAULT 0,          -- 0-100
  ai_analysis text,                 -- Analyse Claude complète
  ai_recommendation text,           -- 'candidater' | 'passer' | 'à évaluer'
  skills_required text[],           -- tags compétences
  tags text[],
  
  -- Pipeline
  status text DEFAULT 'new',       -- 'new'|'qualified'|'dossier'|'sent'|'won'|'lost'
  priority text DEFAULT 'normal',  -- 'high'|'normal'|'low'
  
  -- Suivi manuel
  notes text,
  next_action text,
  next_action_date date,
  
  -- Dossier
  dossier_status text,
  dossier_notes text
);

-- Index pour les recherches
CREATE INDEX opp_source_idx ON opportunities(source);
CREATE INDEX opp_status_idx ON opportunities(status);
CREATE INDEX opp_score_idx ON opportunities(ai_score DESC);
CREATE INDEX opp_deadline_idx ON opportunities(deadline);

-- Table contacts
CREATE TABLE contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  company text,
  email text,
  linkedin_url text,
  source text,          -- 'inbound' | 'cold' | 'recommendation'
  status text DEFAULT 'prospect',
  notes text,
  last_contact date,
  tags text[]
);

-- Lier opportunités à contacts
ALTER TABLE opportunities ADD COLUMN contact_id uuid REFERENCES contacts(id);

-- Table dossiers de candidature
CREATE TABLE dossiers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id uuid REFERENCES opportunities(id),
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'draft',
  checklist jsonb DEFAULT '[]',
  documents jsonb DEFAULT '[]',     -- URLs vers fichiers
  notes text,
  submitted_at timestamptz,
  response_expected date,
  response_received text
);

-- Table logs de synchronisation
CREATE TABLE sync_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  synced_at timestamptz DEFAULT now(),
  source text,
  new_count int DEFAULT 0,
  total_scraped int DEFAULT 0,
  error text,
  duration_ms int
);

-- Activer Row Level Security (important)
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;

-- Politique: accès seulement avec service_role key (depuis votre app)
CREATE POLICY "Service access only" ON opportunities
  FOR ALL USING (auth.role() = 'service_role');
```

---

## Étape 3 — Configurer Vercel

### 3.1 Déployer depuis GitHub
1. **vercel.com** → New Project → Import GitHub repo
2. Framework: **Next.js** (détecté automatiquement)
3. Cliquez Deploy

### 3.2 Variables d'environnement (Settings → Environment Variables)

```bash
# IA
ANTHROPIC_API_KEY=sk-ant-api03-...

# Database
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   # PAS la anon key — la service_role key

# Sources veille
BOAMP_API_KEY=votre-cle-boamp           # depuis boamp.fr/api
CRON_SECRET=un-token-aleatoire-securise  # générez via random.org

# Optionnel — alertes email
RESEND_API_KEY=re_...                    # resend.com gratuit
ALERT_EMAIL=votre@email.com
```

### 3.3 Configurer le cron hebdomadaire

Créez le fichier `vercel.json` dans votre repo GitHub :

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly",
      "schedule": "0 8 * * 1"
    }
  ]
}
```
→ Exécuté chaque **lundi à 8h00 UTC** automatiquement.

---

## Étape 4 — Code des agents IA

### Agent Veille — `/api/cron/weekly/route.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: Request) {
  // Vérification sécurité cron
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const results = [];

  // 1. BOAMP — Marchés publics design
  try {
    const boampResults = await fetchBOAMP([
      'design graphique', 'identité visuelle', 'charte graphique',
      'communication visuelle', 'signalétique', 'édition'
    ]);
    results.push(...boampResults);
  } catch (e) { console.error('BOAMP error:', e); }

  // 2. LinkedIn RSS (recherches publiques)
  try {
    const linkedinResults = await fetchLinkedInRSS([
      'designer graphique freelance',
      'graphiste identité visuelle',
      'sous-traitance design'
    ]);
    results.push(...linkedinResults);
  } catch (e) { console.error('LinkedIn error:', e); }

  // 3. Malt — nouvelles missions
  try {
    const maltResults = await fetchMaltMissions(['design graphique', 'branding', 'identité visuelle']);
    results.push(...maltResults);
  } catch (e) { console.error('Malt error:', e); }

  // 4. Behance Jobs RSS
  try {
    const behanceResults = await fetchBehanceJobs();
    results.push(...behanceResults);
  } catch (e) { console.error('Behance error:', e); }

  // Scoring IA par lot (économise les tokens)
  const scored = await scoreOpportunitiesBatch(results);

  // Sauvegarde en base (évite les doublons via source_id)
  let newCount = 0;
  for (const opp of scored) {
    const { data, error } = await supabase
      .from('opportunities')
      .upsert(opp, { onConflict: 'source_id', ignoreDuplicates: true });
    if (!error) newCount++;
  }

  // Log
  await supabase.from('sync_logs').insert({
    source: 'cron_weekly',
    new_count: newCount,
    total_scraped: results.length
  });

  // Alerte email si nouvelles opportunités prioritaires
  const highPriority = scored.filter(o => o.ai_score >= 80);
  if (highPriority.length > 0) {
    await sendWeeklyDigestEmail(highPriority);
  }

  return Response.json({ success: true, new: newCount, total: results.length });
}

async function scoreOpportunitiesBatch(opportunities: any[]) {
  const prompt = `Tu es un expert en développement commercial pour studios de design graphique indépendants français.

Pour chaque opportunité ci-dessous, attribue un score de 0 à 100 selon:
- Adéquation avec design graphique / branding / identité visuelle (0-30pts)
- Budget / valeur commerciale (0-25pts)  
- Probabilité de succès réaliste (0-25pts)
- Urgence / timing favorable (0-20pts)

Réponds UNIQUEMENT en JSON valide, tableau d'objets avec: id, ai_score, ai_recommendation, skills_required, tags

Opportunités:
${opportunities.map((o, i) => `${i}. "${o.title}" | ${o.source} | Budget: ${o.budget_min || '?'}-${o.budget_max || '?'}€ | ${o.description?.slice(0, 200)}`).join('\n')}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const scores = JSON.parse(text.replace(/```json|```/g, '').trim());
    return opportunities.map((opp, i) => ({
      ...opp,
      ...scores.find((s: any) => s.id === i) || {}
    }));
  } catch {
    return opportunities.map(o => ({ ...o, ai_score: 50 }));
  }
}
```

### Fonction BOAMP — `/lib/scrapers/boamp.ts`

```typescript
export async function fetchBOAMP(keywords: string[]) {
  const results = [];
  
  for (const keyword of keywords) {
    // API officielle BOAMP
    const url = `https://www.boamp.fr/api/avis/search?q=${encodeURIComponent(keyword)}&date_from=${getDateMinus(7)}&limit=20`;
    
    const resp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${process.env.BOAMP_API_KEY}` }
    });
    
    if (!resp.ok) continue;
    const data = await resp.json();
    
    for (const avis of data.results || []) {
      results.push({
        source: 'boamp',
        source_id: `boamp_${avis.id_boamp}`,
        source_url: `https://www.boamp.fr/avis/detail/${avis.id_boamp}`,
        title: avis.objet || avis.titre,
        client: avis.pouvoir_adjudicateur,
        description: avis.description_marche,
        location: avis.lieu_execution,
        budget_min: avis.valeur_estimee_ht ? Math.floor(avis.valeur_estimee_ht * 0.7) : null,
        budget_max: avis.valeur_estimee_ht || null,
        deadline: avis.date_limite_reception,
        tags: ['AO Public', 'BOAMP']
      });
    }
  }
  
  return deduplicateBy(results, 'source_id');
}

function getDateMinus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
```

---

## Étape 5 — Stratégie prospection froide

La prospection froide est **valide et efficace** pour un studio créatif si bien ciblée.

### Cibles prioritaires (ROI prouvé pour studios design)

| Cible | Approche | Canal |
|-------|----------|-------|
| Startups Series A/B (levée récente) | "Vous venez de lever — identité pro ?" | LinkedIn DM |
| PME en rebranding (détectable via presse) | Email personnalisé avec audit visuel gratuit | Email |
| Agences de com (sous-traitance) | Portfolio ciblé + disponibilités | Email + LinkedIn |
| Collectivités locales hors BOAMP | Prise de contact directe service communication | Email |
| Nouveaux dirigeants (nominations) | LinkedIn · "Nouveau poste, nouvelle vision ?" | LinkedIn |

### Agent prospection froide dans l'app

Ajoutez dans votre dashboard une section **"Radar client froid"** qui permet de :
1. Saisir une entreprise cible manuellement
2. Claude génère un **email de prospection personnalisé** basé sur l'analyse du site web
3. Suivi du statut (envoyé, répondu, rdv)

```typescript
// /api/generate-cold-email/route.ts
export async function POST(req: Request) {
  const { company_name, company_url, notes } = await req.json();
  
  // Fetch du site pour contexte
  const siteContent = await fetchWebsiteText(company_url);
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Tu es directeur artistique d'un studio de design graphique indépendant français.
      
Rédige un email de prospection BtoB court (150 mots max) pour ${company_name}.

Contexte de l'entreprise: ${siteContent?.slice(0, 500)}
Notes additionnelles: ${notes}

Email en français, ton professionnel mais direct. 
Objet accrocheur. 
Mentionner un élément spécifique de leur activité (pas générique).
CTA: appel 20 min.`
    }]
  });

  return Response.json({
    email: response.content[0].type === 'text' ? response.content[0].text : ''
  });
}
```

---

## Sources recommandées en plus de votre liste

| Source | Type | Pertinence |
|--------|------|------------|
| **Place de Marché** (achat.etatmodernise.fr) | AO public | ★★★★★ |
| **AWS.fr** (Marchés publics simplifié) | AO public | ★★★★ |
| **Freelance-info.fr** | Freelance | ★★★ |
| **Crème de la Crème** | Freelance premium | ★★★★ |
| **Welcome to the Jungle** (offres studio) | Emploi/freelance | ★★★ |
| **Dribbble Jobs** | Design international | ★★★ |
| **Twitter/X #design #freelance** | Social | ★★ |
| **Alertes Google** "identité visuelle" "charte graphique" | Agrégateur | ★★★★ |
| **Presse locale** (annonces légales, nominations) | Prospection froide | ★★★★ |

---

## Étape 6 — Sécurité

- ✅ Supabase RLS activé (Row Level Security)
- ✅ Service Role Key côté serveur uniquement (jamais dans le frontend)
- ✅ CRON_SECRET pour protéger l'endpoint de synchronisation
- ✅ Variables Vercel chiffrées au repos
- ✅ Pas d'exposition de la clé Anthropic côté client

**Important**: Ne commitez jamais de fichier `.env` dans GitHub. Utilisez uniquement les variables Vercel.

---

## Coûts estimés

| Service | Plan | Coût mensuel |
|---------|------|-------------|
| Vercel | Hobby (gratuit) | 0€ |
| Supabase | Free tier (500MB) | 0€ |
| Claude API | ~50 analyses/sem | ~2–5€ |
| Resend (emails) | Free (100/jour) | 0€ |
| **Total** | | **~2–5€/mois** |
