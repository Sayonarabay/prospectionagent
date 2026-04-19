# Studio Agent — Prospection IA

Agent de prospection automatique pour studio de design graphique.  
Propulsé par Claude (Anthropic). Déployable sur Vercel en 3 minutes.

## Fonctionnalités

- **Prospection directe** : génère un email personnalisé + message LinkedIn prêt à copier
- **Appels d'offres** : analyse la pertinence (score /10), identifie les forces/risques, rédige la candidature
- **Pipeline** : vue kanban de tous vos prospects avec alertes de relance

## Deploy sur Vercel

### 1. Préparer le projet

```bash
# Cloner ou uploader ce dossier sur GitHub
# Puis connecter le repo à Vercel.com
```

### 2. Variable d'environnement (OBLIGATOIRE)

Dans Vercel → Settings → Environment Variables, ajouter :

```
ANTHROPIC_API_KEY = sk-ant-xxxxxxxxxxxxxxxx
```

Obtenir une clé : https://console.anthropic.com/

### 3. Deploy

Vercel détecte automatiquement Next.js. Cliquer "Deploy". C'est tout.

## Utilisation locale

```bash
npm install
# Créer .env.local avec : ANTHROPIC_API_KEY=sk-ant-xxx
npm run dev
# Ouvrir http://localhost:3000
```

## Stack

- Next.js 14 (App Router)
- Claude claude-sonnet-4-20250514 via @anthropic-ai/sdk
- Zéro base de données — pipeline en mémoire (session)
- Pour persister le pipeline : connecter Google Sheets via l'API Google

## Prochaines étapes suggérées

1. Connecter Google Sheets pour persister le pipeline
2. Ajouter un webhook Gmail pour recevoir les réponses
3. Intégrer la veille AO automatique (BOAMP RSS + scraping)
4. Notifs Slack/email hebdomadaires des relances urgentes
