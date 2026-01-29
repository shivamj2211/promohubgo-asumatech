"use client";

import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="
        fixed 
        bottom-20 md:bottom-6
        right-6 
        z-50
        h-12 
        w-12
        rounded-full
        bg-emerald-600
        text-white
        shadow-lg
        hover:bg-emerald-700
        hover:scale-110
        transition
        duration-300
        flex
        items-center
        justify-center
      "
    >
      ↑
    </button>
  );
}
