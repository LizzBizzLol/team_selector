import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { unwrap } from '../utils/unwrap';
import ScrollToTop from './ScrollToTop';

export default function SkillList() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const observer = useRef();
  const loadingRef = useRef();
  const tableContainerRef = useRef();

  // Функция загрузки навыков
  const loadSkills = useCallback(async (pageNum = 1, append = false) => {
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
      
      const { data } = await api.get('skills/', { params });
      const newSkills = unwrap(data);
      
      if (append) {
        setSkills(prev => [...prev, ...newSkills]);
      } else {
        setSkills(newSkills);
      }
      
      // Проверяем, есть ли еще данные
      setHasMore(newSkills.length === 30);
      setPage(pageNum);
    } catch (error) {
      console.error('Ошибка загрузки навыков:', error);
    } finally {
      setLoading(false);
    }
  }, [query, loading]);

  // Эффект для загрузки при изменении поиска
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadSkills(1, false);
  }, [query]);

  // Настройка Intersection Observer для бесконечной прокрутки
  useEffect(() => {
    if (loading) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadSkills(page + 1, true);
      }
    });
    
    if (loadingRef.current) {
      observer.current.observe(loadingRef.current);
    }
    
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [loading, hasMore, page, loadSkills]);

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4">
        Навыки {skills.length > 0 && `(${skills.length} загружено)`}
      </h2>

      {/* Поиск */}
      <div className="mb-4 flex-shrink-0">
        <label className="text-sm">
          <span className="block mb-1">Поиск</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Название навыка"
            className="border px-3 py-2 rounded-lg w-48"
          />
        </label>
      </div>

      {/* Таблица */}
      <div className="flex-1 overflow-hidden border rounded-xl" ref={tableContainerRef}>
        <table className="min-w-full text-left">
          <thead className="text-sm sticky top-0 z-10" style={{backgroundColor: "#eee"}}>
            <tr>
              <th className="px-4 py-2">Навык</th>
              <th className="px-4 py-2 w-32">Студентов</th>
            </tr>
          </thead>
          <tbody className="overflow-y-auto">
            {skills.map((sk) => (
              <tr key={sk.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link 
                    to={`/skill/${sk.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {sk.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-center">{sk.students_count || 0}</td>
              </tr>
            ))}
            {skills.length === 0 && !loading && (
              <tr>
                <td colSpan={2} className="text-center py-6 text-gray-500">
                  {query.trim() ? "Ничего не найдено" : "Нет навыков"}
                </td>
              </tr>
            )}
            {/* Индикатор загрузки для бесконечной прокрутки */}
            {hasMore && (
              <tr ref={loadingRef}>
                <td colSpan={2} className="text-center py-4">
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
