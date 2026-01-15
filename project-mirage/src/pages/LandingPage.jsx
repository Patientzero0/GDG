import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import Navbar from '../components/Navbar';
import Magnetic from '../components/Magnetic';

const LandingPage = () => {
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    // --- Nav scroll effect on regular scroll ---
    const handleScroll = () => {
      if (window.scrollY > 50) {
        gsap.to(".glass-nav", { backgroundColor: "rgba(15, 15, 15, 0.85)", padding: "10px 0", duration: 0.4, backdropFilter: "blur(20px)" });
      } else {
        gsap.to(".glass-nav", { backgroundColor: "rgba(40, 40, 40, 0.35)", padding: "14px 0", duration: 0.4, backdropFilter: "blur(10px)" });
      }
    };

    window.addEventListener('scroll', handleScroll);

    // --- Initial Hero Animations ---
    const navTl = gsap.timeline();
    navTl.from(".fixed-nav", {
      y: -20, opacity: 0, duration: 1.5, ease: "power4.out", delay: 0.2
    });

    gsap.from(".hero h1", {
      y: 100, opacity: 0, duration: 1.5, ease: "power4.out", delay: 0.4
    });

    gsap.from(".hero-tagline", {
      y: 50, opacity: 0, duration: 1.5, ease: "power4.out", delay: 0.6
    });

    gsap.from(".hero-description", {
      y: 30, opacity: 0, duration: 1.5, ease: "power4.out", delay: 0.8
    });

    gsap.from(".hero-buttons", {
      y: 20, opacity: 0, duration: 1.5, ease: "power4.out", delay: 1.0
    });

    // --- Canvas Logic (Keep existing) ---
    const canvas = canvasRef.current;
    let animationFrameId;

    if (canvas) {
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      let time = 0;

      const drawOrb = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = 150;
        const pulse = Math.sin(time) * 15;

        // Create gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius + pulse + 100);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.05)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + pulse + 100, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59,130,246,0.15)'; // More subtle core
        ctx.shadowBlur = 60;
        ctx.shadowColor = '#3b82f6';
        ctx.fill();

        time += 0.03; // Slower pulse
        animationFrameId = requestAnimationFrame(drawOrb);
      };
      drawOrb();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div ref={scrollRef} className="landing-container">
      <Navbar />

      <section className="hero">
        <canvas ref={canvasRef} id="avatar-canvas"></canvas>
        <div className="hero-content">
          <h1>MIRAGE</h1>
          <p className="hero-tagline">Beyond Static Chatbots</p>
          <p className="hero-description">
            Lifelike, expressive AI avatars that listen, reason, speak, and react.
            Transforming digital interactions into human connections.
          </p>
          <div className="hero-buttons">
            <Link to="/home">
              <Magnetic>
                <button className="magnetic-btn"><span>Get Started</span></button>
              </Magnetic>
            </Link>
            <Magnetic>
              <button className="magnetic-btn secondary"><span>Watch Demo</span></button>
            </Magnetic>
          </div>
        </div>
        <div className="scroll-indicator">
          <span>Scroll to explore</span>
          <div className="mouse"></div>
        </div>
      </section>

      <section className="intro">
        <div className="intro-content">
          <h2 className="section-title">Advancing Human–AI Interaction</h2>
          <p className="intro-description">
            Experience the future of conversational AI with lifelike avatars that understand context,
            respond naturally, and create meaningful interactions. We bridge the gap between
            digital efficiency and human empathy.
          </p>
        </div>
      </section>

      <section className="how-it-works">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Three simple steps to redefine your customer engagement.</p>
        </div>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">01</div>
            <h3>Select Your Avatar</h3>
            <p>Choose from our diverse range of AI personas tailored for specific roles like teaching or support.</p>
          </div>
          <div className="step-card">
            <div className="step-number">02</div>
            <h3>Integrate Seamlessly</h3>
            <p>Embed the avatar into your platform with just a few lines of code. No complex setup required.</p>
          </div>
          <div className="step-card">
            <div className="step-number">03</div>
            <h3>Engage & Analyze</h3>
            <p>Let the AI handle interactions while you gain insights from real-time analytics and feedback.</p>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-content">
          <h2 className="section-title">Powerful Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Real-Time Interaction</h3>
              <p>Instant responses powered by advanced LLMs with sub-second latency.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎭</div>
              <h3>Natural Expression</h3>
              <p>Lifelike avatars with emotional intelligence that mirror human gestures.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔌</div>
              <h3>Easy Integration</h3>
              <p>Seamlessly embed into your web or mobile applications via our robust API.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌍</div>
              <h3>Multi-Language</h3>
              <p>Support for 50+ languages worldwide with native-level pronunciation.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <div className="testimonials-content">
          <h2 className="section-title">Trusted by Innovators</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <p className="quote">"Mirage transformed our customer support. The avatars feel so real that our users often forget they're talking to an AI."</p>
              <div className="author">
                <div className="author-avatar" style={{ background: '#3b82f6' }}>JD</div>
                <div className="author-info">
                  <h4>John Doe</h4>
                  <span>CTO, TechFlow</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <p className="quote">"The educational avatars have skyrocketed student engagement. It's the future of online learning."</p>
              <div className="author">
                <div className="author-avatar" style={{ background: '#10b981' }}>JS</div>
                <div className="author-info">
                  <h4>Jane Smith</h4>
                  <span>Director, EduLearn</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <p className="quote">"Integration was a breeze. We were up and running with a custom avatar in less than an hour."</p>
              <div className="author">
                <div className="author-avatar" style={{ background: '#8b5cf6' }}>MR</div>
                <div className="author-info">
                  <h4>Mike Ross</h4>
                  <span>Product Lead, Innovate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-content">
          <h2 className="section-title">Ready to Transform Your Experience?</h2>
          <p>Join thousands of businesses using MIRAGE to deliver exceptional AI experiences.</p>
          <Link to="/home">
            <Magnetic>
              <button className="magnetic-btn"><span>Get Started Now</span></button>
            </Magnetic>
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>MIRAGE</h3>
            <p>The next generation of AI avatars.</p>
          </div>
          <div className="footer-links">
            <div className="link-group">
              <h4>Product</h4>
              <a href="#">Features</a>
              <a href="#">Integrations</a>
              <a href="#">Pricing</a>
            </div>
            <div className="link-group">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
            <div className="link-group">
              <h4>Legal</h4>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Security</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Mirage AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;