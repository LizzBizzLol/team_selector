// src/hooks/useUnsavedPrompt.js
import { useBeforeUnload } from "react-router-dom";
import { useEffect } from "react";

export default function useUnsavedPrompt(when) {
  // ① системный диалог при закрытии/обновлении вкладки
  useBeforeUnload(event => {
    if (!when) return;          // действия нет – молчим
    event.preventDefault();     // Chrome
    event.returnValue = "";     // Safari/Firefox
  });

  // ② fallback для старых браузеров
  useEffect(() => {
    function handler(e) {
      if (!when) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when]);
}
