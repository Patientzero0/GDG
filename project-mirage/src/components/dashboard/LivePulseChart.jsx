import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

const LivePulseChart = ({ data }) => {
    return (
        <div className="w-full h-32 mt-4">
            <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-xs text-white/50 uppercase tracking-wider">Live Sentiment Pulse (60s)</span>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                    <span className="text-xs text-teal-400">Live</span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <YAxis domain={[-1, 1]} hide />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#2dd4bf"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false} // Disable default animation for smoother "live" feel
                    />
                    {/* Add a gradient or shadow if desired */}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default LivePulseChart;
