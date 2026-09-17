'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';

const KeyboardContext = createContext({
  isKeyboardOpen: false,
  keyboardHeight: 0,
});

export function KeyboardProvider({ children }) {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const initialHeightRef = useRef(0);
  const blurTimeoutRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Record initial baseline height when page loads / orientation stabilizes
    const updateBaseline = () => {
      initialHeightRef.current = window.innerHeight;
    };
    updateBaseline();

    const isTouchOrMobile = () => {
      return (
        window.innerWidth < 768 ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0
      );
    };

    const isEditableElement = (element) => {
      if (!element) return false;
      const tagName = element.tagName;
      const isInput = tagName === 'INPUT' && !['checkbox', 'radio', 'file', 'submit', 'button', 'reset', 'range', 'color', 'image'].includes(element.type);
      const isTextarea = tagName === 'TEXTAREA';
      const isContentEditable = element.isContentEditable;
      return isInput || isTextarea || isContentEditable;
    };

    const checkKeyboardState = () => {
      if (!isTouchOrMobile()) {
        setIsKeyboardOpen(false);
        setKeyboardHeight(0);
        document.documentElement.removeAttribute('data-keyboard-open');
        document.documentElement.style.removeProperty('--keyboard-height');
        return;
      }

      let isOpen = false;
      let detectedHeight = 0;

      // Method 1: Modern Visual Viewport API (iOS 13+, Chrome Android)
      if (window.visualViewport) {
        const vv = window.visualViewport;
        const currentHeight = vv.height;
        const baseline = initialHeightRef.current || window.innerHeight;
        const heightDiff = baseline - currentHeight;

        // If viewport shrinks by more than 120px, keyboard is almost certainly open
        if (heightDiff > 120) {
          isOpen = true;
          detectedHeight = Math.round(heightDiff);
        }
      }

      // Method 2: Active input element check fallback
      const activeEl = document.activeElement;
      if (isEditableElement(activeEl)) {
        isOpen = true;
      }

      setIsKeyboardOpen(isOpen);
      setKeyboardHeight(detectedHeight);

      if (isOpen) {
        document.documentElement.setAttribute('data-keyboard-open', 'true');
        if (detectedHeight > 0) {
          document.documentElement.style.setProperty('--keyboard-height', `${detectedHeight}px`);
        }
      } else {
        document.documentElement.removeAttribute('data-keyboard-open');
        document.documentElement.style.removeProperty('--keyboard-height');
      }
    };

    // Event handlers
    const handleFocusIn = (e) => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      if (isTouchOrMobile() && isEditableElement(e.target)) {
        setIsKeyboardOpen(true);
        document.documentElement.setAttribute('data-keyboard-open', 'true');
        // Check viewport after a small delay as software keyboard animates up
        setTimeout(checkKeyboardState, 150);
        setTimeout(checkKeyboardState, 350);
      }
    };

    const handleFocusOut = () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      blurTimeoutRef.current = setTimeout(() => {
        checkKeyboardState();
      }, 100);
    };

    const handleOrientationChange = () => {
      setTimeout(() => {
        updateBaseline();
        checkKeyboardState();
      }, 300);
    };

    // Listeners
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', checkKeyboardState);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', checkKeyboardState);
      window.visualViewport.addEventListener('scroll', checkKeyboardState);
    }

    // Chromium Virtual Keyboard API support
    if (navigator.virtualKeyboard) {
      try {
        navigator.virtualKeyboard.overlaysContent = true;
        navigator.virtualKeyboard.addEventListener('geometrychange', checkKeyboardState);
      } catch (err) {
        // Ignore unsupported flags
      }
    }

    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', checkKeyboardState);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', checkKeyboardState);
        window.visualViewport.removeEventListener('scroll', checkKeyboardState);
      }

      if (navigator.virtualKeyboard) {
        try {
          navigator.virtualKeyboard.removeEventListener('geometrychange', checkKeyboardState);
        } catch (e) {}
      }
    };
  }, []);

  return (
    <KeyboardContext.Provider value={{ isKeyboardOpen, keyboardHeight }}>
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboard() {
  return useContext(KeyboardContext);
}
