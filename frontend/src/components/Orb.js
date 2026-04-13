import { motion } from "framer-motion";

const stateConfig = {
    IDLE: { scale: 1, color: "#06b6d4", glow: 20, pulse: false },
    LISTENING: { scale: 1.15, color: "#22d3ee", glow: 40, pulse: true },
    PROCESSING: { scale: 1.05, color: "#a78bfa", glow: 30, pulse: true },
    SPEAKING: { scale: 1.2, color: "#34d399", glow: 50, pulse: true },
};

export default function Orb({ state }) {
    const config = stateConfig[state] || stateConfig.IDLE;

    return (
        <motion.div
            animate={{ scale: config.pulse ? [config.scale, config.scale * 1.08, config.scale] : config.scale }}
            transition={{ duration: 1.2, repeat: config.pulse ? Infinity : 0, ease: "easeInOut" }}
            style={{
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${config.color}, #000)`,
                boxShadow: `0 0 ${config.glow}px ${config.glow}px ${config.color}55`,
            }}
        />
    );
}