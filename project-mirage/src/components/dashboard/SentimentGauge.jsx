import React from 'react';
import { motion } from 'framer-motion';

const SentimentGauge = ({ value }) => {
    // Value ranges from -1.0 (Negative) to 1.0 (Positive)
    // Normalize to 0-100 for gauge
    const normalizedValue = ((value + 1) / 2) * 100;

    // Determine color based on value
    const getColor = (val) => {
        if (val < -0.3) return '#ef4444'; // Red
        if (val > 0.3) return '#2dd4bf'; // Teal
        return '#9ca3af'; // Gray
    };

    const color = getColor(value);

    return (
        <div className="relative w-64 h-32 flex items-end justify-center overflow-hidden">
            {/* Background Arc */}
            <div className="absolute w-64 h-64 rounded-full border-[12px] border-white/10 border-b-0 border-l-0 border-r-0 transform rotate-[-45deg] origin-bottom" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }}></div>

            {/* Active Arc (Simplified as a needle/indicator for now, or use SVG for precise arc) */}
            <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 200 100">
                <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="12"
                    strokeLinecap="round"
                />
                <motion.path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke={color}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * normalizedValue) / 100}
                    initial={{ strokeDashoffset: 251.2 }}
                    animate={{ strokeDashoffset: 251.2 - (251.2 * normalizedValue) / 100, stroke: color }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
            </svg>

            {/* Value Text */}
            <div className="absolute bottom-0 text-center mb-[-10px]">
                <motion.div
                    className="text-3xl font-bold"
                    style={{ color: color }}
                    animate={{ color: color }}
                >
                    {value.toFixed(2)}
                </motion.div>
                <div className="text-xs text-white/50 uppercase tracking-wider mt-1">Sentiment</div>
            </div>
        </div>
    );
};

export default SentimentGauge;
