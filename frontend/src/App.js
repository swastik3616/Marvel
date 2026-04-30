import { useEffect, useRef, useState } from "react";

const STATE_COLORS = {
  IDLE: "#00e5ff",
  LISTENING: "#00ff88",
  PROCESSING: "#ffaa00",
  SPEAKING: "#ff4488",
};

const STATE_SUBS = {
  IDLE: "AWAITING VOICE INPUT",
  LISTENING: "CAPTURING AUDIO...",
  PROCESSING: "AI THINKING...",
  SPEAKING: "GENERATING RESPONSE",
};

// WhatsApp notification status badge colours
const NOTIF_COLORS = {
  awaiting: "#ff9900",   // orange — waiting for command
  read:     "#00ff88",   // green — message was read
  replied:  "#00e5ff",   // cyan — reply sent
  ignored:  "#ffffff33", // faded — ignored
  none:     "#ffffff11", // invisible — no notification
};

// Gmail notification status badge colours
const GMAIL_COLORS = {
  awaiting: "#ea4335",   // Gmail red — waiting for command
  read:     "#34a853",   // Google green — email was read
  ignored:  "#ffffff33", // faded — ignored
  none:     "#ffffff11",
};

// WMO code → simple category for animation
function weatherCategory(code) {
  if (code === 0 || code === 1) return "clear";
  if (code <= 3)               return "cloudy";
  if (code <= 55)              return "drizzle";
  if (code <= 67)              return "rain";
  if (code <= 77)              return "snow";
  if (code <= 82)              return "rain";
  return "storm";
}

function Panel({ title, children }) {
  return (
    <div style={{
      border: "1px solid #00e5ff22",
      background: "#020d1acc",
      padding: 6,
      position: "relative",
    }}>
      <div style={{
        color: "#00e5ff66", fontSize: 8,
        letterSpacing: 2, textTransform: "uppercase", marginBottom: 4,
      }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, val, col, mt, blink }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", margin: `${mt || 2}px 0`, fontSize: 9 }}>
      <span style={{ color: "#00e5ff66" }}>{label}</span>
      <span style={{ color: col || "#00e5ff", animation: blink ? "blink 1.2s infinite" : "none" }}>
        {val}
      </span>
    </div>
  );
}

function BarRow({ label, val, col }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "2px 0" }}>
      <span style={{ width: 40, color: "#00e5ff66", fontSize: 8 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: "#00e5ff22" }}>
        <div style={{ width: `${val}%`, height: "100%", background: col, transition: "width 0.5s" }} />
      </div>
      <span style={{ width: 28, textAlign: "right", fontSize: 8 }}>{val}%</span>
    </div>
  );
}

// ── Weather Panel ─────────────────────────────────────────────────────────────
function WeatherPanel({ weather, col, loading }) {
  if (loading || !weather) {
    return (
      <Panel title="Weather">
        <div style={{ fontSize: 8, color: "#00e5ff33", lineHeight: 1.8 }}>
          {loading ? "FETCHING WEATHER..." : "NO WEATHER DATA"}
        </div>
      </Panel>
    );
  }

  const tempColor =
    weather.temp >= 35 ? "#ff4444" :
    weather.temp >= 25 ? "#ffaa00" :
    weather.temp >= 15 ? col :
    "#88ccff";

  return (
    <Panel title="Weather">
      {/* Location */}
      <div style={{ fontSize: 7, color: "#00e5ff55", marginBottom: 3, letterSpacing: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        📍 {weather.location?.toUpperCase()}
      </div>

      {/* Main temp + icon */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 22, color: tempColor, fontWeight: "bold", lineHeight: 1, textShadow: `0 0 12px ${tempColor}` }}>
            {weather.temp}°
          </div>
          <div style={{ fontSize: 7, color: "#00e5ff66", marginTop: 2 }}>FEELS {weather.feels_like}°C</div>
        </div>
        <div style={{ fontSize: 20, filter: "drop-shadow(0 0 6px #00e5ff66)" }}>{weather.icon}</div>
      </div>

      {/* Condition */}
      <div style={{ fontSize: 8, color: col, letterSpacing: 1, marginBottom: 5 }}>
        {weather.condition?.toUpperCase()}
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 6px", marginBottom: 5 }}>
        <Row label="HUM" val={`${weather.humidity}%`}    col={col} />
        <Row label="WIND" val={`${weather.wind}km/h ${weather.wind_dir}`} col={col} />
        <Row label="UV" val={`${weather.uv} ${weather.uv_label}`}    col={weather.uv >= 8 ? "#ff4444" : weather.uv >= 6 ? "#ffaa00" : col} />
        <Row label="PRESS" val={`${weather.pressure}hPa`} col={col} />
      </div>

      {/* Hourly forecast */}
      {weather.forecast_6h && weather.forecast_6h.length > 0 && (
        <>
          <div style={{ fontSize: 7, color: "#00e5ff44", letterSpacing: 1, marginBottom: 3, borderTop: "1px solid #00e5ff11", paddingTop: 3 }}>NEXT 6H</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {weather.forecast_6h.slice(0, 4).map((h, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 7 }}>
                <div style={{ color: "#00e5ff44" }}>{h.hour}</div>
                <div style={{ fontSize: 11 }}>{h.icon}</div>
                <div style={{ color: col }}>{h.temp}°</div>
                {h.rain > 0 && <div style={{ color: "#88ccff", fontSize: 6 }}>{h.rain}%</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* 3-day forecast */}
      {weather.forecast_3d && weather.forecast_3d.length > 0 && (
        <>
          <div style={{ fontSize: 7, color: "#00e5ff44", letterSpacing: 1, marginBottom: 3, borderTop: "1px solid #00e5ff11", paddingTop: 4, marginTop: 4 }}>3-DAY</div>
          {weather.forecast_3d.map((d, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 7, margin: "2px 0" }}>
              <span style={{ color: "#00e5ff66", width: 22 }}>{d.day}</span>
              <span style={{ fontSize: 10 }}>{d.icon}</span>
              <span style={{ color: "#88ccff" }}>{d.min}°</span>
              <span style={{ color: "#00e5ff44" }}>–</span>
              <span style={{ color: tempColor }}>{d.max}°</span>
              {d.rain > 0 && <span style={{ color: "#88ccff" }}>{d.rain}%💧</span>}
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}

// ── WhatsApp Notification Panel ───────────────────────────────────────────────
function NotificationPanel({ notif, col }) {
  if (!notif) {
    return (
      <Panel title="WhatsApp">
        <div style={{ fontSize: 8, color: "#00e5ff33", lineHeight: 1.6 }}>
          NO ACTIVE NOTIFICATION
        </div>
      </Panel>
    );
  }

  const statusColor = NOTIF_COLORS[notif.status] || NOTIF_COLORS.awaiting;
  const statusLabel = {
    awaiting: "AWAITING COMMAND",
    read:     "MESSAGE READ",
    replied:  "REPLY SENT",
    ignored:  "IGNORED",
  }[notif.status] || "PENDING";

  const pulse = notif.status === "awaiting"
    ? "notifPulse 1.4s ease-in-out infinite"
    : "none";

  return (
    <Panel title="WhatsApp">
      {/* App badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4, marginBottom: 5,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: statusColor,
          animation: pulse,
          boxShadow: notif.status === "awaiting" ? `0 0 8px ${statusColor}` : "none",
        }} />
        <span style={{ fontSize: 8, color: statusColor, letterSpacing: 1 }}>
          {statusLabel}
        </span>
      </div>

      {/* Sender */}
      <div style={{ fontSize: 8, color: "#00e5ff66", marginBottom: 2 }}>FROM</div>
      <div style={{
        fontSize: 10, color: "#fff",
        letterSpacing: 1, marginBottom: 4,
        textShadow: `0 0 6px ${statusColor}`,
      }}>
        {notif.sender.toUpperCase()}
      </div>

      {/* Message preview */}
      <div style={{ fontSize: 8, color: "#00e5ff66", marginBottom: 2 }}>MESSAGE</div>
      <div style={{
        fontSize: 8, color: "#00e5ffcc",
        lineHeight: 1.5, wordBreak: "break-word",
        maxHeight: 36, overflow: "hidden",
      }}>
        {notif.message.length > 80
          ? notif.message.substring(0, 80) + "…"
          : notif.message}
      </div>

      {/* Commands hint */}
      {notif.status === "awaiting" && (
        <div style={{
          marginTop: 5, fontSize: 7, color: "#ff990088",
          borderTop: "1px solid #ff990022", paddingTop: 4,
          lineHeight: 1.7,
        }}>
          SAY: "READ IT" / "IGNORE" / "REPLY ..."
        </div>
      )}
    </Panel>
  );
}

// ── Gmail Notification Panel ───────────────────────────────────────────────
function GmailPanel({ gmailNotif, col }) {
  if (!gmailNotif) {
    return (
      <Panel title="Gmail">
        <div style={{ fontSize: 8, color: "#00e5ff33", lineHeight: 1.6 }}>
          NO ACTIVE EMAIL
        </div>
      </Panel>
    );
  }

  const statusColor = GMAIL_COLORS[gmailNotif.status] || GMAIL_COLORS.awaiting;
  const statusLabel = {
    awaiting: "AWAITING COMMAND",
    read:     "EMAIL READ",
    ignored:  "IGNORED",
  }[gmailNotif.status] || "PENDING";

  const pulse = gmailNotif.status === "awaiting"
    ? "notifPulse 1.4s ease-in-out infinite"
    : "none";

  return (
    <Panel title="Gmail">
      {/* Status badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: statusColor,
          animation: pulse,
          boxShadow: gmailNotif.status === "awaiting" ? `0 0 8px ${statusColor}` : "none",
        }} />
        <span style={{ fontSize: 8, color: statusColor, letterSpacing: 1 }}>
          {statusLabel}
        </span>
      </div>

      {/* Sender */}
      <div style={{ fontSize: 8, color: "#00e5ff66", marginBottom: 2 }}>FROM</div>
      <div style={{
        fontSize: 10, color: "#fff",
        letterSpacing: 1, marginBottom: 2,
        textShadow: `0 0 6px ${statusColor}`,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {gmailNotif.sender.toUpperCase()}
      </div>
      <div style={{ fontSize: 7, color: "#ea433566", marginBottom: 4
      }}>
        {gmailNotif.email}
      </div>

      {/* Subject */}
      <div style={{ fontSize: 8, color: "#00e5ff66", marginBottom: 2 }}>SUBJECT</div>
      <div style={{
        fontSize: 8, color: "#ea4335cc",
        letterSpacing: 0.5, marginBottom: 4,
        lineHeight: 1.4, wordBreak: "break-word",
        maxHeight: 28, overflow: "hidden",
      }}>
        {gmailNotif.subject}
      </div>

      {/* Snippet */}
      {gmailNotif.snippet && (
        <>
          <div style={{ fontSize: 8, color: "#00e5ff66", marginBottom: 2 }}>PREVIEW</div>
          <div style={{
            fontSize: 7, color: "#00e5ffaa",
            lineHeight: 1.5, wordBreak: "break-word",
            maxHeight: 30, overflow: "hidden",
          }}>
            {gmailNotif.snippet.length > 80
              ? gmailNotif.snippet.substring(0, 80) + "…"
              : gmailNotif.snippet}
          </div>
        </>
      )}

      {/* Commands hint */}
      {gmailNotif.status === "awaiting" && (
        <div style={{
          marginTop: 5, fontSize: 7, color: "#ea433588",
          borderTop: "1px solid #ea433522", paddingTop: 4,
          lineHeight: 1.7,
        }}>
          SAY: "READ IT" / "IGNORE"
        </div>
      )}
    </Panel>
  );
}

// ── System Stats Panel ────────────────────────────────────────────────────────
function SystemStatsPanel({ stats, col }) {
  if (!stats) return (
    <Panel title="System Stats">
      <div style={{ fontSize: 8, color: "#00e5ff33" }}>LOADING...</div>
    </Panel>
  );

  return (
    <Panel title="System Stats">
      <BarRow label="CPU" val={Math.round(stats.cpu)} col={col} />
      <BarRow label="RAM" val={Math.round(stats.ram)} col={col} />
      <BarRow label="DSK" val={Math.round(stats.disk)} col={col} />
      <div style={{ marginTop: 4 }}>
        <Row 
          label="BATT" 
          val={`${stats.battery}% ${stats.charging ? "(CHARGING)" : ""}`} 
          col={stats.battery < 20 ? "#ff4444" : col} 
        />
      </div>
    </Panel>
  );
}

// ── Reminders Panel ───────────────────────────────────────────────────────────
function RemindersPanel({ reminders, col }) {
  if (!reminders || reminders.length === 0) {
    return (
      <Panel title="Reminders">
        <div style={{ fontSize: 8, color: "#00e5ff33" }}>NO ACTIVE REMINDERS</div>
      </Panel>
    );
  }

  return (
    <Panel title="Reminders">
      {reminders.map(r => (
        <div key={r.id} style={{ marginBottom: 6, borderBottom: "1px solid #00e5ff11", paddingBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
            <span style={{ color: "#fff" }}>{r.label.toUpperCase()}</span>
            <span style={{ color: col }}>{r.seconds_left}s</span>
          </div>
          <div style={{ height: 2, background: "#00e5ff22", marginTop: 2 }}>
            <div style={{ 
              width: `${Math.max(0, Math.min(100, (r.seconds_left / 60) * 100))}%`, 
              height: "100%", background: col, transition: "width 1s linear" 
            }} />
          </div>
        </div>
      ))}
    </Panel>
  );
}

// ── Spotify Panel ─────────────────────────────────────────────────────────────
function SpotifyPanel({ track, col }) {
  if (!track || track.status === "no track") {
    return (
      <Panel title="Spotify">
        <div style={{ fontSize: 8, color: "#00e5ff33" }}>NO TRACK PLAYING</div>
      </Panel>
    );
  }

  const progress = (track.progress_ms / track.duration_ms) * 100;

  return (
    <Panel title="Spotify">
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {track.album_art && (
          <img src={track.album_art} alt="art" style={{ width: 32, height: 32, border: "1px solid #00e5ff44" }} />
        )}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 9, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {track.name.toUpperCase()}
          </div>
          <div style={{ fontSize: 7, color: col, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {track.artist.toUpperCase()}
          </div>
        </div>
      </div>
      <div style={{ height: 2, background: "#00e5ff22", marginTop: 6, position: "relative" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: col }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 6, color: "#00e5ff44", marginTop: 2 }}>
        <span>{Math.floor(track.progress_ms / 60000)}:{String(Math.floor((track.progress_ms % 60000) / 1000)).padStart(2, '0')}</span>
        <span>{Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}</span>
      </div>
      <div style={{ fontSize: 7, color: track.is_playing ? col : "#ff4444", marginTop: 4, letterSpacing: 1 }}>
        {track.is_playing ? "▶ PLAYING" : "‖ PAUSED"}
      </div>
    </Panel>
  );
}

// ── Calendar Panel ────────────────────────────────────────────────────────────
function CalendarPanel({ meetings, col }) {
  if (!meetings || meetings.length === 0) {
    return (
      <Panel title="Calendar">
        <div style={{ fontSize: 8, color: "#00e5ff33" }}>NO UPCOMING MEETINGS</div>
      </Panel>
    );
  }

  return (
    <Panel title="Calendar">
      {meetings.map(m => (
        <div key={m.id} style={{ marginBottom: 6, borderLeft: `2px solid ${col}`, paddingLeft: 6 }}>
          <div style={{ fontSize: 9, color: "#fff", fontWeight: "bold" }}>{m.title.toUpperCase()}</div>
          <div style={{ fontSize: 7, color: col, marginTop: 1 }}>
            📅 {m.date} | 🕒 {m.time}
          </div>
        </div>
      ))}
    </Panel>
  );
}

export default function App() {
  const [state, setState] = useState("IDLE");
  const [userText, setUserText] = useState("");
  const [response, setResponse] = useState("INITIALIZING...");
  const [logs, setLogs] = useState(["> BOOT OK", "> MIC READY", "> AI LINKED", "> STANDBY_"]);
  const [clock, setClock] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [wsOk, setWsOk] = useState(false);
  const [greeting, setGreeting] = useState("");

  // ── Weather state ─────────────────────────────────────────────────────────
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const weatherIntervalRef = useRef(null);

  // ── Notification state ────────────────────────────────────────────────────
  // { sender, message, status: "awaiting"|"read"|"replied"|"ignored" }
  const [notif, setNotif] = useState(null);
  const notifRef = useRef(null);  // mirror for closures

  // ── Gmail state ──────────────────────────────────────────────────────────
  // { sender, email, subject, snippet, status: "awaiting"|"read"|"ignored" }
  const [gmailNotif, setGmailNotif] = useState(null);
  const gmailNotifRef = useRef(null);

  // ── System Stats state ────────────────────────────────────────────────────
  const [systemStats, setSystemStats] = useState(null);

  // ── Reminders state ───────────────────────────────────────────────────────
  const [activeReminders, setActiveReminders] = useState([]);

  // ── Spotify state ─────────────────────────────────────────────────────────
  const [spotifyTrack, setSpotifyTrack] = useState(null);

  // ── Calendar state ─────────────────────────────────────────────────────────
  const [meetings, setMeetings] = useState([]);

  const radarRef = useRef(null);
  const waveRef = useRef(null);
  const voiceRef = useRef(null);
  const streamRef = useRef(null);
  const targetRef = useRef(null);

  const angleRef = useRef(0);
  const waveData = useRef(new Array(60).fill(0));
  const voiceData = useRef(new Array(80).fill(0));
  const streamData = useRef(new Array(40).fill(0));
  const stateRef = useRef("IDLE");
  const animRef = useRef(null);
  const wsRef = useRef(null);
  const greetedRef = useRef(false);
  const isSpeakingRef = useRef(false);

  const dotsRef = useRef(
    Array.from({ length: 8 }, () => ({
      r: Math.random() * 100 + 20,
      a: Math.random() * Math.PI * 2,
      size: Math.random() * 3 + 1,
    }))
  );

  // ── Clock ───────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toTimeString().split(" ")[0]);
      setDateStr(now.toDateString().toUpperCase());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Weather fetch ────────────────────────────────────────────
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setWeatherLoading(true);
        const res = await fetch("http://localhost:8000/weather");
        if (res.ok) {
          const data = await res.json();
          setWeather(data);
        }
      } catch (e) {
        console.warn("Weather fetch failed:", e);
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
    weatherIntervalRef.current = setInterval(fetchWeather, 600_000);
    return () => clearInterval(weatherIntervalRef.current);
  }, []);

  // ── System Stats fetch ───────────────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("http://localhost:8000/system-stats");
        if (res.ok) {
          const data = await res.json();
          setSystemStats(data);
        }
      } catch (e) {
        console.warn("Stats fetch failed:", e);
      }
    };
    fetchStats();
    const id = setInterval(fetchStats, 5000); // every 5s
    return () => clearInterval(id);
  }, []);

  // ── Reminders fetch ──────────────────────────────────────────
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const res = await fetch("http://localhost:8000/reminders");
        if (res.ok) {
          const data = await res.json();
          setActiveReminders(data);
        }
      } catch (e) {
        console.warn("Reminders fetch failed:", e);
      }
    };
    fetchReminders();
    const id = setInterval(fetchReminders, 2000);
    return () => clearInterval(id);
  }, []);

  // ── Spotify fetch ────────────────────────────────────────────
  useEffect(() => {
    const fetchSpotify = async () => {
      try {
        const res = await fetch("http://localhost:8000/spotify/track");
        if (res.ok) {
          const data = await res.json();
          setSpotifyTrack(data);
        }
      } catch (e) {
        // console.warn("Spotify fetch failed:", e);
      }
    };
    fetchSpotify();
    const id = setInterval(fetchSpotify, 3000);
    return () => clearInterval(id);
  }, []);

  // ── Calendar fetch ───────────────────────────────────────────
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const res = await fetch("http://localhost:8000/meetings");
        if (res.ok) {
          const data = await res.json();
          setMeetings(data);
        }
      } catch (e) {
        console.warn("Meetings fetch failed:", e);
      }
    };
    fetchMeetings();
    const id = setInterval(fetchMeetings, 10000); // every 10s
    return () => clearInterval(id);
  }, []);

  // ── All stable callbacks via refs ───────────────────────────
  const setLogsRef = useRef(setLogs);

  const addLog = useRef((msg) => {
    setLogsRef.current(prev => [...prev, "> " + msg].slice(-8));
  }).current;

  const ttsQueue = useRef([]);
  const ttsPlaying = useRef(false);

  const playNextInQueue = useRef(() => {
    if (ttsQueue.current.length === 0) {
      ttsPlaying.current = false;
      isSpeakingRef.current = false;
      stateRef.current = "IDLE";
      setState("IDLE");
      addLog("SPEECH COMPLETE");
      return;
    }

    const text = ttsQueue.current.shift();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    utterance.volume = 1;

    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Google") || v.name.includes("David") || v.name.includes("Mark")
    );
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => playNextInQueue.current();
    utterance.onerror = (e) => {
      if (e.error === "interrupted") return;
      console.error("TTS error:", e);
      playNextInQueue.current();
    };

    speechSynthesis.speak(utterance);
  });

  const speak = useRef((text) => {
    if (!text) return;

    ttsQueue.current.push(text);

    if (!ttsPlaying.current) {
      ttsPlaying.current = true;
      isSpeakingRef.current = true;
      stateRef.current = "SPEAKING";
      setState("SPEAKING");
      playNextInQueue.current();
    }
  }).current;

  // ── Notification command dispatcher ─────────────────────────
  const handleNotifCommand = useRef((rawText, ws) => {
    const text = rawText.toLowerCase().trim();
    const currentNotif = notifRef.current;

    if (!currentNotif || currentNotif.status !== "awaiting") return false;

    // "yes" / "read it" / "read"
    if (text === "yes" || text === "read it" || text === "read" || text === "read the message") {
      ws.send("__notification_cmd__read");
      setNotif(n => ({ ...n, status: "read" }));
      notifRef.current = { ...currentNotif, status: "read" };
      addLog("NOTIF: READ CMD");
      return true;
    }

    // "ignore" / "no" / "skip"
    if (text === "ignore" || text === "no" || text === "skip" || text === "dismiss") {
      ws.send("__notification_cmd__ignore");
      setNotif(n => ({ ...n, status: "ignored" }));
      notifRef.current = { ...currentNotif, status: "ignored" };
      addLog("NOTIF: IGNORED");
      // Auto-clear after 3s
      setTimeout(() => {
        setNotif(null);
        notifRef.current = null;
      }, 3000);
      return true;
    }

    // "reply ..."
    if (text.startsWith("reply ")) {
      const replyText = rawText.substring(6).trim(); // preserve original casing
      if (replyText) {
        ws.send(`__notification_cmd__reply:${replyText}`);
        setNotif(n => ({ ...n, status: "replied" }));
        notifRef.current = { ...currentNotif, status: "replied" };
        addLog("NOTIF: REPLY SENT");
        // Auto-clear after 4s
        setTimeout(() => {
          setNotif(null);
          notifRef.current = null;
        }, 4000);
        return true;
      }
    }

    return false; // not a notification command — pass to AI
  }).current;

  // ── Gmail command dispatcher ─────────────────────────────────
  const handleGmailCommand = useRef((rawText, ws) => {
    const text = rawText.toLowerCase().trim();
    const currentGmail = gmailNotifRef.current;

    if (!currentGmail || currentGmail.status !== "awaiting") return false;

    // "read it" / "read" / "yes"
    // But only if WhatsApp notif is NOT also awaiting (WhatsApp takes priority)
    if (!notifRef.current || notifRef.current.status !== "awaiting") {
      if (text === "yes" || text === "read it" || text === "read" || text === "read the email" || text === "read the message") {
        ws.send("__gmail_cmd__read");
        setGmailNotif(n => ({ ...n, status: "read" }));
        gmailNotifRef.current = { ...currentGmail, status: "read" };
        addLog("GMAIL: READ CMD");
        setTimeout(() => {
          setGmailNotif(null);
          gmailNotifRef.current = null;
        }, 6000);
        return true;
      }

      // "ignore" / "no" / "skip"
      if (text === "ignore" || text === "no" || text === "skip" || text === "dismiss") {
        ws.send("__gmail_cmd__ignore");
        setGmailNotif(n => ({ ...n, status: "ignored" }));
        gmailNotifRef.current = { ...currentGmail, status: "ignored" };
        addLog("GMAIL: IGNORED");
        setTimeout(() => {
          setGmailNotif(null);
          gmailNotifRef.current = null;
        }, 3000);
        return true;
      }
    }

    return false;
  }).current;

  // ── Speech recognition ───────────────────────────────────────
  const startListening = useRef((ws) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { addLog("STT NOT SUPPORTED"); return; }

    let recognition;
    let active = false;

    const start = () => {
      if (isSpeakingRef.current) { setTimeout(start, 500); return; }
      if (active) return;
      if (ws.readyState !== WebSocket.OPEN) return;

      recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        active = true;
        stateRef.current = "LISTENING";
        setState("LISTENING");
        addLog("MIC ACTIVE");
      };

      recognition.onresult = (event) => {
        const rawText = event.results[0][0].transcript.trim();
        const text = rawText.toLowerCase();
        setState("IDLE");
        stateRef.current = "IDLE";
        setUserText(rawText);
        setGreeting("");

        // ── WhatsApp notification command intercept (highest priority) ──
        if (handleNotifCommand(rawText, ws)) return;

        // ── Gmail command intercept (second priority) ─────────────────
        if (handleGmailCommand(rawText, ws)) return;

        // ── Standard JARVIS wake word ─────────────────────────────────
        if (text.includes("jarvis")) {
          // Intent Detection: Reminders
          if (text.includes("remind me to")) {
            const match = rawText.match(/remind me to (.*) in (\d+) (second|seconds|minute|minutes|hour|hours)/i);
            if (match) {
              const label = match[1];
              let seconds = parseInt(match[2]);
              const unit = match[3].toLowerCase();
              if (unit.startsWith("minute")) seconds *= 60;
              if (unit.startsWith("hour"))   seconds *= 3600;

              fetch("http://localhost:8000/reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label, seconds })
              }).then(() => {
                speak(`Certainly Swastik. I'll remind you to ${label} in ${match[2]} ${unit}.`);
                addLog(`REMINDER SET: ${label}`);
              });
              return;
            }
          }

          // Intent Detection: Spotify
          const lowerText = text.toLowerCase();
          if (lowerText.includes("spotify") || lowerText.includes("music") || lowerText.includes("song")) {
            if (lowerText.includes("play") || lowerText.includes("resume")) {
              ws.send("__spotify_cmd__play");
              speak("Resuming playback on Spotify.");
              addLog("SPOTIFY: PLAY");
              return;
            }
            if (lowerText.includes("pause") || lowerText.includes("stop")) {
              ws.send("__spotify_cmd__pause");
              speak("Spotify playback paused.");
              addLog("SPOTIFY: PAUSE");
              return;
            }
            if (lowerText.includes("next") || lowerText.includes("skip")) {
              ws.send("__spotify_cmd__next");
              speak("Skipping to the next track.");
              addLog("SPOTIFY: NEXT");
              return;
            }
            if (lowerText.includes("previous") || lowerText.includes("back")) {
              ws.send("__spotify_cmd__previous");
              speak("Going back to the previous track.");
              addLog("SPOTIFY: PREVIOUS");
              return;
            }
          }

          // Intent Detection: Calendar / Meetings
          if (lowerText.includes("schedule a meeting") || lowerText.includes("set a meeting")) {
            // Pattern: "schedule a meeting [title] [on] [date] at [time]"
            // Example: "schedule a meeting with Tony on May 5th at 3 PM" or "schedule a meeting Lunch tomorrow at 1 PM"
            const match = rawText.match(/(?:schedule|set) a meeting (.*?) (?:on )?(.*?) at (.*)/i);
            if (match) {
              const title = match[1].trim();
              const date = match[2].trim();
              const time = match[3].trim();

              fetch("http://localhost:8000/meeting", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, date, time })
              }).then(() => {
                speak(`Of course Swastik. I've scheduled your meeting, ${title}, for ${date} at ${time}.`);
                addLog(`MEETING SET: ${title}`);
              });
              return;
            } else {
              speak("I'm sorry Swastik, could you please specify the title, date, and time for the meeting?");
              return;
            }
          }

          if (ws.readyState === WebSocket.OPEN) {
            stateRef.current = "PROCESSING";
            setState("PROCESSING");
            addLog("SENDING: " + rawText.substring(0, 18));
            ws.send(rawText);
          }
        }
      };

      recognition.onerror = (err) => {
        if (err.error === "aborted" || err.error === "no-speech") return;
        addLog("MIC ERR: " + err.error);
      };

      recognition.onend = () => {
        active = false;
        if (ws.readyState !== WebSocket.OPEN) return;

        const waitAndRestart = () => {
          if (isSpeakingRef.current) {
            setTimeout(waitAndRestart, 300);
          } else {
            setTimeout(start, 400);
          }
        };

        waitAndRestart();
      };

      try {
        recognition.start();
      } catch (e) {
        active = false;
        setTimeout(start, 1000);
      }
    };

    start();
  }).current;

  // ── Speech unlock on first click ─────────────────────────────
  useEffect(() => {
    const unlock = () => { speechSynthesis.cancel(); };
    document.addEventListener("click", unlock, { once: true });
    return () => document.removeEventListener("click", unlock);
  }, []);

  // ── WebSocket — runs ONCE only ────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let retryTimeout;
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;
      const ws = new WebSocket("ws://localhost:8000/ws");
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) { ws.close(); return; }
        setWsOk(true);
        addLog("WS CONNECTED");
        greetedRef.current = false;
        startListening(ws);
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setWsOk(false);
        addLog("WS CLOSED — RETRY");
        retryTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        if (isMounted) addLog("WS ERROR");
      };

      ws.onmessage = (e) => {
        if (!isMounted) return;
        const data = JSON.parse(e.data);

        // ── WhatsApp notification broadcast ────────────────────────
        if (data.type === "whatsapp_notification") {
          const newNotif = {
            sender: data.sender,
            message: data.message,
            status: "awaiting",
            timestamp: data.timestamp,
          };
          setNotif(newNotif);
          notifRef.current = newNotif;

          const alertText = `Swastik, you got a message from ${data.sender}. Should I read it?`;
          setResponse(alertText);
          addLog(`WHATSAPP: ${data.sender}`);
          speak(alertText);
          return;
        }

        // ── Gmail broadcast ────────────────────────────────────────
        if (data.type === "gmail_notification") {
          const newGmail = {
            sender:  data.sender,
            email:   data.email,
            subject: data.subject,
            snippet: data.snippet,
            status:  "awaiting",
            timestamp: data.timestamp,
          };
          setGmailNotif(newGmail);
          gmailNotifRef.current = newGmail;

          const alertText = `Swastik, you have an email from ${data.sender}. Subject: ${data.subject}. Should I read it?`;
          setResponse(alertText);
          addLog(`GMAIL: ${data.sender}`);
          speak(alertText);
          return;
        }

        // ── Notification action responses ──────────────────────────
        if (data.notification_action) {
          const action = data.notification_action;
          if (data.response) {
            setResponse(data.response);
            speak(data.response);
          }
          if (action === "ignored") {
            setTimeout(() => {
              setNotif(null);
              notifRef.current = null;
            }, 3000);
          }
          if (action === "replied" || action === "reply_failed") {
            setTimeout(() => {
              setNotif(null);
              notifRef.current = null;
            }, 4000);
          }
          addLog(`NOTIF ACT: ${action.toUpperCase()}`);
          return;
        }

        // ── Gmail action responses ─────────────────────────────────
        if (data.gmail_action) {
          const action = data.gmail_action;
          if (data.response) {
            setResponse(data.response);
            speak(data.response);
          }
          if (action === "ignored") {
            setTimeout(() => {
              setGmailNotif(null);
              gmailNotifRef.current = null;
            }, 3000);
          }
          if (action === "read") {
            setTimeout(() => {
              setGmailNotif(null);
              gmailNotifRef.current = null;
            }, 8000);
          }
          addLog(`GMAIL ACT: ${action.toUpperCase()}`);
          return;
        }

        // ── Standard JARVIS message flow ──────────────────────
        const s = data.state || "IDLE";
        stateRef.current = s;
        setState(s);

        if (data.greeting && !greetedRef.current) {
          greetedRef.current = true;
          const greetText = data.response || "";
          setGreeting(greetText);
          setResponse(greetText);
          addLog("JARVIS: GREETING");
          speak(greetText);
          return;
        }

        if (data.response) {
          setResponse(data.response);
          addLog("JARVIS REPLIED");
          speak(data.response);
        }

        // ── Reminder firing ────────────────────────────────────────
        if (data.type === "reminder") {
          const alertText = `Swastik, your reminder for ${data.label} is firing.`;
          setResponse(alertText);
          speak(alertText);
          addLog(`REMINDER: ${data.label.toUpperCase()}`);
          return;
        }

        if (data.user) {
          setUserText(data.user);
          addLog("USER: " + data.user.substring(0, 18));
        }
      };
    };

    connect();
    return () => {
      isMounted = false;
      wsRef.current?.close();
      clearTimeout(retryTimeout);
    };
  }, []); // ✅ empty — truly runs once

  // ── Canvas loop ───────────────────────────────────────────────
  useEffect(() => {
    const drawRadar = () => {
      const c = radarRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      const W = 260, H = 260, cx = 130, cy = 130, R = 120;
      ctx.clearRect(0, 0, W, H);
      const col = STATE_COLORS[stateRef.current] || "#00e5ff";
      ctx.strokeStyle = col + "44"; ctx.lineWidth = 1;
      [R * 0.25, R * 0.5, R * 0.75, R].forEach(r => {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.strokeStyle = col + "33";
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
      }
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(angleRef.current);
      const sweep = ctx.createLinearGradient(0, 0, R, 0);
      sweep.addColorStop(0, col + "cc"); sweep.addColorStop(1, col + "00");
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, -0.5, 0); ctx.closePath();
      ctx.fillStyle = sweep; ctx.fill(); ctx.restore();
      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angleRef.current) * R, cy + Math.sin(angleRef.current) * R);
      ctx.stroke();
      dotsRef.current.forEach(d => {
        const da = ((angleRef.current - d.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const fade = da < 0.3 ? 1 : Math.max(0, 1 - (da / (Math.PI * 2)) * 3);
        if (fade > 0.05) {
          const x = cx + Math.cos(d.a) * d.r;
          const y = cy + Math.sin(d.a) * d.r;
          ctx.beginPath(); ctx.arc(x, y, d.size, 0, Math.PI * 2);
          ctx.fillStyle = col + Math.floor(fade * 255).toString(16).padStart(2, "0");
          ctx.fill();
        }
      });
      ctx.strokeStyle = col + "55"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
      angleRef.current += 0.025;
    };

    const drawWave = (ref, data) => {
      const c = ref.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      const W = c.width, H = c.height;
      const col = STATE_COLORS[stateRef.current] || "#00e5ff";
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = (i / data.length) * W;
        const y = H / 2 - v * (H / 2.5);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    const drawTarget = () => {
      const c = targetRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      ctx.clearRect(0, 0, 140, 50);
      const col = STATE_COLORS[stateRef.current] || "#00e5ff";
      const cx = 70, cy = 25, R = 18;
      ctx.strokeStyle = col + "66"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - R - 5, cy); ctx.lineTo(cx + R + 5, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - R - 5); ctx.lineTo(cx, cy + R + 5); ctx.stroke();
      ctx.strokeStyle = col + "aa"; ctx.strokeRect(cx - 6, cy - 6, 12, 12);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
      [1.3, 1.7, 2.1].forEach((m, i) => {
        ctx.strokeStyle = col + ["22", "44", "66"][i];
        ctx.beginPath(); ctx.arc(cx, cy, R * m, 0, Math.PI * 2); ctx.stroke();
      });
    };

    const drawStream = () => {
      const c = streamRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      const col = STATE_COLORS[stateRef.current] || "#00e5ff";
      ctx.clearRect(0, 0, 140, 50);
      ctx.strokeStyle = col + "88"; ctx.lineWidth = 1;
      ctx.beginPath();
      streamData.current.forEach((v, i) => {
        const x = (i / streamData.current.length) * 140;
        const y = 25 - v * 20;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.strokeStyle = col + "33"; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(0, 25); ctx.lineTo(140, 25); ctx.stroke();
      ctx.setLineDash([]);
    };

    const loop = () => {
      const s = stateRef.current;
      const now = Date.now();
      drawRadar(); drawTarget();
      waveData.current.shift();
      waveData.current.push(
        s === "LISTENING" ? Math.sin(now * 0.01) * 0.4 + Math.random() * 0.3 :
          s === "SPEAKING" ? Math.sin(now * 0.008) * 0.5 + Math.random() * 0.2 :
            Math.random() * 0.05 - 0.025
      );
      drawWave(waveRef, waveData.current);
      voiceData.current.shift();
      voiceData.current.push(
        s === "LISTENING" ? Math.random() * 0.8 :
          s === "SPEAKING" ? Math.sin(now * 0.012) * 0.6 + 0.3 : 0.03
      );
      drawWave(voiceRef, voiceData.current);
      streamData.current.shift();
      streamData.current.push(Math.sin(now * 0.005) * 0.5 + Math.random() * 0.3);
      drawStream();
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const col = STATE_COLORS[state] || "#00e5ff";
  const sigLevel = { IDLE: 2, LISTENING: 5, PROCESSING: 4, SPEAKING: 5 }[state] || 2;
  const sigLabel = ["--", "LOW", "MED", "MED", "HIGH", "MAX"][sigLevel];

  const centerText = greeting && state === "SPEAKING"
    ? `JARVIS: ${greeting}`
    : notif && notif.status === "awaiting" && state !== "SPEAKING"
      ? `⚡ MSG FROM ${notif.sender.toUpperCase()} — SAY "READ IT" OR "IGNORE"`
      : gmailNotif && gmailNotif.status === "awaiting" && state !== "SPEAKING"
        ? `📧 EMAIL FROM ${gmailNotif.sender.toUpperCase()} — SAY "READ IT" OR "IGNORE"`
        : userText
          ? `YOU: ${userText.toUpperCase()}`
          : state === "SPEAKING" ? "JARVIS IS SPEAKING..."
            : "SAY 'JARVIS' TO ACTIVATE";

  // Determine notification indicator color for the top-right corner badge
  const notifBadgeColor = notif
    ? (notif.status === "awaiting" ? "#ff9900" : notif.status === "replied" ? "#00e5ff" : "#00ff88")
    : "transparent";

  // Determine Gmail indicator color for badge
  const gmailBadgeColor = gmailNotif
    ? (gmailNotif.status === "awaiting" ? "#ea4335" : "#34a853")
    : "transparent";

  return (
    <>
      {/* Keyframe CSS injected globally */}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes notifPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(1.6); }
        }
        @keyframes notifSlideIn {
          from { transform: translateY(-6px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
      `}</style>

      <div style={{
        background: "#020d1a", width: "100vw", height: "100vh",
        fontFamily: "'Courier New', monospace", color: "#00e5ff",
        fontSize: 10, padding: 8,
        display: "grid",
        gridTemplateColumns: "160px 1fr 160px",
        gridTemplateRows: "1fr auto",
        gap: 6, boxSizing: "border-box", overflow: "hidden", position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "repeating-linear-gradient(0deg,transparent,transparent 2px,#00e5ff04 2px,#00e5ff04 4px)",
          zIndex: 10,
        }} />

        {/* Corner brackets */}
        {[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h], i) => (
          <div key={i} style={{
            position: "absolute", [v]: 0, [h]: 0, width: 16, height: 16,
            borderTop: v === "top" ? `2px solid ${col}` : "none",
            borderBottom: v === "bottom" ? `2px solid ${col}` : "none",
            borderLeft: h === "left" ? `2px solid ${col}` : "none",
            borderRight: h === "right" ? `2px solid ${col}` : "none",
            zIndex: 11, transition: "border-color 0.4s",
          }} />
        ))}

        {/* WhatsApp active notification blinking dot — top-right corner */}
        {notif && notif.status === "awaiting" && (
          <div style={{
            position: "absolute", top: 22, right: 22,
            width: 8, height: 8, borderRadius: "50%",
            background: "#ff9900",
            animation: "notifPulse 1.4s ease-in-out infinite",
            boxShadow: "0 0 10px #ff9900",
            zIndex: 20,
          }} />
        )}

        {/* Gmail active notification blinking dot — top-right (offset) */}
        {gmailNotif && gmailNotif.status === "awaiting" && (
          <div style={{
            position: "absolute", top: 22, right: 38,
            width: 8, height: 8, borderRadius: "50%",
            background: "#ea4335",
            animation: "notifPulse 1.4s ease-in-out infinite",
            boxShadow: "0 0 10px #ea4335",
            zIndex: 20,
          }} />
        )}

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Panel title="System Status">
            <Row label="CPU" val="68%" col={col} />
            <Row label="MEM" val="41%" col={col} />
            <Row label="NET" val="ACTIVE" col={col} blink />
            <Row label="AI" val={wsOk ? "ONLINE" : "OFFLINE"} col={wsOk ? col : "#ff4444"} />
            <div style={{ marginTop: 6 }}>
              <BarRow label="VOICE" val={state === "LISTENING" || state === "SPEAKING" ? 70 : 0} col={col} />
              <BarRow label="PROC" val={72} col={col} />
              <BarRow label="SYNC" val={88} col={col} />
            </div>
          </Panel>
          <Panel title="Session Log">
            <div style={{ fontSize: 8, lineHeight: 1.6, color: "#00e5ff88", height: 80, overflow: "hidden" }}>
              {logs.slice(-6).map((l, i, arr) => (
                <div key={i} style={{ color: i === arr.length - 1 ? col : "#00e5ff88" }}>{l}</div>
              ))}
            </div>
          </Panel>
          <Panel title="Audio Input">
            <canvas ref={waveRef} width={140} height={35} style={{ width: "100%", display: "block" }} />
            <Row label="FREQ" val="16 KHZ" col={col} mt={4} />
            <Row label="DEVICE" val="INTEL MIC" col={col} />
          </Panel>
        </div>

        {/* CENTER */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#00e5ff66", fontSize: 8, letterSpacing: 4, marginBottom: 4 }}>
              J.A.R.V.I.S — AI ASSISTANT
            </div>
            <div style={{
              fontSize: 22, letterSpacing: 8, color: "#fff",
              textShadow: `0 0 14px ${col}`, transition: "all 0.4s",
            }}>{state}</div>
            <div style={{ color: "#00e5ff66", fontSize: 8, marginTop: 4 }}>
              {STATE_SUBS[state]}
            </div>
          </div>
          <canvas ref={radarRef} width={260} height={260} />
          <canvas ref={voiceRef} width={280} height={30} style={{ width: "100%", maxWidth: 280 }} />
          <div style={{
            textAlign: "center", fontSize: 9,
            color: notif && notif.status === "awaiting"
              ? "#ff990099"
              : state === "SPEAKING" ? "#ff4488cc" : "#00e5ffaa",
            letterSpacing: 1, maxWidth: 280, lineHeight: 1.6, minHeight: 32,
            transition: "color 0.3s",
            animation: notif && notif.status === "awaiting" ? "notifSlideIn 0.4s ease" : "none",
          }}>
            {centerText}
          </div>

          {/* Compact weather strip */}
          {weather && !weatherLoading && (
            <div style={{
              display: "flex", gap: 10, alignItems: "center", justifyContent: "center",
              fontSize: 8, color: "#00e5ff66", letterSpacing: 1, marginTop: -4,
            }}>
              <span>{weather.icon} {weather.temp}°C</span>
              <span style={{ color: "#00e5ff33" }}>|</span>
              <span>{weather.condition?.toUpperCase()}</span>
              <span style={{ color: "#00e5ff33" }}>|</span>
              <span>💧{weather.humidity}%</span>
              <span style={{ color: "#00e5ff33" }}>|</span>
              <span>💨{weather.wind}km/h</span>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Panel title="Time / Date">
            <div style={{ fontSize: 16, letterSpacing: 2, color: "#fff", fontWeight: "bold" }}>{clock}</div>
            <div style={{ fontSize: 8, color: "#00e5ff66", marginTop: 2 }}>{dateStr}</div>
          </Panel>
          <Panel title="State Matrix">
            {["IDLE", "LISTENING", "PROCESSING", "SPEAKING"].map(s => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", margin: "2px 0", fontSize: 9 }}>
                <span style={{ color: "#00e5ff66" }}>{s}</span>
                <span style={{ color: s === state ? col : "#00e5ff33" }}>
                  {s === state ? "[ ● ]" : "[ — ]"}
                </span>
              </div>
            ))}
          </Panel>

          {/* WhatsApp Notification Panel — replaces/supplements Signal Strength and Response */}
          <Panel title="Signal Strength">
            <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 30, margin: "4px 0" }}>
              {[20, 40, 60, 80, 100].map((h, i) => (
                <div key={i} style={{
                  width: 8, height: `${h}%`,
                  background: i < sigLevel ? col : col + "33",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>
            <Row label="STRENGTH" val={sigLabel} col={col} />
            <Row label="LATENCY" val="12MS" col={col} />
          </Panel>

          {/* Live weather panel */}
          <WeatherPanel weather={weather} col={col} loading={weatherLoading} />

          {/* Live WhatsApp notification panel */}
          <NotificationPanel notif={notif} col={col} />

          {/* Live Gmail notification panel */}
          <GmailPanel gmailNotif={gmailNotif} col={col} />

          {/* Live Reminders panel */}
          <RemindersPanel reminders={activeReminders} col={col} />

          {/* Live Calendar panel */}
          <CalendarPanel meetings={meetings} col={col} />

          {/* Spotify panel */}
          <SpotifyPanel track={spotifyTrack} col={col} />

          <Panel title="Response">
            <div style={{ fontSize: 8, color: "#00e5ffcc", lineHeight: 1.5, minHeight: 50 }}>
              {response.substring(0, 140)}{response.length > 140 ? "..." : ""}
            </div>
          </Panel>
        </div>

        {/* BOTTOM */}
        <div style={{ gridColumn: "1/4", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <Panel title="Targeting Computer">
            <canvas ref={targetRef} width={140} height={50} style={{ width: "100%" }} />
            <Row label="MODE" val="VOICE TRACK" col={col} mt={4} />
            <Row label="STATUS" val="SCANNING" col={col} blink />
          </Panel>
          <Panel title="Data Stream">
            <canvas ref={streamRef} width={140} height={50} style={{ width: "100%" }} />
            <Row label="PROTOCOL" val="WEBSOCKET" col={col} mt={4} />
            <Row label="PORT" val="8000" col={col} />
          </Panel>
          <Panel title="Command Center">
            <Row label="AI MODEL" val="LLAMA 3.1" col={col} />
            <Row label="STT" val="BROWSER" col={col} />
            <Row label="TTS" val="WEB SPEECH" col={col} />
            <Row label="BACKEND" val={wsOk ? "LINKED" : "OFFLINE"} col={wsOk ? col : "#ff4444"} />
            <Row
              label="WHATSAPP"
              val={notif ? (notif.status === "awaiting" ? "PENDING ●" : notif.status.toUpperCase()) : "IDLE"}
              col={notif ? notifBadgeColor : col + "44"}
              blink={!!(notif && notif.status === "awaiting")}
            />
            <Row
              label="GMAIL"
              val={gmailNotif ? (gmailNotif.status === "awaiting" ? "PENDING ●" : gmailNotif.status.toUpperCase()) : "IDLE"}
              col={gmailNotif ? gmailBadgeColor : col + "44"}
              blink={!!(gmailNotif && gmailNotif.status === "awaiting")}
            />
            {weather && (
              <Row
                label="WEATHER"
                val={`${weather.temp}° ${weather.condition?.split(" ")[0].toUpperCase()}`}
                col={weather.temp >= 35 ? "#ff4444" : weather.temp >= 25 ? "#ffaa00" : col}
              />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}