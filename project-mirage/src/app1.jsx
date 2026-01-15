import React, { useEffect, useRef, useState } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar";

const App = () => {
  // ⚠️ PASTE YOUR API KEY HERE ⚠️
  const HEYGEN_API_KEY = "sk_V2_hgu_kzgT30p9Q5j_lsLYyCuNNNi4sEU0bA5KfjygDL9Edkoy"; 
  const AVATAR_ID = "Bryan_IT_Sitting_public"; 

  const [debug, setDebug] = useState("System Offline");
  const [inputText, setInputText] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [avatar, setAvatar] = useState(null);

  // --- REFS FOR STABILITY ---
  const videoRef = useRef(null);
  const avatarRef = useRef(null); // Keep a ref to avatar to ensure cleanup works
  const isInitRef = useRef(false); // 🔒 LOCK: Prevents double-init in React Strict Mode

  // --- 1. GET ACCESS TOKEN ---
  const fetchAccessToken = async () => {
    try {
      const response = await fetch("https://api.heygen.com/v1/streaming.create_token", {
        method: "POST",
        headers: { "x-api-key": HEYGEN_API_KEY },
      });
      if (!response.ok) throw new Error("Token Request Failed");
      const data = await response.json();
      return data.data.token;
    } catch (error) {
      console.error("Token Error:", error);
      setDebug("Error: Wrong API Key or Server Issue");
      return null;
    }
  };

  // --- 2. ROBUST START SESSION ---
  const startSession = async () => {
    // 🔒 1. PREVENT DOUBLE CLICK / DOUBLE RENDER
    if (isInitRef.current || isSessionActive) return;
    isInitRef.current = true; // Lock it

    setDebug("Initializing...");

    try {
      // 🧹 2. CLEANUP OLD SESSIONS FIRST
      if (avatarRef.current) {
        await avatarRef.current.stopAvatar();
        avatarRef.current = null;
      }

      const token = await fetchAccessToken();
      if (!token) {
        isInitRef.current = false; // Unlock on failure
        return;
      }

      const newAvatar = new StreamingAvatar({ token });

      // Event Listeners
      newAvatar.on(StreamingEvents.STREAM_READY, (event) => {
        setDebug("Stream Ready - Listening...");
        if (videoRef.current && event.detail) {
          videoRef.current.srcObject = event.detail;
          videoRef.current.play().catch(console.error);
        }
      });

      newAvatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        setDebug("Session Disconnected");
        setIsSessionActive(false);
        avatarRef.current = null;
        isInitRef.current = false; // Unlock
      });

      // Start Avatar
      await newAvatar.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: AVATAR_ID,
        language: "en", // Force English to prevent Voice 400 Errors
      });

      // Success State
      avatarRef.current = newAvatar;
      setAvatar(newAvatar);
      setIsSessionActive(true);
      setDebug("System Online - Ready for Input");

    } catch (error) {
      console.error("Session Failed:", error);
      setDebug(`Error: ${error.message}`);
      
      // Auto-unlock so user can try again
      isInitRef.current = false; 
      setIsSessionActive(false);

      if (error.message.includes("400")) {
        alert("Session Error: You might have too many open sessions. Wait 2 minutes and try again.");
      }
    }
  };

  // --- 3. SPEAK LOGIC ---
  const handleSpeak = async () => {
    if (!avatarRef.current || !inputText) return;
    
    const text = inputText;
    setInputText("");
    setDebug("Speaking...");

    try {
      await avatarRef.current.speak({
        text: text,
        task_type: TaskType.REPEAT, 
        task_mode: "async" 
      });
    } catch (e) {
      setDebug("Speak Error: " + e.message);
    }
  };

  // --- 4. CLEANUP ON UNMOUNT (CRITICAL) ---
  // If you refresh the page, this tries to kill the session so it doesn't get stuck.
  useEffect(() => {
    return () => {
      if (avatarRef.current) {
        console.log("Auto-Closing Session...");
        avatarRef.current.stopAvatar().catch(() => {});
        avatarRef.current = null;
      }
    };
  }, []);

  const endSession = async () => {
    setDebug("Stopping...");
    if (avatarRef.current) {
      try {
        await avatarRef.current.stopAvatar();
      } catch (e) { console.error(e); }
      avatarRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsSessionActive(false);
    isInitRef.current = false;
    setDebug("Session Ended");
  };

  return (
    <div className="flex flex-col items-center bg-black min-h-screen text-white p-10 font-sans">
      <h1 className="text-3xl font-bold mb-4 text-purple-500">HeyGen Robust Demo</h1>
      
      <div className="mb-6 px-4 py-2 bg-gray-800 rounded-full text-sm font-mono border border-gray-700">
        Status: <span className={isSessionActive ? "text-green-400" : "text-yellow-400"}>{debug}</span>
      </div>

      <div className="relative w-[500px] h-[500px] bg-gray-900 rounded-2xl overflow-hidden border-2 border-purple-900 shadow-2xl">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        
        {!isSessionActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <button 
              onClick={startSession}
              disabled={isInitRef.current} // Disable button while loading
              className={`px-8 py-3 rounded-full font-bold transition hover:scale-105 ${isInitRef.current ? 'bg-gray-600 cursor-wait' : 'bg-purple-600 hover:bg-purple-500'}`}
            >
              {isInitRef.current ? "Starting..." : "Start System"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-4 w-full max-w-lg">
        <input 
          type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
          placeholder="Type here..." className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg outline-none"
          disabled={!isSessionActive} onKeyDown={(e) => e.key === 'Enter' && handleSpeak()}
        />
        <button onClick={handleSpeak} disabled={!isSessionActive} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold border border-gray-700">Speak</button>
        <button onClick={endSession} disabled={!isSessionActive} className="px-6 py-3 bg-red-900/50 hover:bg-red-900 rounded-lg text-red-200 border border-red-900">End</button>
      </div>
    </div>
  );
};

export default App;