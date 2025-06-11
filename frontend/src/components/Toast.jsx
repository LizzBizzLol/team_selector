import { Fragment, useEffect } from "react";
import { Transition } from "@headlessui/react";

/**
 * props
 * ─ show      – Boolean       виден / скрыт
 * ─ ok        – Boolean       «зелёный» = успех, «красный» = ошибка
 * ─ text      – String|React  содержимое
 * ─ onClose   – ()⇒void       вызываем, когда пользователь закрыл ИЛИ истёк таймаут
 * ─ duration  – ms, default 4000
 */
export default function Toast({ show, ok, text, onClose, duration = 4000 }) {
  // авто-закрытие
  useEffect(() => {
    if (!show) return;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [show, duration, onClose]);

  // Разбиваем текст на строки, если это многострочное сообщение
  const lines = typeof text === 'string' ? text.split('\n') : [text];

  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transition ease-out duration-200"
      enterFrom="translate-x-full opacity-0"
      enterTo="translate-x-0 opacity-100"
      leave="transition ease-in duration-150"
      leaveFrom="translate-x-0 opacity-100"
      leaveTo="translate-x-full opacity-0"
      afterLeave={onClose}  /* если скрыли вручную */
    >
      <div
        className={`fixed bottom-6 right-6 flex gap-3 items-start
          max-w-sm px-4 py-3 rounded-xl shadow-lg text-sm text-white
          ${ok ? "bg-emerald-600" : "bg-rose-600"}`}
      >
        {/* Иконка */}
        <div className="flex-shrink-0 mt-0.5">
          {ok ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        {/* Текст */}
        <div className="flex-1">
          {lines.map((line, i) => (
            <p key={i} className={i > 0 ? "mt-1" : ""}>
              {line}
            </p>
          ))}
        </div>

        {/* кнопка ✖ */}
        <button
          onClick={onClose}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition text-lg leading-none"
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>
    </Transition>
  );
}
