import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  const { type, name, sector, context, contactName, website } =
    await request.json();

  const isAO = type === "ao";

  const systemPrompt = `Tu es l'agent de prospection d'un petit studio de design graphique parisien, spécialisé en identité visuelle, branding, édition et signalétique. Le studio travaille principalement dans le secteur culturel mais accepte tous les secteurs. Ton rôle : rédiger des messages de prospection courts, authentiques, jamais génériques. Ton style : direct, créatif, professionnel sans être corporate. Pas de formules creuses. Toujours en français sauf si indiqué. Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.`;

  const userPrompt = isAO
    ? `Analyse cet appel d'offres et rédige un email de candidature :
Organisme : ${name}
Secteur : ${sector}
Description : ${context}
${contactName ? `Contact : ${contactName}` : ""}

Réponds en JSON strict :
{
  "score": <nombre 1-10 pertinence pour le studio>,
  "scoreReason": "<1 phrase explication>",
  "strengths": ["<point fort 1>", "<point fort 2>"],
  "risks": ["<risque 1>"],
  "subject": "<objet email candidature>",
  "email": "<corps email candidature, 150-200 mots, sans formule d'intro générique>",
  "nextStep": "<action concrète à faire dans 48h>"
}`
    : `Rédige un message de prospection directe pour ce prospect :
Entreprise : ${name}
Secteur : ${sector}
Contexte : ${context}
${contactName ? `Interlocuteur : ${contactName}` : ""}
${website ? `Site web : ${website}` : ""}

Réponds en JSON strict :
{
  "channel": "<email ou linkedin>",
  "subject": "<objet si email>",
  "email": "<message email, 100-150 mots, accroche personnalisée>",
  "linkedin": "<message LinkedIn, max 300 caractères, direct et humain>",
  "followUpDay": <nombre de jours avant relance>,
  "angle": "<angle créatif utilisé en 1 phrase>"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const raw = message.content[0].text.trim();
    const json = JSON.parse(raw);
    return Response.json({ success: true, data: json });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
