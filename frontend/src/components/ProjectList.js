import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "../api";
import { Link, useLocation } from "react-router-dom";
import { unwrap } from '../utils/unwrap';
import ScrollToTop from './ScrollToTop';

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const location = useLocation();
  const observer = useRef();
  const loadingRef = useRef();
  const tableContainerRef = useRef();
  
  // Функция загрузки проектов
  const loadProjects = useCallback(async (pageNum = 1, append = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const params = {
        page: pageNum,
        page_size: 30
      };
      
      // Добавляем поиск если есть
      if (query.trim()) {
        params.search = query.trim();
      }
      
      const { data } = await api.get("projects/", { params });
      const newProjects = unwrap(data);
      
      if (append) {
        setProjects(prev => [...prev, ...newProjects]);
      } else {
        setProjects(newProjects);
      }
      
      // Проверяем, есть ли еще данные
      setHasMore(newProjects.length === 30);
      setPage(pageNum);
    } catch (error) {
      console.error('Ошибка загрузки проектов:', error);
    } finally {
      setLoading(false);
    }
  }, [query, loading]);

  // Эффект для загрузки при изменении поиска
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadProjects(1, false);
  }, [query]);

  // Настройка Intersection Observer для бесконечной прокрутки
  useEffect(() => {
    if (loading) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadProjects(page + 1, true);
      }
    });
    
    if (loadingRef.current) {
      observer.current.observe(loadingRef.current);
    }
    
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [loading, hasMore, page, loadProjects]);

  if (!projects.length && !loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">Пока нет ни одного проекта.</p>
          <Link
            to="/create"
            state={{ from: location.pathname + location.search }}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Создать проект
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4">
        Список проектов {projects.length > 0 && `(${projects.length} загружено)`}
      </h2>

      {/* Поиск */}
      <div className="mb-4 flex-shrink-0">
        <label className="text-sm">
          <span className="block mb-1">Поиск</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Название проекта или куратор"
            className="border px-3 py-2 rounded-lg w-64"
          />
        </label>
      </div>

      {/* Таблица */}
      <div className="flex-1 overflow-hidden border rounded-xl" ref={tableContainerRef}>
        <table className="min-w-full text-left">
          <thead className="text-sm sticky top-0 z-10" style={{backgroundColor: "#eee"}}>
            <tr>
              <th className="px-4 py-2">Название</th>
              <th className="px-4 py-2">Куратор</th>
              <th className="px-4 py-2">Участники</th>
            </tr>
          </thead>

          <tbody className="overflow-y-auto">
            {projects.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                {/* ─ название проекта → карточка ─ */}
                <td className="px-4 py-2">
                  <Link
                    to={`/project/${p.id}`}
                    state={{ from: location.pathname + location.search }}
                    className="text-blue-600 hover:underline"
                  >
                    {p.title}
                  </Link>
                </td>

                {/* ─ куратор → карточка пользователя ─ */}
                <td className="px-4 py-2">
                  {p.curator ? (
                    <Link to={`/user/${p.curator.id}`}
                      state={{ from: location.pathname + location.search }}
                      className="text-blue-600 hover:underline">
                      {p.curator.name}
                    </Link>
                  ) : "—"}
                </td>

                {/* ─ min–max участников ─ */}
                <td className="px-4 py-2">
                  {p.min_participants}–{p.max_participants}
                </td>
              </tr>
            ))}
            {projects.length === 0 && !loading && (
              <tr>
                <td colSpan={3} className="text-center py-6 text-gray-500">
                  {query.trim() ? "Ничего не найдено" : "Нет проектов"}
                </td>
              </tr>
            )}
            {/* Индикатор загрузки для бесконечной прокрутки */}
            {hasMore && (
              <tr ref={loadingRef}>
                <td colSpan={3} className="text-center py-4">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-500">Загрузка...</span>
                    </div>
                  ) : (
                    <div className="h-4"></div> // Невидимый элемент для observer
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Кнопка возврата наверх для таблицы */}
      <ScrollToTop containerRef={tableContainerRef} />
    </div>
  );
}
