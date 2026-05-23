import { useState, useEffect } from "react";

const STORAGE_KEY = "padel-matches-v2";

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const getMatchResult = (match) => {
  if (match.type === "americano") {
    const pos = parseInt(match.position);
    const total = parseInt(match.totalPlayers) || 8;
    if (!pos) return "unknown";
    if (pos === 1) return "win";
    if (pos <= Math.ceil(total / 2)) return "draw";
    return "loss";
  }
  const setsWon = (match.sets || []).filter(s => {
    const my = parseInt(s.my);
    const opp = parseInt(s.opp);
    return !isNaN(my) && !isNaN(opp) && my > opp;
  }).length;
  const setsLost = (match.sets || []).filter(s => {
    const my = parseInt(s.my);
    const opp = parseInt(s.opp);
    return !isNaN(my) && !isNaN(opp) && my < opp;
  }).length;
  if (setsWon === 0 && setsLost === 0) return "unknown";
  if (setsWon > setsLost) return "win";
  if (setsLost > setsWon) return "loss";
  return "draw";
};

const resultStyle = {
  win: { bg: "#b6f5d0", color: "#0a5c30", label: "W" },
  loss: { bg: "#ffd6d6", color: "#7a0f0f", label: "L" },
  draw: { bg: "#fff3cd", color: "#5a4000", label: "D" },
  unknown: { bg: "#e8e8e8", color: "#555", label: "?" },
};

const emptySet = { my: "", opp: "" };

const initialMatchForm = {
  type: "match",
  date: new Date().toISOString().split("T")[0],
  partner: "",
  opponents: "",
  sets: [{ ...emptySet }, { ...emptySet }, { ...emptySet }],
  duration: "",
  court: "",
  notes: "",
  felt: "3",
};

const initialAmericanoForm = {
  type: "americano",
  date: new Date().toISOString().split("T")[0],
  court: "",
  duration: "",
  competitionLevel: "",
  myPoints: "",
  position: "",
  notes: "",
  felt: "3",
};

export default function PadelTracker() {
  const [matches, setMatches] = useState([]);
  const [view, setView] = useState("log");
  const [matchType, setMatchType] = useState("match");
  const [matchForm, setMatchForm] = useState(initialMatchForm);
  const [americanoForm, setAmericanoForm] = useState(initialAmericanoForm);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadFromStorage(); }, []);

  async function loadFromStorage() {
    // Try window.storage first, fall back to localStorage
    try {
      const result = await window.storage.get(STORAGE_KEY);
      if (result?.value) {
        setMatches(JSON.parse(result.value));
        return;
      }
    } catch {}
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) setMatches(JSON.parse(local));
    } catch {}
  }

  async function saveMatches(updated) {
    setMatches(updated);
    const json = JSON.stringify(updated);
    try {
      await window.storage.set(STORAGE_KEY, json);
    } catch {}
    try {
      localStorage.setItem(STORAGE_KEY, json);
    } catch {}
  }

  const handleMatchChange = (e) => {
    setMatchForm({ ...matchForm, [e.target.name]: e.target.value });
  };

  const handleAmericanoChange = (e) => {
    setAmericanoForm({ ...americanoForm, [e.target.name]: e.target.value });
  };

  const handleSetChange = (index, field, value) => {
    const newSets = matchForm.sets.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    setMatchForm({ ...matchForm, sets: newSets });
  };

  const addSet = () => {
    if (matchForm.sets.length < 5) {
      setMatchForm({ ...matchForm, sets: [...matchForm.sets, { ...emptySet }] });
    }
  };

  const removeSet = (index) => {
    if (matchForm.sets.length > 1) {
      setMatchForm({ ...matchForm, sets: matchForm.sets.filter((_, i) => i !== index) });
    }
  };

  const handleSubmit = async () => {
    const form = matchType === "match" ? matchForm : americanoForm;
    const newMatch = { ...form, id: Date.now() };
    const updated = [newMatch, ...matches];
    await saveMatches(updated);
    setMatchForm(initialMatchForm);
    setAmericanoForm(initialAmericanoForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setView("history");
  };

  const handleDelete = async (id) => {
    await saveMatches(matches.filter((m) => m.id !== id));
  };

  const allMatches = matches;
  const regularMatches = matches.filter(m => m.type !== "americano");
  const wins = regularMatches.filter(m => getMatchResult(m) === "win").length;
  const losses = regularMatches.filter(m => getMatchResult(m) === "loss").length;
  const americanos = matches.filter(m => m.type === "americano").length;
  const winRate = regularMatches.length ? Math.round((wins / regularMatches.length) * 100) : 0;

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <span style={styles.logo}>🎾</span>
          <div>
            <div style={styles.title}>Padel Log</div>
            <div style={styles.subtitle}>Your match companion</div>
          </div>
        </div>
        {allMatches.length > 0 && (
          <div style={styles.statsRow}>
            <Stat label="Matches" value={regularMatches.length} />
            <Stat label="Won" value={wins} accent="#b6f5d0" textColor="#0a5c30" />
            <Stat label="Lost" value={losses} accent="#ffd6d6" textColor="#7a0f0f" />
            <Stat label="Win %" value={`${winRate}%`} />
            <Stat label="Americanos" value={americanos} accent="rgba(255,255,255,0.2)" />
          </div>
        )}
        <div style={styles.tabs}>
          <Tab label="Log match" active={view === "log"} onClick={() => setView("log")} />
          <Tab label={`History (${allMatches.length})`} active={view === "history"} onClick={() => setView("history")} />
        </div>
      </div>

      <div style={styles.body}>
        {view === "log" && (
          <div>
            {/* Match type toggle */}
            <div style={styles.typeToggle}>
              <button
                style={matchType === "match" ? { ...styles.typeBtn, ...styles.typeBtnActive } : styles.typeBtn}
                onClick={() => setMatchType("match")}
              >
                🎾 Match
              </button>
              <button
                style={matchType === "americano" ? { ...styles.typeBtn, ...styles.typeBtnActive } : styles.typeBtn}
                onClick={() => setMatchType("americano")}
              >
                🏆 Americano
              </button>
            </div>

            {matchType === "match" && (
              <div style={styles.form}>
                <Field label="Date">
                  <input style={styles.input} type="date" name="date" value={matchForm.date} onChange={handleMatchChange} />
                </Field>
                <Field label="Your partner">
                  <input style={styles.input} type="text" name="partner" value={matchForm.partner} onChange={handleMatchChange} placeholder="Partner name" />
                </Field>
                <Field label="Opponents">
                  <input style={styles.input} type="text" name="opponents" value={matchForm.opponents} onChange={handleMatchChange} placeholder="e.g. Dave & Mike" />
                </Field>

                {/* Sets */}
                <div style={{ marginBottom: 16 }}>
                  <label style={styles.label}>Sets</label>
                  {matchForm.sets.map((set, i) => (
                    <div key={i} style={styles.setRow}>
                      <span style={styles.setLabel}>Set {i + 1}</span>
                      <input
                        style={{ ...styles.input, ...styles.setInput }}
                        type="number" min="0" max="99"
                        placeholder="You"
                        value={set.my}
                        onChange={e => handleSetChange(i, "my", e.target.value)}
                      />
                      <span style={styles.vs}>–</span>
                      <input
                        style={{ ...styles.input, ...styles.setInput }}
                        type="number" min="0" max="99"
                        placeholder="Them"
                        value={set.opp}
                        onChange={e => handleSetChange(i, "opp", e.target.value)}
                      />
                      {matchForm.sets.length > 1 && (
                        <button style={styles.removeSetBtn} onClick={() => removeSet(i)}>×</button>
                      )}
                    </div>
                  ))}
                  {matchForm.sets.length < 5 && (
                    <button style={styles.addSetBtn} onClick={addSet}>+ Add set</button>
                  )}
                </div>

                <Field label="Duration">
                  <div style={styles.pillRow}>
                    {["60", "75", "90", "120"].map(d => (
                      <button
                        key={d}
                        style={matchForm.duration === d ? { ...styles.pill, ...styles.pillActive } : styles.pill}
                        onClick={() => setMatchForm({ ...matchForm, duration: d })}
                      >{d} min</button>
                    ))}
                  </div>
                </Field>

                <Field label="Court / venue">
                  <input style={styles.input} type="text" name="court" value={matchForm.court} onChange={handleMatchChange} placeholder="e.g. Nottingham Padel Club" />
                </Field>

                <Field label={`How did you play? ${["😬","😐","🙂","😊","🔥"][parseInt(matchForm.felt)-1]}`}>
                  <input style={styles.slider} type="range" name="felt" value={matchForm.felt} onChange={handleMatchChange} min="1" max="5" />
                  <div style={styles.sliderLabels}><span>Rough</span><span>Great</span></div>
                </Field>

                <Field label="Match notes">
                  <textarea style={{ ...styles.input, ...styles.textarea }} name="notes" value={matchForm.notes} onChange={handleMatchChange} placeholder="How did it go? Key moments, what worked, what didn't..." />
                </Field>

                <button style={saved ? { ...styles.btn, ...styles.btnSaved } : styles.btn} onClick={handleSubmit}>
                  {saved ? "✓ Saved!" : "Save match"}
                </button>
              </div>
            )}

            {matchType === "americano" && (
              <div style={styles.form}>
                <Field label="Date">
                  <input style={styles.input} type="date" name="date" value={americanoForm.date} onChange={handleAmericanoChange} />
                </Field>

                <Field label="Duration">
                  <div style={styles.pillRow}>
                    {["60", "75", "90", "120"].map(d => (
                      <button
                        key={d}
                        style={americanoForm.duration === d ? { ...styles.pill, ...styles.pillActive } : styles.pill}
                        onClick={() => setAmericanoForm({ ...americanoForm, duration: d })}
                      >{d} min</button>
                    ))}
                  </div>
                </Field>

                <Field label="Competition level">
                  <div style={styles.pillRow}>
                    {["Weak", "Average", "Strong"].map(level => (
                      <button
                        key={level}
                        style={americanoForm.competitionLevel === level ? { ...styles.pill, ...styles.pillActive } : styles.pill}
                        onClick={() => setAmericanoForm({ ...americanoForm, competitionLevel: level })}
                      >{level}</button>
                    ))}
                  </div>
                </Field>

                <div style={styles.scoreRow}>
                  <Field label="Your points" style={{ flex: 1 }}>
                    <input style={{ ...styles.input, ...styles.scoreInput }} type="number" name="myPoints" value={americanoForm.myPoints} onChange={handleAmericanoChange} placeholder="e.g. 48" min="0" />
                  </Field>
                  <Field label="Finishing position" style={{ flex: 1 }}>
                    <input style={{ ...styles.input, ...styles.scoreInput }} type="number" name="position" value={americanoForm.position} onChange={handleAmericanoChange} placeholder="e.g. 2" min="1" />
                  </Field>
                </div>

                <Field label="Court / venue">
                  <input style={styles.input} type="text" name="court" value={americanoForm.court} onChange={handleAmericanoChange} placeholder="e.g. Nottingham Padel Club" />
                </Field>

                <Field label={`How did you play? ${["😬","😐","🙂","😊","🔥"][parseInt(americanoForm.felt)-1]}`}>
                  <input style={styles.slider} type="range" name="felt" value={americanoForm.felt} onChange={handleAmericanoChange} min="1" max="5" />
                  <div style={styles.sliderLabels}><span>Rough</span><span>Great</span></div>
                </Field>

                <Field label="Notes">
                  <textarea style={{ ...styles.input, ...styles.textarea }} name="notes" value={americanoForm.notes} onChange={handleAmericanoChange} placeholder="How did the Americano go? Key moments..." />
                </Field>

                <button style={saved ? { ...styles.btn, ...styles.btnSaved } : styles.btn} onClick={handleSubmit}>
                  {saved ? "✓ Saved!" : "Save Americano"}
                </button>
              </div>
            )}
          </div>
        )}

        {view === "history" && (
          <div style={styles.history}>
            {allMatches.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>🎾</div>
                <div>No matches logged yet.</div>
                <button style={styles.btnSmall} onClick={() => setView("log")}>Log your first match</button>
              </div>
            ) : (
              allMatches.map((m) => {
                const r = getMatchResult(m);
                const rs = resultStyle[r];
                const isAmericano = m.type === "americano";
                const playedSets = (m.sets || []).filter(s => s.my !== "" && s.opp !== "");

                return (
                  <div key={m.id} style={{ ...styles.card, borderLeft: isAmericano ? "4px solid #c9a227" : "4px solid #1a5c3a" }}>
                    <div style={styles.cardTop}>
                      <div style={{ ...styles.badge, background: rs.bg, color: rs.color }}>{rs.label}</div>
                      <div style={styles.cardTypeTag}>
                        {isAmericano ? "🏆 Americano" : "🎾 Match"}
                      </div>
                      <div style={styles.cardDate}>{formatDate(m.date)}</div>
                      <button style={styles.deleteBtn} onClick={() => handleDelete(m.id)}>×</button>
                    </div>

                    {isAmericano ? (
                      <>
                        <div style={styles.cardScore}>{m.myPoints ? `${m.myPoints} pts` : "—"}</div>
                        {m.position && <div style={styles.cardMeta}>🥇 Finished {m.position}{ordinal(m.position)}</div>}
                        {m.competitionLevel && <div style={styles.cardMeta}>Competition: {m.competitionLevel}</div>}
                      </>
                    ) : (
                      <>
                        {playedSets.length > 0 && (
                          <div style={styles.setsDisplay}>
                            {playedSets.map((s, i) => {
                              const won = parseInt(s.my) > parseInt(s.opp);
                              return (
                                <div key={i} style={{ ...styles.setChip, background: won ? "#b6f5d0" : "#ffd6d6", color: won ? "#0a5c30" : "#7a0f0f" }}>
                                  {s.my}–{s.opp}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {m.partner && <div style={styles.cardMeta}>With {m.partner}</div>}
                        {m.opponents && <div style={styles.cardMeta}>vs {m.opponents}</div>}
                      </>
                    )}

                    {m.duration && <div style={styles.cardMeta}>⏱ {m.duration} mins</div>}
                    {m.court && <div style={styles.cardMeta}>📍 {m.court}</div>}
                    {m.felt && <div style={styles.cardMeta}>Felt: {["😬","😐","🙂","😊","🔥"][parseInt(m.felt)-1]}</div>}
                    {m.notes && <div style={styles.cardNotes}>{m.notes}</div>}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ordinal(n) {
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return s[(v-20)%10] || s[v] || s[0];
}

function Stat({ label, value, accent, textColor }) {
  return (
    <div style={{ ...styles.stat, background: accent || "rgba(255,255,255,0.15)" }}>
      <div style={{ ...styles.statValue, color: textColor || "#fff" }}>{value}</div>
      <div style={{ ...styles.statLabel, color: textColor || "rgba(255,255,255,0.8)" }}>{label}</div>
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={active ? { ...styles.tab, ...styles.tabActive } : styles.tab}>
      {label}
    </button>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  root: { fontFamily: "'Georgia', serif", background: "#f5f0eb", minHeight: "100vh", maxWidth: 480, margin: "0 auto" },
  header: { background: "linear-gradient(135deg, #1a5c3a 0%, #0d3d26 100%)", padding: "24px 20px 0", color: "#fff" },
  headerTop: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  logo: { fontSize: 36 },
  title: { fontSize: 26, fontWeight: "bold", letterSpacing: "-0.5px" },
  subtitle: { fontSize: 13, opacity: 0.75, fontStyle: "italic" },
  statsRow: { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" },
  stat: { flex: 1, minWidth: 52, borderRadius: 10, padding: "8px 4px", textAlign: "center" },
  statValue: { fontSize: 18, fontWeight: "bold" },
  statLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px" },
  tabs: { display: "flex", gap: 4 },
  tab: { flex: 1, padding: "10px 0", border: "none", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer", borderBottom: "3px solid transparent", fontFamily: "'Georgia', serif" },
  tabActive: { color: "#fff", borderBottom: "3px solid #7effc0", fontWeight: "bold" },
  body: { padding: 20 },
  typeToggle: { display: "flex", gap: 8, marginBottom: 20 },
  typeBtn: { flex: 1, padding: "12px", border: "2px solid #ddd", borderRadius: 10, background: "#fff", fontSize: 15, cursor: "pointer", fontFamily: "'Georgia', serif", color: "#555" },
  typeBtnActive: { border: "2px solid #1a5c3a", background: "#1a5c3a", color: "#fff", fontWeight: "bold" },
  form: {},
  label: { display: "block", fontSize: 12, fontWeight: "bold", color: "#333", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" },
  input: { width: "100%", padding: "10px 12px", border: "2px solid #ddd", borderRadius: 8, fontSize: 15, fontFamily: "'Georgia', serif", background: "#fff", boxSizing: "border-box", outline: "none", color: "#222" },
  setRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  setLabel: { fontSize: 12, color: "#888", minWidth: 40 },
  setInput: { width: 64, textAlign: "center", fontSize: 18, fontWeight: "bold", padding: "8px 4px" },
  addSetBtn: { background: "none", border: "2px dashed #ccc", borderRadius: 8, padding: "6px 14px", fontSize: 13, color: "#888", cursor: "pointer", marginTop: 4 },
  removeSetBtn: { background: "none", border: "none", fontSize: 18, color: "#ccc", cursor: "pointer", padding: "0 4px" },
  pillRow: { display: "flex", gap: 8 },
  pill: { flex: 1, padding: "10px 8px", border: "2px solid #ddd", borderRadius: 8, background: "#fff", fontSize: 14, cursor: "pointer", fontFamily: "'Georgia', serif", color: "#555" },
  pillActive: { border: "2px solid #1a5c3a", background: "#1a5c3a", color: "#fff", fontWeight: "bold" },
  scoreRow: { display: "flex", gap: 12, alignItems: "flex-start" },
  scoreInput: { textAlign: "center", fontSize: 22, fontWeight: "bold" },
  vs: { paddingTop: 28, color: "#999", fontStyle: "italic" },
  slider: { width: "100%", accentColor: "#1a5c3a" },
  sliderLabels: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginTop: 4 },
  textarea: { minHeight: 80, resize: "vertical" },
  btn: { width: "100%", padding: "14px", background: "linear-gradient(135deg, #1a5c3a, #0d3d26)", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: "bold", cursor: "pointer", fontFamily: "'Georgia', serif", marginTop: 8 },
  btnSaved: { background: "linear-gradient(135deg, #2d9e60, #1a5c3a)" },
  btnSmall: { marginTop: 12, padding: "10px 20px", background: "#1a5c3a", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: "'Georgia', serif" },
  history: { display: "flex", flexDirection: "column", gap: 12 },
  card: { background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" },
  cardTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  badge: { width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 12, flexShrink: 0 },
  cardTypeTag: { fontSize: 12, color: "#888" },
  cardDate: { flex: 1, fontSize: 12, color: "#aaa", textAlign: "right" },
  deleteBtn: { background: "none", border: "none", fontSize: 20, color: "#ccc", cursor: "pointer", padding: "0 4px", lineHeight: 1 },
  cardScore: { fontSize: 26, fontWeight: "bold", color: "#1a1a1a", marginBottom: 6 },
  setsDisplay: { display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  setChip: { padding: "4px 10px", borderRadius: 20, fontSize: 14, fontWeight: "bold" },
  cardMeta: { fontSize: 13, color: "#666", marginBottom: 3 },
  cardNotes: { marginTop: 8, fontSize: 13, color: "#444", fontStyle: "italic", borderTop: "1px solid #f0f0f0", paddingTop: 8, lineHeight: 1.5 },
  empty: { textAlign: "center", padding: "60px 20px", color: "#888", fontSize: 15 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
};

