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
  const HEYGEN_API_KEY = "sk_V2_hgu_kkE458xlCUQ_hrQK1ucV9JEKtxIrTr0dUwghjzVzQVn7";
  const AVATAR_ID = "Bryan_IT_Sitting_public";
  const { updateDashboard } = useDashboard();

  // Session ID for refund agent
  const [sessionId] = useState(() => "sess_" + Math.random().toString(36).substr(2, 9));
  const [selectedImage, setSelectedImage] = useState(null);

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
    if (!textToSend && !selectedImage) return;

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage = {
      text: textToSend || (selectedImage ? "[Image Sent]" : ""),
      sender: "sent",
      time: time,
      image: selectedImage ? URL.createObjectURL(selectedImage) : null
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    const imageToSend = selectedImage; // local copy
    setSelectedImage(null); // clear after sending

    try {
      let data;

      if (type === 'customer') {
        // REFUND AGENT API
        const formData = new FormData();
        formData.append("session_id", sessionId);
        if (textToSend) formData.append("message", textToSend);
        if (imageToSend) formData.append("image", imageToSend);

        const response = await fetch('http://localhost:8000/refund/chat', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error("Backend API Failed");
        const result = await response.json();

        // Adapt Refund Agent Response to Dashboard/Chat format
        // Normalize sentiment (0-10 to -1 to 1)
        const normalizedScore = (result.sentiment_score - 5) / 5;
        data = {
          answer: result.message,
          sentiment_score: normalizedScore,
          avatar_state: normalizedScore > 0.3 ? 'happy' : (normalizedScore < -0.3 ? 'concerned' : 'neutral'),
          memory_update: result.conversation_history ? result.conversation_history.map(msg => ({
            text: msg.content,
            sender: msg.role === 'user' ? 'user' : 'ai',
            type: msg.role === 'user' ? 'user' : 'ai'
          })) : []
        };
      } else {
        // TEACHER RAG API
        const response = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: textToSend })
        });

        if (!response.ok) throw new Error("Backend API Failed");
        data = await response.json();
      }

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
              {msg.image && <img src={msg.image} alt="User Upload" style={{ maxWidth: '200px', borderRadius: '8px', marginTop: '5px' }} />}
              <span>{msg.time}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
            {/* Image Upload Button (Only for Customer) */}
            {type === 'customer' && (
              <label className="image-upload-btn" style={{ cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files.length > 0) setSelectedImage(e.target.files[0]);
                  }}
                />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={selectedImage ? "#2563eb" : "#6b7280"} strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </label>
            )}

            <input
              type="text"
              placeholder={selectedImage ? "Add a caption..." : "Type your message..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={!isSessionActive && !isListening}
              style={{ flex: 1 }}
            />
          </div>

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