import React, { useState, useEffect, useRef } from 'react';

export default function ScrollToTop({ containerRef = null }) {
  const [isVisible, setIsVisible] = useState(false);
  const buttonRef = useRef(null);

  // Показываем кнопку когда пользователь прокрутил вниз
  const toggleVisibility = () => {
    let scrollTop = 0;
    
    if (containerRef && containerRef.current) {
      // Прокрутка внутри контейнера (например, таблицы)
      scrollTop = containerRef.current.scrollTop;
    } else {
      // Прокрутка страницы
      scrollTop = window.pageYOffset;
    }
    
    if (scrollTop > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Плавная прокрутка наверх
  const scrollToTop = () => {
    if (containerRef && containerRef.current) {
      // Прокрутка контейнера наверх
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } else {
      // Прокрутка страницы наверх
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const target = containerRef ? containerRef.current : window;
    if (target) {
      target.addEventListener('scroll', toggleVisibility);
      return () => {
        target.removeEventListener('scroll', toggleVisibility);
      };
    }
  }, [containerRef]);

  return (
    <>
      {isVisible && (
        <button
          ref={buttonRef}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Вернуться наверх"
          title="Вернуться наверх"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </>
  );
} 