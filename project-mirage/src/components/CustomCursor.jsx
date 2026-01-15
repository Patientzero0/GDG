import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

const CustomCursor = () => {
  const cursorRef = useRef(null);
  let mouseX = 0;
  let mouseY = 0;

  useEffect(() => {
    const cursor = cursorRef.current;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('mousemove', onMouseMove);

    gsap.ticker.add(() => {
      if (cursor) {
        gsap.to(cursor, {
          x: mouseX - 10,
          y: mouseY - 10,
          duration: 0.3,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      }
    });

    // Magnetic Button Logic
    const buttons = document.querySelectorAll('.magnetic-btn, .magnetic-card, .nav-item');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        if (cursor) {
          gsap.to(cursor, { scale: 2, duration: 0.3, ease: "power3.out" });
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (cursor) {
          gsap.to(cursor, { scale: 1, duration: 0.3, ease: "power3.out" });
        }
      });
    });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      gsap.ticker.remove(onMouseMove);
    };
  }, []);

  return <div className="custom-cursor" ref={cursorRef}></div>;
};

export default CustomCursor;