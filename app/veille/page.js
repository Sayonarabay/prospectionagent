"use client";
import { useState, useEffect, useCallback } from "react";

const PRIORITY_CONFIG = {
  haute:   { color: "#5DCAA5", bg: "#0f1a14", border: "#1D9E75", label: "Priorité haute" },
  moyenne: { color: "#EF9F27", bg: "#1a1200", border: "#BA7517", label: "Priorité moyenne" },
  basse:   { color: "#888780", bg: "#141414", border: "#2a2a2a", label: "Faible" },
};

const TYPE_CONFIG = {
  ao_public:     { label: "AO public",      color: "#85B7EB", bg: "#0a1520" },
  freelance:     { label: "Freelance",      color: "#5DCAA5", bg: "#0d1a14" },
  appel_projet:  { label: "Appel à projet", color: "#ED93B1", bg: "#1a0d14" },
};

const SOURCE_ICONS = {
  BOAMP: "B", LinkedIn: "in", Malt: "M", Behance: "Be", Autre: "~",
};

function ScoreBar({ score }) {
  const color = score >= 8 ? "#5DCAA5" : score >= 6 ? "#EF9F27" : score >= 4 ? "#D85A30" : "#666";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 56, height: 3, background: "#1e1e1e", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score * 10}%`, background: color, borderRadius: 2, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 500, minWidth: 24 }}>{score}/10</span>
    </div>
  );
}

function OpportunityCard({ item, onGenerate }) {
  const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.moyenne;
  const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.freelance;
  const sourceIcon = SOURCE_ICONS[item.source] || "~";

  return (
    <div style={{
      background: "#141414", border: `0.5px solid ${item.priority === "haute" ? "#1D9E7555" : "#1e1e1e"}`,
      borderLeft: `2px solid ${priority.color}`, borderRadius: 10,
      padding: "16px 18px", marginBottom: 10, transition: "border-color 0.15s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: typeConf.bg, color: typeConf.color, border: `0.5px solid ${typeConf.color}44`, flexShrink: 0 }}>
              {typeConf.label}
            </span>
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "#0d0d0d", color: "#555", border: "0.5px solid #222", flexShrink: 0 }}>
              {sourceIcon} {item.source}
            </span>
            {item.lieu && (
              <span style={{ fontSize: 10, color: "#444" }}>{item.lieu}</span>
            )}
          </div>
          <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 500, color: "#e8e4dc", lineHeight: 1.4 }}>
            {item.title}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#666" }}>{item.organisme}</p>
        </div>
        <ScoreBar score={item.score} />
      </div>

      {item.description && (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#555", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {item.description}
        </p>
      )}

      {item.reason && (
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#888", fontStyle: "italic" }}>
          {item.reason}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {item.action && (
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: priority.bg, color: priority.color, border: `0.5px solid ${priority.border}44` }}>
              {item.action}
            </span>
          )}
          {item.deadline && (
            <span style={{ fontSize: 11, color: "#E24B4A" }}>Deadline : {item.deadline}</span>
          )}
          {item.budget && (
            <span style={{ fontSize: 11, color: "#555" }}>{item.budget}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {item.url && item.url !== "#" && (
            <a href={item.url} target="_blank" rel="noreferrer" style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 6,
              background: "transparent", border: "0.5px solid #2a2a2a",
              color: "#666", textDecoration: "none", cursor: "pointer",
            }}>
              Voir →
            </a>
          )}
          <button onClick={() => onGenerate(item)} style={{
            fontSize: 11, padding: "4px 12px", borderRadius: 6,
            background: "#0f1a14", border: "0.5px solid #1D9E75",
            color: "#5DCAA5", cursor: "pointer", fontFamily: "inherit",
          }}>
            Générer candidature ↗
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VeillePage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchVeille = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/veille");
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
        setMeta({ total: data.total, haute: data.haute });
        setLastFetch(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      } else {
        setError(data.error || "Erreur inconnue");
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  const handleGenerate = (item) => {
    const params = new URLSearchParams({
      name: item.organisme || item.title,
      sector: item.type === "ao_public" ? "Secteur public / AO" : "À définir",
      context: item.description || item.title,
      type: item.type === "ao_public" ? "ao" : "prospect",
    });
    window.location.href = `/?${params.toString()}`;
  };

  const filtered = results
    .filter(r => filter === "all" || r.type === filter)
    .filter(r => r.score >= minScore);

  const stats = {
    total: results.length,
    haute: results.filter(r => r.priority === "haute").length,
    ao: results.filter(r => r.type === "ao_public").length,
    freelance: results.filter(r => r.type === "freelance").length,
    appel: results.filter(r => r.type === "appel_projet").length,
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", minHeight: "100vh", background: "#0d0d0d", color: "#e8e4dc" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ borderBottom: "0.5px solid #1e1e1e", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <a href="/" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "#e8e4dc", textDecoration: "none" }}>studio</a>
          <span style={{ fontSize: 11, color: "#666", letterSpacing: "0.12em", textTransform: "uppercase" }}>veille</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {lastFetch && <span style={{ fontSize: 11, color: "#444" }}>Mis à jour {lastFetch}</span>}
          <a href="/" style={{ fontSize: 12, color: "#666", textDecoration: "none", padding: "5px 12px", border: "0.5px solid #2a2a2a", borderRadius: 6 }}>← Prospection</a>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px" }}>

        {/* Hero / Launch */}
        {!results.length && !loading && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              Veille opportunités
            </p>
            <p style={{ fontSize: 14, color: "#555", margin: "0 0 32px", lineHeight: 1.7, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
              Scan BOAMP (AO publics design) + recherche web (missions freelance, LinkedIn, Malt, Behance).
              Chaque résultat est scoré par Claude selon ton profil de studio.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 48, flexWrap: "wrap" }}>
              {[
                ["BOAMP", "AO publics design"],
                ["LinkedIn", "Missions freelance"],
                ["Malt", "Design graphique"],
                ["Behance Jobs", "Appels créatifs"],
              ].map(([src, desc]) => (
                <div key={src} style={{ padding: "8px 16px", background: "#141414", border: "0.5px solid #1e1e1e", borderRadius: 8, textAlign: "center" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 500, color: "#e8e4dc" }}>{src}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#444" }}>{desc}</p>
                </div>
              ))}
            </div>
            <button onClick={fetchVeille} style={{
              background: "#e8e4dc", color: "#0d0d0d", border: "none",
              borderRadius: 8, padding: "12px 32px", fontSize: 14,
              fontFamily: "inherit", fontWeight: 500, cursor: "pointer",
            }}>
              Lancer la veille →
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%", background: "#5DCAA5",
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
              <style>{`@keyframes pulse { 0%,100%{opacity:0.2} 50%{opacity:1} }`}</style>
              <div style={{ textAlign: "left" }}>
                <p style={{ margin: "0 0 4px", fontSize: 14, color: "#e8e4dc" }}>Scan en cours...</p>
                <p style={{ margin: "0 0 4px", fontSize: 12, color: "#555" }}>1. Interrogation BOAMP (AO publics)</p>
                <p style={{ margin: "0 0 4px", fontSize: 12, color: "#555" }}>2. Recherche web (LinkedIn, Malt, Behance)</p>
                <p style={{ margin: 0, fontSize: 12, color: "#555" }}>3. Scoring Claude selon profil studio</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ padding: "16px 20px", background: "#1a0a0a", border: "0.5px solid #5a1a1a", borderRadius: 8, marginBottom: 24 }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#f09595" }}>Erreur : {error}</p>
            <button onClick={fetchVeille} style={{ fontSize: 12, padding: "5px 14px", background: "transparent", border: "0.5px solid #5a1a1a", color: "#f09595", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>
              Réessayer
            </button>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && !loading && (
          <div>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 8, marginBottom: 24 }}>
              {[
                ["Total", stats.total, "#e8e4dc"],
                ["Priorité haute", stats.haute, "#5DCAA5"],
                ["AO publics", stats.ao, "#85B7EB"],
                ["Freelance", stats.freelance, "#5DCAA5"],
                ["Appels projets", stats.appel, "#ED93B1"],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: "#141414", border: "0.5px solid #1e1e1e", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 11, color: "#555" }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 500, color }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              {[["all", "Tout"], ["ao_public", "AO publics"], ["freelance", "Freelance"], ["appel_projet", "Appels projets"]].map(([val, label]) => (
                <button key={val} onClick={() => setFilter(val)} style={{
                  background: filter === val ? "#1e1e1e" : "transparent",
                  border: `0.5px solid ${filter === val ? "#333" : "#1e1e1e"}`,
                  color: filter === val ? "#e8e4dc" : "#555",
                  padding: "5px 14px", borderRadius: 6, fontSize: 12,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  {label}
                </button>
              ))}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ fontSize: 11, color: "#555" }}>Score min</label>
                <input type="range" min={0} max={9} step={1} value={minScore}
                  onChange={e => setMinScore(Number(e.target.value))}
                  style={{ width: 80, accentColor: "#5DCAA5" }} />
                <span style={{ fontSize: 12, color: "#5DCAA5", minWidth: 20 }}>{minScore}+</span>
              </div>
              <button onClick={fetchVeille} style={{
                fontSize: 11, padding: "5px 14px", background: "transparent",
                border: "0.5px solid #2a2a2a", color: "#555",
                borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
              }}>
                Actualiser
              </button>
            </div>

            {/* Cards */}
            <div>
              {filtered.length === 0
                ? <p style={{ fontSize: 13, color: "#444", textAlign: "center", padding: "40px 0" }}>Aucun résultat avec ces filtres.</p>
                : filtered.map((item, i) => (
                  <OpportunityCard key={i} item={item} onGenerate={handleGenerate} />
                ))
              }
            </div>

            {/* Footer action */}
            <div style={{ marginTop: 24, padding: "16px 20px", background: "#141414", border: "0.5px solid #1e1e1e", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#555" }}>
                {filtered.length} opportunités affichées · Cliquer "Générer candidature" pour rédiger automatiquement
              </p>
              <button onClick={fetchVeille} style={{
                fontSize: 12, padding: "6px 16px", background: "#0f1a14",
                border: "0.5px solid #1D9E75", color: "#5DCAA5",
                borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
              }}>
                Nouveau scan →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
