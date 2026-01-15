import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import Lottie from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Magnetic from '../components/Magnetic';
import Dashboard from '../components/dashboard/Dashboard';
import teacherAnimation from '../assets/teacher.json';
import customerAnimation from '../assets/customer.json';
import '../styles/home.css';

const SelectionPage = () => {
  const teacherLottieRef = useRef();
  const customerLottieRef = useRef();
  const [selectedMode, setSelectedMode] = useState(null); // 'teacher' | 'customer' | null

  useEffect(() => {
    if (!selectedMode) {
      // --- Animations from home.js ---
      gsap.from(".home-hero h1", {
        y: 80, opacity: 0, duration: 1.2, ease: "cubic-bezier(0.16, 1, 0.3, 1)"
      });

      gsap.from(".mode-card", {
        y: 100, opacity: 0, stagger: 0.15, duration: 1.2, ease: "expo.out", delay: 0.2
      });
    }
  }, [selectedMode]);

  // --- Lottie Hover Logic from home.js ---
  const handleMouseEnter = (lottieRef, cardId) => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(1.2);
      lottieRef.current.goToAndPlay(0, true);
    }
    gsap.to(`#${cardId} .lottie-box`, {
      scale: 1.08, duration: 0.6, ease: "cubic-bezier(0.16, 1, 0.3, 1)"
    });
  };

  const handleMouseLeave = (lottieRef, cardId) => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(1);
    }
    gsap.to(`#${cardId} .lottie-box`, {
      scale: 1, duration: 0.6, ease: "expo.out"
    });
  };

  const handleSelectMode = (mode) => {
    setSelectedMode(mode);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {!selectedMode ? (
          <motion.div
            key="selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <Navbar />
            <main>
              <section className="home-hero">
                <h1>Select your AI</h1>
                <p>Choose how MIRAGE assists you</p>
              </section>

              <div className="mode-grid">
                {/* Teacher Card */}
                <div onClick={() => handleSelectMode('teacher')} style={{ cursor: 'pointer' }}>
                  <Magnetic strength={0.25}>
                    <div
                      className="mode-card magnetic-card"
                      id="teacher-card"
                      onMouseEnter={() => handleMouseEnter(teacherLottieRef, 'teacher-card')}
                      onMouseLeave={() => handleMouseLeave(teacherLottieRef, 'teacher-card')}
                    >
                      <div className="lottie-box">
                        <Lottie
                          lottieRef={teacherLottieRef}
                          animationData={teacherAnimation}
                          loop={true}
                        />
                      </div>
                      <h2>Teacher Assistant</h2>
                      <p>Explain, evaluate, guide learning</p>
                      <span className="enter">Enter →</span>
                    </div>
                  </Magnetic>
                </div>

                {/* Customer Card */}
                <div onClick={() => handleSelectMode('customer')} style={{ cursor: 'pointer' }}>
                  <Magnetic strength={0.25}>
                    <div
                      className="mode-card magnetic-card"
                      id="customer-card"
                      onMouseEnter={() => handleMouseEnter(customerLottieRef, 'customer-card')}
                      onMouseLeave={() => handleMouseLeave(customerLottieRef, 'customer-card')}
                    >
                      <div className="lottie-box">
                        <Lottie
                          lottieRef={customerLottieRef}
                          animationData={customerAnimation}
                          loop={true}
                        />
                      </div>
                      <h2>Customer Service</h2>
                      <p>Resolve queries, assist users, scale support</p>
                      <span className="enter">Enter →</span>
                    </div>
                  </Magnetic>
                </div>
              </div>
            </main>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Dashboard
              mode={selectedMode}
              onBack={() => setSelectedMode(null)}
              onConnect={() => window.location.href = `/${selectedMode}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SelectionPage;