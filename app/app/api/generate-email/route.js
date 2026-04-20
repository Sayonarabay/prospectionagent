import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  const { name, sector, stage, daysSinceContact, previousContext } =
    await request.json();

  const systemPrompt = `Tu es l'agent de relance d'un petit studio de design graphique parisien. Ton rôle : rédiger des emails de relance courts, humains, jamais insistants. Style : direct, chaleureux, professionnel. Maximum 80 mots. Réponds UNIQUEMENT en JSON valide sans backticks.`;

  const prompt = `Rédige un email de relance pour :
Contact / Organisme : ${name}
Secteur : ${sector}
Étape pipeline : ${stage}
Jours sans réponse : ${daysSinceContact}
Contexte précédent : ${previousContext || "Premier contact envoyé"}

JSON strict :
{
  "subject": "<objet email relance>",
  "email": "<corps email, 60-80 mots max, ton naturel, pas de formule creuse>",
  "tone": "<ton utilisé : amical|professionnel|urgent>",
  "nextFollowUp": <jours avant prochaine relance si pas de réponse>
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
      system: systemPrompt,
    });

    const raw = message.content[0].text.trim().replace(/```json|```/g, "");
    const json = JSON.parse(raw);
    return Response.json({ success: true, data: json });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
