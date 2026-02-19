import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type OrbitalTimerProps = {
    totalTime: number;
    timeLeft: number;
    onComplete?: () => void;
};

const OrbitalTimer = ({ totalTime, timeLeft, onComplete }: OrbitalTimerProps) => {
    // Normalize progress (0 to 1)
    const progress = Math.max(0, Math.min(1, timeLeft / totalTime));

    // Circumference for SVG dash
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    // Color interpolations based on time left
    const getColor = () => {
        if (progress > 0.6) return "#10b981"; // Emerald
        if (progress > 0.3) return "#f59e0b"; // Amber
        return "#ef4444"; // Red
    };

    return (
        <div className="relative flex items-center justify-center w-16 h-16">
            {/* Background ring */}
            <svg className="absolute w-full h-full transform -rotate-90">
                <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-muted/20"
                />
                {/* Decaying ring */}
                <motion.circle
                    cx="32"
                    cy="32"
                    r={radius}
                    stroke={getColor()}
                    strokeWidth="4"
                    fill="transparent"
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: "linear" }}
                    style={{
                        strokeDasharray: circumference,
                    }}
                />
            </svg>

            {/* Digital readout */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold font-mono ${progress < 0.2 ? 'animate-pulse text-destructive' : 'text-foreground'}`}>
                    {timeLeft}
                </span>
            </div>

            {/* Orbital particle effect */}
            <motion.div
                className="absolute w-full h-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
                <div className="w-1.5 h-1.5 bg-primary rounded-full absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[2px] shadow-[0_0_10px_currentColor]" />
            </motion.div>
        </div>
    );
};

export default OrbitalTimer;
