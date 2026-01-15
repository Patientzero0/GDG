import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar";
import ThemeSwitcher from '../components/ThemeSwitcher';
import GoogleTranslate from '../components/GoogleTranslate';
import { useDashboard } from '../context/DashboardContext';
import '../styles/teacher.css';

const ChatPage = ({ type, lottieData, avatarSrc, title, welcomeMsg }) => {
  const HEYGEN_API_KEY = "sk_V2_hgu_kzgT30p9Q5j_lsLYyCuNNNi4sEU0bA5KfjygDL9Edkoy";
  const AVATAR_ID = "Bryan_IT_Sitting_public";
  const { updateDashboard } = useDashboard();

  const [messages, setMessages] = useState([
    { text: welcomeMsg || "Hello! How can I help you today?", sender: "received", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [inputText, setInputText] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [debug, setDebug] = useState("System Offline");

  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const avatarRef = useRef(null);
  const isInitRef = useRef(false);

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

  const startSession = async () => {
    if (isInitRef.current || isSessionActive) return;
    isInitRef.current = true;
    setDebug("Initializing...");
    try {
      if (avatarRef.current) {
        await avatarRef.current.stopAvatar();
        avatarRef.current = null;
      }
      const token = await fetchAccessToken();
      if (!token) {
        isInitRef.current = false;
        return;
      }
      const newAvatar = new StreamingAvatar({ token });
      newAvatar.on(StreamingEvents.STREAM_READY, (event) => {
        setDebug("System Online");
        if (videoRef.current && event.detail) {
          videoRef.current.srcObject = event.detail;
          videoRef.current.play().catch(console.error);
        }
      });
      newAvatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        setDebug("Session Disconnected");
        setIsSessionActive(false);
        avatarRef.current = null;
        isInitRef.current = false;
      });
      await newAvatar.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: AVATAR_ID,
        language: "en",
      });
      avatarRef.current = newAvatar;
      setAvatar(newAvatar);
      setIsSessionActive(true);
      setDebug("Ready");
    } catch (error) {
      console.error("Session Failed:", error);
      setDebug(`Error: ${error.message}`);
      isInitRef.current = false;
      setIsSessionActive(false);
    }
  };

  const avatarSpeak = async (text) => {
    if (!avatarRef.current) return;
    try {
      await avatarRef.current.speak({
        text: text,
        task_type: TaskType.REPEAT,
        task_mode: "async"
      });
    } catch (e) {
      console.error("Speak Error:", e.message);
    }
  };

  const endSession = async () => {
    setDebug("Stopping...");
    if (avatarRef.current) {
      try { await avatarRef.current.stopAvatar(); } catch (e) { console.error(e); }
      avatarRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsSessionActive(false);
    isInitRef.current = false;
    setDebug("System Offline");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (avatarRef.current) {
        avatarRef.current.stopAvatar().catch(() => { });
        avatarRef.current = null;
      }
    };
  }, []);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      handleSend(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech Error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const handleSend = async (manualText = null) => {
    const textToSend = (typeof manualText === 'string' ? manualText : inputText).trim();
    if (!textToSend) return;

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage = {
      text: textToSend,
      sender: "sent",
      time: time
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToSend })
      });

      if (!response.ok) throw new Error("Backend API Failed");

      const data = await response.json();

      updateDashboard(data);

      const responseTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages(prev => [...prev, {
        text: data.answer,
        sender: "received",
        time: responseTime
      }]);

      if (isSessionActive) {
        await avatarSpeak(data.answer);
      }

    } catch (error) {
      console.error("Chat API Error:", error);
      setMessages(prev => [...prev, {
        text: "I'm having trouble connecting to my brain. Please try again.",
        sender: "received",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  return (
    <div className="page-container">
      <div className="avatar-section">
        <Link to="/home" className="back-to-home">← Back</Link>

        {/* HeyGen Streaming Avatar */}
        <div className="avatar-container">
          <div className="avatar-video-wrapper">
            <video ref={videoRef} autoPlay playsInline className="avatar-video" />

            {!isSessionActive && (
              <div className="avatar-overlay">
                <button
                  onClick={startSession}
                  disabled={isInitRef.current}
                  className="start-avatar-btn"
                >
                  {isInitRef.current ? "Starting..." : "Start Avatar"}
                </button>
              </div>
            )}
            <div className="avatar-status">{debug}</div>
          </div>
          {isSessionActive && (
            <button onClick={endSession} className="end-avatar-btn">End Session</button>
          )}
        </div>
      </div>

      <div className="chat-container">
        <div className="chat-header">
          <div className="avatar">
            <img src={avatarSrc} alt="Avatar" />
          </div>
          <div className="username">
            <h2>{title}</h2>
            <p>{isSessionActive ? "Online" : "Offline"}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <GoogleTranslate />
            <ThemeSwitcher />
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              <p>{msg.text}</p>
              <span>{msg.time}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-container">
          <input
            type="text"
            placeholder="Type your message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={!isSessionActive && !isListening}
          />

          <button id="send-btn" onClick={() => handleSend()} disabled={!isSessionActive}>
            Send
          </button>

          <button
            id="audio-btn"
            onClick={startListening}
            disabled={!isSessionActive || isListening}
            title="Voice message"
            style={{ backgroundColor: isListening ? '#ff4444' : '' }}
            className={isListening ? "listening-pulse" : ""}
          >
            {isListening ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="6" width="12" height="12"></rect>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;