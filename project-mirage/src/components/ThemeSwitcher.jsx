import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

const ThemeSwitcher = () => {
  const [isLight, setIsLight] = useState(false);
  const moonRef = useRef(null);
  const sunRef = useRef(null);

  useEffect(() => {
    // Apply class to body
    if (isLight) {
      document.body.classList.add('light-theme');
      // GSAP Animation from main.js
      gsap.to(moonRef.current, { opacity: 0, duration: 0.3 });
      gsap.to(sunRef.current, { opacity: 1, display: "block", duration: 0.3 });
    } else {
      document.body.classList.remove('light-theme');
      // GSAP Animation from main.js
      gsap.to(moonRef.current, { opacity: 1, duration: 0.3 });
      gsap.to(sunRef.current, { opacity: 0, display: "none", duration: 0.3 });
    }
  }, [isLight]);

  return (
    <button id="theme-switcher" onClick={() => setIsLight(!isLight)}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <mask id="moon-mask">
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <circle cx="18" cy="6" r="8" fill="black" />
        </mask>
        
        {/* Moon Icon */}
        <circle 
          ref={moonRef}
          cx="12" cy="12" r="6" 
          fill="currentColor" 
          mask="url(#moon-mask)" 
          className="moon-icon" 
        />
        
        {/* Sun Icon */}
        <g ref={sunRef} className="sun-icon" style={{ opacity: 0, display: 'none' }}>
           <circle cx="12" cy="12" r="6" fill="currentColor" />
           <path d="M12 4V2M12 22V20M4 12H2M22 12H20M19.071 4.92893L17.6569 6.34315M6.34315 17.6569L4.92893 19.071M19.071 19.071L17.6569 17.6569M6.34315 6.34315L4.92893 4.92893" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </button>
  );
};

export default ThemeSwitcher;