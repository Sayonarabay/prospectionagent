import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BOAMP_RSS_URLS = [
  "https://www.boamp.fr/api/search?q=design+graphique&rows=10&sort=dateparution+desc",
  "https://www.boamp.fr/api/search?q=identit%C3%A9+visuelle&rows=10&sort=dateparution+desc",
  "https://www.boamp.fr/api/search?q=communication+visuelle&rows=10&sort=dateparution+desc",
  "https://www.boamp.fr/api/search?q=signalétique&rows=8&sort=dateparution+desc",
  "https://www.boamp.fr/api/search?q=conception+graphique&rows=8&sort=dateparution+desc",
];

const FREELANCE_SEARCH_QUERIES = [
  "site:linkedin.com/jobs graphiste OR \"graphic designer\" France freelance OR mission",
  "site:malt.fr design graphique identité visuelle",
  "site:behance.net/joblist graphic designer Paris France",
  "freelance graphiste mission Paris 2025",
  "\"recherche graphiste\" OR \"besoin graphiste\" OR \"offre graphiste\" site:linkedin.com France",
];

async function fetchBOAMP(query) {
  try {
    const url = `https://www.boamp.fr/api/search?q=${encodeURIComponent(query)}&rows=8&sort=dateparution+desc`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const records = data?.records || data?.results || [];
    return records.slice(0, 5).map((r) => {
      const fields = r.fields || r;
      return {
        source: "BOAMP",
        title: fields.objet || fields.titre || fields.nomacheteur || "Marché public",
        organisme: fields.nomacheteur || fields.pouvoir_adjudicateur || "Organisme public",
        date: fields.dateparution || fields.date_publication || new Date().toISOString().split("T")[0],
        deadline: fields.datelimitereponse || fields.date_limite || null,
        description: fields.objet || fields.description || "",
        url: fields.urlboamp || `https://www.boamp.fr/avis/detail/${fields.idweb || r.recordid || ""}`,
        lieu: fields.lieuexecution || fields.cp_lieu_execution || "France",
        budget: fields.valeur_totale || fields.montant || null,
        type: "ao_public",
      };
    });
  } catch {
    return [];
  }
}

async function searchWithClaude(queries) {
  const tools = [
    {
      type: "web_search_20250305",
      name: "web_search",
    },
  ];

  const prompt = `Tu es un agent de veille pour un studio de design graphique parisien spécialisé en identité visuelle, branding, édition et signalétique culturelle.

Effectue des recherches web pour trouver des opportunités récentes (moins de 30 jours) en France pour :
1. Missions freelance graphisme / design graphique / identité visuelle
2. Offres sur Malt, Behance Jobs, LinkedIn, Welcome to the Jungle
3. Appels à projets créatifs d'institutions culturelles françaises

Queries à utiliser : ${queries.slice(0, 3).join(" | ")}

Pour chaque opportunité trouvée, extrait : titre, organisme/client, type (freelance/ao/appel_projet), description courte, url, date approximative.

Réponds UNIQUEMENT en JSON valide sans backticks ni markdown :
{
  "results": [
    {
      "source": "LinkedIn|Malt|Behance|Autre",
      "title": "...",
      "organisme": "...",
      "type": "freelance|ao_public|appel_projet",
      "description": "...",
      "url": "...",
      "date": "YYYY-MM-DD ou approximatif",
      "lieu": "Paris|France|Remote",
      "budget": "montant ou null"
    }
  ]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      tools,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock) return [];
    const raw = textBlock.text.trim().replace(/```json|```/g, "");
    const parsed = JSON.parse(raw);
    return parsed.results || [];
  } catch {
    return [];
  }
}

async function scoreWithClaude(opportunities) {
  if (!opportunities.length) return [];

  const prompt = `Tu es l'agent de scoring d'un studio de design graphique parisien. Profil : spécialisé identité visuelle, branding, édition, signalétique. Secteur de prédilection : culturel & institutionnel, mais ouvert à tous secteurs.

Pour chaque opportunité, attribue un score de pertinence (1-10) et une action recommandée.

Opportunités à scorer :
${JSON.stringify(opportunities.slice(0, 12), null, 2)}

Réponds UNIQUEMENT en JSON valide :
{
  "scored": [
    {
      "index": 0,
      "score": 8,
      "scoreLabel": "Très pertinent",
      "reason": "1 phrase max",
      "action": "Candidater avant JJ/MM|Envoyer devis|Contacter directement|Surveiller",
      "priority": "haute|moyenne|basse"
    }
  ]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].text.trim().replace(/```json|```/g, "");
    const parsed = JSON.parse(raw);
    const scoreMap = {};
    (parsed.scored || []).forEach((s) => {
      scoreMap[s.index] = s;
    });
    return opportunities.map((opp, i) => ({
      ...opp,
      score: scoreMap[i]?.score || 5,
      scoreLabel: scoreMap[i]?.scoreLabel || "Moyen",
      reason: scoreMap[i]?.reason || "",
      action: scoreMap[i]?.action || "Évaluer",
      priority: scoreMap[i]?.priority || "moyenne",
    }));
  } catch {
    return opportunities.map((o) => ({ ...o, score: 5, priority: "moyenne", action: "Évaluer" }));
  }
}

export async function GET() {
  try {
    const [boamp1, boamp2, boamp3, freelanceResults] = await Promise.allSettled([
      fetchBOAMP("design graphique identité visuelle"),
      fetchBOAMP("signalétique communication visuelle"),
      fetchBOAMP("conception graphique branding"),
      searchWithClaude(FREELANCE_SEARCH_QUERIES),
    ]);

    const aoResults = [
      ...(boamp1.status === "fulfilled" ? boamp1.value : []),
      ...(boamp2.status === "fulfilled" ? boamp2.value : []),
      ...(boamp3.status === "fulfilled" ? boamp3.value : []),
    ];

    const freelance = freelanceResults.status === "fulfilled" ? freelanceResults.value : [];
    const allResults = [...aoResults, ...freelance];

    const deduped = allResults.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.title === item.title && t.organisme === item.organisme)
    );

    const scored = await scoreWithClaude(deduped);
    const sorted = scored.sort((a, b) => b.score - a.score);

    return Response.json({
      success: true,
      total: sorted.length,
      haute: sorted.filter((r) => r.priority === "haute").length,
      results: sorted,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
