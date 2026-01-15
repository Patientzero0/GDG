import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

const Magnetic = ({ children, strength = 0.4 }) => {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const handleMouseMove = (e) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      // Move the container
      gsap.to(element, {
        x: x * strength,
        y: y * strength,
        duration: 0.4,
        ease: "cubic-bezier(0.16, 1, 0.3, 1)"
      });

      // Move the text/span inside (if it exists) for parallax effect
      const span = element.querySelector('span');
      if (span) {
        gsap.to(span, {
          x: x * strength * 1.5,
          y: y * strength * 1.5,
          duration: 0.4,
          ease: "cubic-bezier(0.16, 1, 0.3, 1)"
        });
      }
    };

    const handleMouseLeave = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "expo.out"
      });
      
      const span = element.querySelector('span');
      if (span) {
        gsap.to(span, { x: 0, y: 0, duration: 0.6, ease: "expo.out" });
      }
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  // Wrap children in a div to attach ref
  return (
    <div ref={ref}>
      {children}
    </div>
  );
};

export default Magnetic;