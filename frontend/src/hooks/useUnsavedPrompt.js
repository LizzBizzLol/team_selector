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

  // ③ простая блокировка навигации через клики по ссылкам
  useEffect(() => {
    if (!when) return;

    function handleClick(e) {
      const link = e.target.closest('a[href]');
      if (link && link.href) {
        const href = link.getAttribute('href');
        // Проверяем, что это внутренняя ссылка
        if (href && 
            !href.startsWith('http') && 
            !href.startsWith('mailto:') && 
            !href.startsWith('tel:') && 
            // eslint-disable-next-line no-script-url
            !href.startsWith('javascript:') && 
            !href.startsWith('#')) {
          
          const confirmed = window.confirm("У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу?");
          if (!confirmed) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [when]);
}
