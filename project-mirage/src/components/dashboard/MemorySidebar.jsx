import React, { useState } from 'react';
import { Search, User, Database, History, MessageSquare } from 'lucide-react';

const MemorySidebar = ({ memories = [], nextTopic }) => {
    const [activeTab, setActiveTab] = useState('context');

    const contextLog = [
        { id: 1, type: 'user', text: "I'm feeling a bit overwhelmed with work lately." },
        { id: 2, type: 'ai', text: "I understand. Let's break down your tasks." },
        { id: 3, type: 'system', text: "Detected stress markers: High" },
        { id: 4, type: 'user', text: "That would be helpful, thanks." },
    ];

    return (
        <div className="h-full flex flex-col bg-white/5 backdrop-blur-md border-l border-white/10 w-80 fixed right-0 top-0 pt-20 pb-6 px-4 overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Database size={18} className="text-blue-400" />
                Context & Memory
            </h2>

            {/* Cards */}
            <div className="space-y-4 mb-8">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <User size={16} />
                        </div>
                        <Search size={14} className="text-white/40 cursor-pointer hover:text-white" />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {(!memories || memories.length === 0) ? (
                            <div className="text-gray-500 text-xs italic">No context yet...</div>
                        ) : (
                            memories.map((log, index) => (
                                <div key={index} className={`text-xs p-3 rounded-lg ${log.type === 'system' ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-200' :
                                        log.sender === 'ai' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-100' :
                                            'bg-white/5 border border-white/10 text-gray-300'
                                    }`}>
                                    <span className="uppercase text-[10px] font-bold opacity-50 mb-1 block">{log.sender || log.type}</span>
                                    {log.text || log.user_prompt || log.ai_response}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemorySidebar;