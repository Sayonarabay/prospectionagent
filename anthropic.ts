// lib/ai/anthropic.ts — Service IA centralisé
import Anthropic from '@anthropic-ai/sdk'
import type { AIAnalysis, Opportunity, Template, UserSettings, DocumentType } from '@/types'

function getClient(apiKey?: string) {
  return new Anthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY!,
  })
}

// ============================================================
// ANALYSE D'APPEL D'OFFRES
// ============================================================
export async function analyzeOpportunity(
  aoText: string,
  settings: Partial<UserSettings>,
  apiKey?: string
): Promise<AIAnalysis> {
  const client = getClient(apiKey)
  const studioContext = settings.studio_bio
    ? `\n\nContexte du studio: ${settings.studio_bio}`
    : ''
  const keywords = settings.skills_keywords?.length
    ? `\nCompétences studio: ${settings.skills_keywords.join(', ')}`
    : ''

  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    system: `Tu es l'assistant stratégique d'un petit studio de design graphique indépendant français.${studioContext}${keywords}
    
Analyse cet appel d'offres ou cette annonce et retourne UNIQUEMENT un JSON valide avec cette structure exacte:
{
  "mission_type": "string — type de mission (identité visuelle, print, DA, web, etc.)",
  "required_skills": ["skill1", "skill2"],
  "fit_score": "high|medium|low",
  "fit_reason": "string — 1 phrase d'explication",
  "watch_points": ["point1", "point2"],
  "strategy": "string — stratégie conseillée en 2 phrases max",
  "estimated_budget_range": "string optionnel",
  "analysed_at": "${new Date().toISOString()}"
}
Réponds UNIQUEMENT avec le JSON, sans markdown, sans explication.`,
    messages: [{ role: 'user', content: aoText }],
  })

  const text = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
  try {
    return JSON.parse(text.trim()) as AIAnalysis
  } catch {
    return {
      mission_type: 'Non déterminé',
      required_skills: [],
      fit_score: 'medium',
      fit_reason: "Analyse manuelle recommandée",
      watch_points: [],
      strategy: text.trim(),
      analysed_at: new Date().toISOString(),
    }
  }
}

// ============================================================
// GÉNÉRATION DE DOCUMENT (email, lettre, note d'intention)
// ============================================================
export async function generateDocument(params: {
  opportunity: Opportunity
  docType: DocumentType
  template: Template | null
  settings: Partial<UserSettings>
  customInstructions?: string
  apiKey?: string
}): Promise<string> {
  const { opportunity, docType, template, settings, customInstructions, apiKey } = params
  const client = getClient(apiKey)

  const docLabels: Record<DocumentType, string> = {
    email: 'un email de candidature',
    lettre: 'une lettre de motivation',
    note_intention: "une note d'intention créative",
    devis: 'un devis',
    proposition: 'une proposition commerciale complète',
  }

  const templateContext = template
    ? `\n\nVoici le modèle de réponse de base du studio à adapter:\n---\n${template.content}\n---\nAdapte ce modèle à l'opportunité spécifique, en remplaçant les éléments génériques par des références précises à la mission, au client et aux enjeux détectés.`
    : ''

  const analysisContext = opportunity.ai_analysis
    ? `\n\nAnalyse IA de l'opportunité:
- Type: ${opportunity.ai_analysis.mission_type}
- Compétences requises: ${opportunity.ai_analysis.required_skills.join(', ')}
- Points d'attention: ${opportunity.ai_analysis.watch_points.join(', ')}
- Stratégie: ${opportunity.ai_analysis.strategy}`
    : ''

  const customCtx = customInstructions ? `\n\nInstructions spécifiques: ${customInstructions}` : ''

  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1800,
    system: `Tu es directeur artistique d'un studio de design graphique indépendant à Paris.
Studio: ${settings.studio_name || 'Studio'}
DA: ${settings.da_name || 'Le DA'}
${settings.studio_bio ? `Bio: ${settings.studio_bio}` : ''}

Ton style d'écriture: professionnel mais personnel, direct, sans jargon inutile ni bullshit corporate. Tu valorises l'expertise créative et la valeur d'un studio à taille humaine. Jamais de formules creuses ("fort de notre expérience", "dans cette optique"). Tu montres que tu as COMPRIS le projet.${templateContext}${analysisContext}${customCtx}`,
    messages: [
      {
        role: 'user',
        content: `Rédige ${docLabels[docType]} pour cette opportunité:

Titre: ${opportunity.title}
Client: ${opportunity.client || 'Non précisé'}
Budget: ${opportunity.budget_min || opportunity.budget_max ? `${opportunity.budget_min || '?'} — ${opportunity.budget_max || '?'} €` : 'Non précisé'}
Date limite: ${opportunity.deadline || 'Non précisée'}
Source: ${opportunity.source}
Notes: ${opportunity.notes || 'Aucune'}
${opportunity.ao_raw_text ? `\nTexte de l'AO:\n${opportunity.ao_raw_text.slice(0, 2000)}` : ''}

Langue: français. Format: prêt à envoyer.`,
      },
    ],
  })

  return res.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
}

// ============================================================
// ADAPTATION DU TEMPLATE AU CONTEXTE D'UN AO
// (template.content + ao → template personnalisé)
// ============================================================
export async function adaptTemplate(params: {
  templateContent: string
  opportunity: Opportunity
  settings: Partial<UserSettings>
  apiKey?: string
}): Promise<string> {
  const { templateContent, opportunity, settings, apiKey } = params
  const client = getClient(apiKey)

  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `Tu es l'assistant du studio de design "${settings.studio_name || 'Studio'}". 
Tu adaptes des modèles de réponse en remplaçant les placeholders par du contenu spécifique à l'opportunité.
Conserve le style et la structure du modèle. Remplace uniquement ce qui doit être personnalisé.
Rends le texte naturel et pas générique. Garde le même niveau de professionnalisme.`,
    messages: [
      {
        role: 'user',
        content: `Adapte ce modèle de réponse pour l'opportunité suivante:

=== OPPORTUNITÉ ===
Titre: ${opportunity.title}
Client: ${opportunity.client || 'Client'}
Mission: ${opportunity.ai_analysis?.mission_type || 'Design graphique'}
Budget: ${opportunity.budget_max ? opportunity.budget_max + ' €' : 'À définir'}
Délai: ${opportunity.deadline || 'À définir'}
Notes: ${opportunity.notes || ''}
${opportunity.ao_raw_text ? `AO (extrait): ${opportunity.ao_raw_text.slice(0, 1500)}` : ''}

=== MODÈLE À ADAPTER ===
${templateContent}

Retourne uniquement le document adapté, prêt à l'envoi.`,
      },
    ],
  })

  return res.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
}

// ============================================================
// SCAN INTELLIGENT — Analyse des résultats bruts d'un scan
// ============================================================
export async function classifyScanResults(
  rawResults: { source: string; title: string; description: string; url?: string }[],
  settings: Partial<UserSettings>,
  apiKey?: string
): Promise<{ title: string; client: string; source: string; source_url: string; priority: string; summary: string }[]> {
  if (!rawResults.length) return []
  const client = getClient(apiKey)

  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `Tu es le filtre intelligent d'un studio de design graphique. 
Analyse ces résultats de scan et retourne UNIQUEMENT un JSON valide: un array d'objets avec:
{ title, client, source, source_url, priority ("high"|"medium"|"low"), summary }
Ne garde que les opportunités pertinentes pour un studio de design graphique (identité, print, DA, web, signalétique, édition, packaging).
Ignore les missions non-design. Sois concis.`,
    messages: [
      {
        role: 'user',
        content: JSON.stringify(rawResults.slice(0, 20)),
      },
    ],
  })

  const text = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return []
  }
}
