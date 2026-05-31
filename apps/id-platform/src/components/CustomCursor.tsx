"use client";

import { useEffect } from "react";

export default function CustomCursor() {
  useEffect(() => {
    // This ensures that if any "cursor: none" was applied to the body 
    // by a previous version of this component, it gets reset.
    document.body.style.cursor = "auto";
  }, []);

  return null;
}
