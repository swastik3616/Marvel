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

export default function App() {
  const [state, setState] = useState("IDLE");
  const [userText, setUserText] = useState("");
  const [response, setResponse] = useState("INITIALIZING...");
  const [logs, setLogs] = useState(["> BOOT OK", "> MIC READY", "> AI LINKED", "> STANDBY_"]);
  const [clock, setClock] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [wsOk, setWsOk] = useState(false);
  const [greeting, setGreeting] = useState("");

  // ── Notification state ────────────────────────────────────────────────────
  // { sender, message, status: "awaiting"|"read"|"replied"|"ignored" }
  const [notif, setNotif] = useState(null);
  const notifRef = useRef(null);  // mirror for closures

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

        // ── Notification command intercept (highest priority) ──
        if (handleNotifCommand(rawText, ws)) return;

        // ── Standard JARVIS wake word ──────────────────────────
        if (text.includes("jarvis")) {
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

        // ── WhatsApp notification broadcast ───────────────────
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

        // ── Notification action responses ─────────────────────
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
      : userText
        ? `YOU: ${userText.toUpperCase()}`
        : state === "SPEAKING" ? "JARVIS IS SPEAKING..."
          : "SAY 'JARVIS' TO ACTIVATE";

  // Determine notification indicator color for the top-right corner badge
  const notifBadgeColor = notif
    ? (notif.status === "awaiting" ? "#ff9900" : notif.status === "replied" ? "#00e5ff" : "#00ff88")
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

          {/* Live WhatsApp notification panel */}
          <NotificationPanel notif={notif} col={col} />

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
          </Panel>
        </div>
      </div>
    </>
  );
}