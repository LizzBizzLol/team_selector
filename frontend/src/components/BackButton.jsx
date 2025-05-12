import { useNavigate, useLocation } from "react-router-dom";

/**
 * Кнопка «Назад».
 * • если в history есть куда вернуться → navigate(-1)
 * • иначе уходит на fallback (по умолчанию "/")
 */
export default function BackButton({ fallback = "/", className = "", ...rest }) {
  const navigate = useNavigate();
  const location = useLocation();
  const from      = location.state?.from;      // строка или undefined
  return (
    <button
      {...rest}
      onClick={() =>
        window.history.length > 1    ? navigate(-1)
        : from                          ? navigate(from)
        : navigate(fallback)
      }
      className={`px-3 py-1 border border-gray-400 rounded hover:bg-gray-50 ${className}`}
    >
      ← Назад
    </button>
  );
}
