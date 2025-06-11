// src/hooks/useUnsavedPrompt.js
import { useBeforeUnload, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

export default function useUnsavedPrompt(when) {
  const navigate = useNavigate();
  const location = useLocation();

  // ① системный диалог при закрытии/обновлении вкладки
  useBeforeUnload(event => {
    if (!when) return;          // действия нет – молчим
    event.preventDefault();     // Chrome
    event.returnValue = "У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?";     // Safari/Firefox
  });

  // ② fallback для старых браузеров
  useEffect(() => {
    function handler(e) {
      if (!when) return;
      e.preventDefault();
      e.returnValue = "У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when]);

  // ③ перехват навигации внутри приложения
  useEffect(() => {
    if (!when) return;

    function handleBeforeNavigate(event) {
      if (!window.confirm("У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?")) {
        event.preventDefault();
      }
    }

    window.addEventListener("popstate", handleBeforeNavigate);
    return () => window.removeEventListener("popstate", handleBeforeNavigate);
  }, [when, navigate, location]);
}
