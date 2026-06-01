import { useEffect, useRef, useState } from "react";
import "./BubblePage.css";

/**
 * BubblePage — Renders inside the tiny 90×90 floating Electron window.
 *
 * Behaviours:
 *  - Click (no drag) → opens voice chat in the main window
 *  - Drag → moves the bubble anywhere on screen (main process moves window)
 *  - Drag to bottom edge → basket zone appears (orb turns red with ×)
 *  - Release in basket zone → bubble disappears
 */
export default function BubblePage() {
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  const [inBasket, setInBasket] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [voiceState, setVoiceState] = useState("idle");

  // Refs for drag logic
  const isMouseDownRef = useRef(false);
  const isDraggingRef  = useRef(false);
  const startPosRef    = useRef({ x: 0, y: 0 });

  // ── Scope CSS to bubble window only ───────────────────────────────────────
  // Adds a class to <html> so BubblePage.css styles don't leak into the main window
  useEffect(() => {
    document.documentElement.classList.add("bubble-page");
    return () => document.documentElement.classList.remove("bubble-page");
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    const handler = (_, visible) => setInBasket(visible);
    const stateHandler = (_, state) => setVoiceState(state);
    
    window.electronAPI.onBasketUpdate(handler);
    window.electronAPI.onVoiceStateUpdate(stateHandler);
    
    return () => {
      window.electronAPI.offBasketUpdate(handler);
      window.electronAPI.offVoiceStateUpdate(stateHandler);
    };
  }, [isElectron]);

  // ── Mouse event handlers ───────────────────────────────────────────────────
  const onMouseDown = (e) => {
    if (e.button !== 0) return; // left click only
    isMouseDownRef.current = true;
    isDraggingRef.current  = false;
    startPosRef.current    = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e) => {
    if (!isMouseDownRef.current) return;

    // Start drag after moving > 8px to distinguish from a tap
    if (!isDraggingRef.current) {
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if (dx > 8 || dy > 8) {
        isDraggingRef.current = true;
        setIsDragging(true);
        if (isElectron) {
          // Tell main process to start moving the window.
          // offsetX/Y is where inside the bubble the user clicked.
          window.electronAPI.startDrag({
            offsetX: startPosRef.current.x,
            offsetY: startPosRef.current.y,
          });
        }
      }
    }
  };

  const onMouseUp = () => {
    const wasDragging = isDraggingRef.current;

    isMouseDownRef.current = false;
    isDraggingRef.current  = false;
    setIsDragging(false);

    if (wasDragging) {
      // End drag — main process checks if we're in basket zone
      if (isElectron) window.electronAPI.stopDrag();
    } else {
      // It was a pure click → open voice chat
      if (isElectron) window.electronAPI.bubbleClicked();
    }
  };

  // Suppress context menu
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    window.addEventListener("contextmenu", prevent);
    // Also listen for mouseup on the window to catch out-of-bounds releases
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("contextmenu", prevent);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div
      className={`bubble-root state-${voiceState} ${isDragging ? "dragging" : ""}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
    >
      {/* Float wrapper keeps animation separate from orb transforms */}
      <div className={`bubble-float ${inBasket ? "in-basket" : ""}`}>
        {/* The orb — changes to red ✕ when in basket zone */}
        <div className={`bubble-orb ${inBasket ? "in-basket" : ""}`}>
          {/* Inner glass shine */}
          <div className="bubble-shine" />
          {/* Show large × only in basket state */}
          {inBasket && <span className="bubble-close-icon">✕</span>}
        </div>
      </div>

      {/* Subtle outer glow ring */}
      <div className={`bubble-ring ${inBasket ? "in-basket" : ""}`} />
    </div>
  );
}
