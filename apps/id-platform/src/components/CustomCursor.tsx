"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";

const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, [role="button"], [tabindex="0"]';

export default function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const visibleRef = useRef(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: fine)");
    setIsDesktop(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) =>
      setIsDesktop(e.matches);
    mediaQuery.addEventListener("change", handleMediaChange);

    if (!mediaQuery.matches) return;

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!visibleRef.current) {
        visibleRef.current = true;
        setIsVisible(true);
      }
    };

    const handleMouseLeaveDoc = () => {
      visibleRef.current = false;
      setIsVisible(false);
      setIsHovering(false);
    };

    const handleMouseEnterDoc = () => {
      visibleRef.current = true;
      setIsVisible(true);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const isInteractive = !!target.closest(INTERACTIVE_SELECTOR);
      // React state updates are batched; this only triggers a re-render if the value changes
      setIsHovering(isInteractive);
    };

    // Optimized cursor hiding - avoiding style recalculations on every render
    const style = document.createElement("style");
    style.textContent = `
      @media (pointer: fine) {
        body, a, button, [role="button"], input, textarea { cursor: none !important; }
      }
    `;
    document.head.appendChild(style);

    window.addEventListener("mousemove", moveCursor, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeaveDoc);
    document.addEventListener("mouseenter", handleMouseEnterDoc);
    document.addEventListener("mouseover", handleMouseOver, { passive: true });

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseleave", handleMouseLeaveDoc);
      document.removeEventListener("mouseenter", handleMouseEnterDoc);
      document.removeEventListener("mouseover", handleMouseOver);
      document.head.removeChild(style);
    };
  }, []);

  if (!isDesktop) return null;

  // Define optimized transform style
  const transformStyle = {
    x: cursorX,
    y: cursorY,
    opacity: isVisible ? 1 : 0,
  };

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[999999] will-change-transform transform-gpu backface-hidden"
        style={transformStyle}
      >
        <motion.img
          src="/assets/images/gyro/head_openmouth_icon.png"
          alt="Cursor"
          className="w-6 h-6 object-contain drop-shadow-xl -translate-x-1/2 -translate-y-1/2 transform-gpu"
          initial={{ scale: 1, rotate: 0 }}
          animate={{
            scale: isHovering ? 1.5 : 1,
            rotate: isHovering ? 15 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 12, mass: 0.3 }}
        />
      </motion.div>
    </>
  );
}
