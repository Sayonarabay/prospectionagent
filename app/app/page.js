"use client";
import { useState } from "react";

const SECTORS = [
  "Culturel & Institutionnel",
  "Startup & Tech",
  "Corporate",
  "Pyme locale",
  "Secteur public / AO",
  "Édition & Médias",
  "Mode & Luxe",
  "Autre",
];

const PIPELINE_STAGES = ["Détecté", "Contacté", "Proposta", "Négociation", "Gagné"];

const DEMO_PIPELINE = [
  { id: 1, name: "Fondation Cartier", sector: "Culturel", stage: "Contacté", days: 9, urgent: true, type: "prospect" },
  { id: 2, name: "Musée d'Orsay", sector: "Institutionnel", stage: "Négociation", days: 2, urgent: false, type: "ao" },
  { id: 3, name: "Agence Bloom", sector: "Startup", stage: "Détecté", days: 1, urgent: false, type: "prospect" },
  { id: 4, name: "Mairie de Paris", sector: "Public / AO", stage: "Détecté", days: 0, urgent: false, type: "ao" },
  { id: 5, name: "Le Bon Marché", sector: "Retail", stage: "Proposta", days: 14, urgent: true, type: "prospect" },
  { id: 6, name: "Collectif Vivant", sector: "Culturel", stage: "Gagné", days: 0, urgent: false, type: "prospect" },
];

export default function Home() {
  const [tab, setTab] = useState("new");
  const [type, setType] = useState("prospect");
  const [form, setForm] = useState({ name: "", sector: "", context: "", contactName: "", website: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [pipeline, setPipeline] = useState(DEMO_PIPELINE);

  const handleSubmit = async () => {
    if (!form.name || !form.sector || !form.context) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/prospect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...form }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setPipeline(prev => [
          { id: Date.now(), name: form.name, sector: form.sector, stage: "Détecté", days: 0, urgent: false, type },
          ...prev,
        ]);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const stageColor = (stage) => {
    const map = { "Détecté": "#1a6fb5", "Contacté": "#a05c00", "Proposta": "#7a2060", "Négociation": "#0f6e56", "Gagné": "#3b6d11" };
    return map[stage] || "#444";
  };
  const stageBg = (stage) => {
    const map = { "Détecté": "#e6f1fb", "Contacté": "#faeeda", "Proposta": "#fbeaf0", "Négociation": "#e1f5ee", "Gagné": "#eaf3de" };
    return map[stage] || "#f0f0f0";
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", minHeight: "100vh", background: "#0d0d0d", color: "#e8e4dc" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ borderBottom: "0.5px solid #2a2a2a", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, letterSpacing: "-0.02em", color: "#e8e4dc" }}>studio</span>
          <span style={{ fontSize: 11, color: "#666", letterSpacing: "0.12em", textTransform: "uppercase" }}>agent</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["new", "pipeline"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "#1e1e1e" : "transparent",
              border: tab === t ? "0.5px solid #333" : "0.5px solid transparent",
              color: tab === t ? "#e8e4dc" : "#666",
              padding: "5px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
              fontFamily: "inherit", letterSpacing: "0.04em"
            }}>
              {t === "new" ? "Nouveau prospect" : `Pipeline (${pipeline.length})`}
            </button>
          ))}
          <a href="/veille" style={{
            background: "transparent", border: "0.5px solid #1D9E7566",
            color: "#5DCAA5", padding: "5px 14px", borderRadius: 6,
            fontSize: 12, textDecoration: "none", letterSpacing: "0.04em",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <span style={{ fontSize: 8, color: "#5DCAA5" }}>●</span> Veille AO
          </a>
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px" }}>

        {/* NEW PROSPECT TAB */}
        {tab === "new" && (
          <div>
            {/* Type toggle */}
            <div style={{ display: "flex", gap: 0, marginBottom: 32, border: "0.5px solid #2a2a2a", borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
              {[["prospect", "Prospection directe"], ["ao", "Appel d'offres"]].map(([v, label]) => (
                <button key={v} onClick={() => { setType(v); setResult(null); }} style={{
                  background: type === v ? "#1e1e1e" : "transparent",
                  border: "none", borderRight: v === "prospect" ? "0.5px solid #2a2a2a" : "none",
                  color: type === v ? "#e8e4dc" : "#555", padding: "8px 20px",
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit"
                }}>
                  {type === v && <span style={{ marginRight: 6, color: v === "ao" ? "#EF9F27" : "#5DCAA5", fontSize: 10 }}>●</span>}
                  {label}
                </button>
              ))}
            </div>

            {/* Form */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: "#666", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  {type === "ao" ? "Organisme" : "Entreprise"} *
                </label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={type === "ao" ? "Mairie de Paris" : "Agence Bloom"}
                  style={{ width: "100%", background: "#141414", border: "0.5px solid #2a2a2a", borderRadius: 7, padding: "10px 12px", color: "#e8e4dc", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#666", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Secteur *</label>
                <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                  style={{ width: "100%", background: "#141414", border: "0.5px solid #2a2a2a", borderRadius: 7, padding: "10px 12px", color: form.sector ? "#e8e4dc" : "#555", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}>
                  <option value="">Choisir un secteur</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#666", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                {type === "ao" ? "Description de l'AO *" : "Contexte & angle d'approche *"}
              </label>
              <textarea value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
                rows={3}
                placeholder={type === "ao"
                  ? "Ex : Marché de création d'une identité visuelle pour une nouvelle exposition permanente..."
                  : "Ex : Startup en pleine croissance, vient de lever des fonds, cherche à retravailler son image..."}
                style={{ width: "100%", background: "#141414", border: "0.5px solid #2a2a2a", borderRadius: 7, padding: "10px 12px", color: "#e8e4dc", fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
              <div>
                <label style={{ fontSize: 11, color: "#666", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Contact (optionnel)</label>
                <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                  placeholder="Prénom Nom, directrice comm."
                  style={{ width: "100%", background: "#141414", border: "0.5px solid #2a2a2a", borderRadius: 7, padding: "10px 12px", color: "#e8e4dc", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              {type === "prospect" && (
                <div>
                  <label style={{ fontSize: 11, color: "#666", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Site web (optionnel)</label>
                  <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                    placeholder="https://..."
                    style={{ width: "100%", background: "#141414", border: "0.5px solid #2a2a2a", borderRadius: 7, padding: "10px 12px", color: "#e8e4dc", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              )}
            </div>

            <button onClick={handleSubmit} disabled={loading || !form.name || !form.sector || !form.context}
              style={{
                background: loading ? "#1e1e1e" : "#e8e4dc", color: loading ? "#555" : "#0d0d0d",
                border: "none", borderRadius: 8, padding: "11px 28px", fontSize: 14,
                fontFamily: "inherit", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.15s", letterSpacing: "0.02em"
              }}>
              {loading ? "Agent en train de rédiger..." : type === "ao" ? "Analyser & rédiger la candidature →" : "Générer email + message LinkedIn →"}
            </button>

            {error && (
              <div style={{ marginTop: 20, padding: "12px 16px", background: "#1a0a0a", border: "0.5px solid #5a1a1a", borderRadius: 8, fontSize: 13, color: "#f09595" }}>
                Erreur : {error}
              </div>
            )}

            {/* Results */}
            {result && (
              <div style={{ marginTop: 36 }}>
                <div style={{ borderTop: "0.5px solid #2a2a2a", paddingTop: 32, marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, letterSpacing: "-0.02em" }}>
                      {form.name}
                    </span>
                    {type === "ao" && result.score && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 80, height: 4, background: "#1e1e1e", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${result.score * 10}%`, background: result.score >= 7 ? "#5DCAA5" : result.score >= 5 ? "#EF9F27" : "#E24B4A", borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 13, color: result.score >= 7 ? "#5DCAA5" : result.score >= 5 ? "#EF9F27" : "#E24B4A", fontWeight: 500 }}>
                          {result.score}/10
                        </span>
                      </div>
                    )}
                  </div>
                  {type === "ao" && result.scoreReason && (
                    <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px" }}>{result.scoreReason}</p>
                  )}
                  {type === "ao" && (result.strengths || result.risks) && (
                    <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                      {result.strengths?.map((s, i) => (
                        <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#0f1a14", border: "0.5px solid #1D9E75", color: "#5DCAA5" }}>{s}</span>
                      ))}
                      {result.risks?.map((r, i) => (
                        <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#1a0e0a", border: "0.5px solid #D85A30", color: "#F0997B" }}>{r}</span>
                      ))}
                    </div>
                  )}
                  {type === "prospect" && result.angle && (
                    <p style={{ fontSize: 13, color: "#5DCAA5", margin: "0 0 16px", fontStyle: "italic" }}>Angle : {result.angle}</p>
                  )}
                </div>

                {/* Email block */}
                {result.email && (
                  <div style={{ background: "#141414", border: "0.5px solid #2a2a2a", borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div>
                        <span style={{ fontSize: 11, color: "#666", letterSpacing: "0.08em", textTransform: "uppercase" }}>Email</span>
                        {result.subject && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#aaa" }}>Objet : <span style={{ color: "#e8e4dc" }}>{result.subject}</span></p>}
                      </div>
                      <button onClick={() => copy(result.email, "email")} style={{
                        background: copied === "email" ? "#0f1a14" : "#1e1e1e", border: `0.5px solid ${copied === "email" ? "#1D9E75" : "#333"}`,
                        color: copied === "email" ? "#5DCAA5" : "#888", padding: "5px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit"
                      }}>
                        {copied === "email" ? "Copié ✓" : "Copier"}
                      </button>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.75, color: "#ccc", margin: 0, whiteSpace: "pre-wrap" }}>{result.email}</p>
                  </div>
                )}

                {/* LinkedIn block */}
                {result.linkedin && (
                  <div style={{ background: "#141414", border: "0.5px solid #2a2a2a", borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span style={{ fontSize: 11, color: "#666", letterSpacing: "0.08em", textTransform: "uppercase" }}>LinkedIn</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#555" }}>{result.linkedin.length} car.</span>
                        <button onClick={() => copy(result.linkedin, "linkedin")} style={{
                          background: copied === "linkedin" ? "#0f1a14" : "#1e1e1e", border: `0.5px solid ${copied === "linkedin" ? "#1D9E75" : "#333"}`,
                          color: copied === "linkedin" ? "#5DCAA5" : "#888", padding: "5px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit"
                        }}>
                          {copied === "linkedin" ? "Copié ✓" : "Copier"}
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.75, color: "#ccc", margin: 0 }}>{result.linkedin}</p>
                  </div>
                )}

                {/* Next step */}
                {(result.nextStep || result.followUpDay) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#0d1410", border: "0.5px solid #1D9E75", borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: "#5DCAA5", letterSpacing: "0.06em", textTransform: "uppercase" }}>Prochaine étape</span>
                    <span style={{ fontSize: 13, color: "#aaa" }}>
                      {result.nextStep || `Relancer dans ${result.followUpDay} jours`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PIPELINE TAB */}
        {tab === "pipeline" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" }}>Vue pipeline</p>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#555" }}>
                <span><span style={{ color: "#E24B4A", marginRight: 4 }}>●</span>{pipeline.filter(p => p.urgent).length} urgents</span>
                <span><span style={{ color: "#5DCAA5", marginRight: 4 }}>●</span>{pipeline.filter(p => p.stage === "Gagné").length} gagnés</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
              {PIPELINE_STAGES.map(stage => (
                <div key={stage}>
                  <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: stageColor(stage), background: stageBg(stage) + "22", border: `0.5px solid ${stageBg(stage)}66`, borderRadius: 6, padding: "4px 8px", marginBottom: 10, textAlign: "center" }}>
                    {stage} ({pipeline.filter(p => p.stage === stage).length})
                  </div>
                  {pipeline.filter(p => p.stage === stage).map(item => (
                    <div key={item.id} onClick={() => { setTab("new"); setForm(f => ({ ...f, name: item.name, sector: item.sector })); setType(item.type); }}
                      style={{ background: "#141414", border: `0.5px solid ${item.urgent ? "#5a1a1a" : "#1e1e1e"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, cursor: "pointer", transition: "border-color 0.15s" }}>
                      <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 500, color: "#e8e4dc" }}>{item.name}</p>
                      <p style={{ margin: "0 0 8px", fontSize: 11, color: "#555" }}>{item.sector}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: item.type === "ao" ? "#1a1200" : "#0d1410", color: item.type === "ao" ? "#EF9F27" : "#5DCAA5", border: `0.5px solid ${item.type === "ao" ? "#EF9F27" : "#1D9E75"}44` }}>
                          {item.type === "ao" ? "AO" : "Direct"}
                        </span>
                        {item.days > 0 && (
                          <span style={{ fontSize: 10, color: item.urgent ? "#E24B4A" : "#555" }}>
                            {item.urgent ? "! " : ""}{item.days}j
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 28, padding: "16px 20px", background: "#141414", border: "0.5px solid #2a2a2a", borderRadius: 10 }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>Relances urgentes cette semaine</p>
              {pipeline.filter(p => p.urgent).length === 0
                ? <p style={{ margin: 0, fontSize: 13, color: "#444" }}>Aucune relance urgente.</p>
                : pipeline.filter(p => p.urgent).map(item => (
                  <div key={item.id} onClick={() => { setTab("new"); setForm(f => ({ ...f, name: item.name, sector: item.sector })); setType(item.type); }}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid #1e1e1e", cursor: "pointer" }}>
                    <div>
                      <span style={{ fontSize: 13, color: "#e8e4dc" }}>{item.name}</span>
                      <span style={{ fontSize: 11, color: "#555", marginLeft: 10 }}>{item.stage}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "#E24B4A" }}>{item.days} jours sans réponse →</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </main>

      <footer style={{ borderTop: "0.5px solid #1a1a1a", padding: "16px 32px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#333" }}>
        <span>Studio Agent — Propulsé par Claude</span>
        <span>Tous les contenus sont à valider avant envoi</span>
      </footer>
    </div>
  );
}
