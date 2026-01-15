import React, { createContext, useContext, useState } from 'react';

const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
    const [sentimentScore, setSentimentScore] = useState(0);
    const [avatarState, setAvatarState] = useState('neutral'); // 'happy', 'concerned', 'neutral'
    const [userMemories, setUserMemories] = useState([]);
    const [nextTopic, setNextTopic] = useState(null);

    const updateDashboard = (data) => {
        if (data.sentiment_score !== undefined) setSentimentScore(data.sentiment_score);
        if (data.avatar_state) setAvatarState(data.avatar_state);
        if (data.memory_update) {
            setUserMemories(prev => [...prev, ...data.memory_update]);
        }
        if (data.next_topic) setNextTopic(data.next_topic);
    };

    return (
        <DashboardContext.Provider value={{
            sentimentScore,
            avatarState,
            userMemories,
            nextTopic,
            updateDashboard
        }}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboard = () => useContext(DashboardContext);
