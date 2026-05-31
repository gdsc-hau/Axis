"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, [role="button"], [tabindex="0"]';

export default function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: fine)");
    setIsDesktop(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) =>
      setIsDesktop(e.matches);
    mediaQuery.addEventListener("change", handleMediaChange);

    if (!mediaQuery.matches) return;

    const moveCursor = (e: PointerEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform =
          `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }

      if (!visibleRef.current) {
        visibleRef.current = true;
        setIsVisible(true);
      }

      const target = e.target as HTMLElement;
      setIsHovering(
        target.matches(INTERACTIVE_SELECTOR) ||
          !!target.closest(INTERACTIVE_SELECTOR)
      );
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
      setIsHovering(
        target.matches(INTERACTIVE_SELECTOR) ||
          !!target.closest(INTERACTIVE_SELECTOR)
      );
    };

    window.addEventListener("mousemove", moveCursor, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeaveDoc);
    document.addEventListener("mouseenter", handleMouseEnterDoc);
    document.body.addEventListener("mouseover", handleMouseOver);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.removeEventListener("pointermove", moveCursor);
      document.removeEventListener("mouseleave", handleMouseLeaveDoc);
      document.removeEventListener("mouseenter", handleMouseEnterDoc);
      document.body.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  if (!isDesktop) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[999999] will-change-transform"
      style={{
        x: cursorX,
        y: cursorY,
        opacity: isVisible ? 1 : 0,
      }}
    >
      <motion.img
        src="/assets/images/gyro/head_openmouth_icon.png"
        alt="Cursor"
        className="w-6 h-6 object-contain drop-shadow-xl -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 1, rotate: 0 }}
        animate={{
          scale: isHovering ? 1.5 : 1,
          rotate: isHovering ? 15 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 12, mass: 0.3 }}
      />
    </motion.div>
  );
}
