import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Global Components
import CustomCursor from './components/CustomCursor';

// Pages
import LandingPage from './pages/LandingPage';
import SelectionPage from './pages/SelectionPage';
import ChatPage from './pages/ChatPage';

// Assets (Ensure you have these JSON files in src/assets/)
import teacherAnim from './assets/teacher.json';   // Renamed from teacher-lottie.json
import customerAnim from './assets/customer.json'; // Renamed from customer-lottie.json

// Global Styles
import './styles/main.css';

function App() {
  return (
    <Router>
      {/* The CustomCursor stays outside the Routes so it persists 
         across all page transitions.
      */}
      <CustomCursor />

      <Routes>
        {/* Route: / 
           Corresponds to: index.html 
           Description: The main landing page with Locomotive Scroll and Hero canvas.
        */}
        <Route path="/" element={<LandingPage />} />

        {/* Route: /home 
           Corresponds to: home.html 
           Description: The selection screen to choose between Teacher or Customer mode.
        */}
        <Route path="/home" element={<SelectionPage />} />

        {/* Route: /teacher 
           Corresponds to: teacher.html 
           Description: Chat interface with Teacher Assistant logic.
        */}
        <Route
          path="/teacher"
          element={
            <ChatPage
              type="teacher"
              title="Teacher Assistant"
              lottieData={teacherAnim}
              avatarSrc="https://i.pravatar.cc/40?u=teacher"
              welcomeMsg="I am a teacher assistant, how can I help you?"
            />
          }
        />

        {/* Route: /customer 
           Corresponds to: customer.html 
           Description: Chat interface with Customer Service logic.
        */}
        <Route
          path="/customer"
          element={
            <ChatPage
              type="customer"
              title="Customer Service Assistant"
              lottieData={customerAnim}
              avatarSrc="https://i.pravatar.cc/40?u=customer"
              welcomeMsg="I am a customer service assistant. How can I help you?"
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;