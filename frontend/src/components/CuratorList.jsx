import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api";
import useSorter from "../hooks/useSorter";
import { unwrap } from '../utils/unwrap';
import ScrollToTop from './ScrollToTop';

export default function CuratorList() {
  const [curators, setCurators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const { sort, sorted, toggle } = useSorter("name");
  const location = useLocation();
  const observer = useRef();
  const loadingRef = useRef();
  const tableContainerRef = useRef();

  // Функция загрузки кураторов
  const loadCurators = useCallback(async (pageNum = 1, append = false) => {
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
      
      const { data } = await api.get("curators/", { params });
      const newCurators = unwrap(data);
      
      if (append) {
        setCurators(prev => [...prev, ...newCurators]);
      } else {
        setCurators(newCurators);
      }
      
      // Проверяем, есть ли еще данные
      setHasMore(newCurators.length === 30);
      setPage(pageNum);
    } catch (error) {
      console.error('Ошибка загрузки кураторов:', error);
    } finally {
      setLoading(false);
    }
  }, [query, loading]);

  // Эффект для загрузки при изменении поиска
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadCurators(1, false);
  }, [query]);

  // Настройка Intersection Observer для бесконечной прокрутки
  useEffect(() => {
    if (loading) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadCurators(page + 1, true);
      }
    });
    
    if (loadingRef.current) {
      observer.current.observe(loadingRef.current);
    }
    
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [loading, hasMore, page, loadCurators]);

  if (!curators.length && !loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-600">Кураторов пока нет.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4">
        Кураторы {curators.length > 0 && `(${curators.length} загружено)`}
      </h2>

      {/* Поиск */}
      <div className="mb-4 flex-shrink-0">
        <label className="text-sm">
          <span className="block mb-1">Поиск</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Имя или email"
            className="border px-3 py-2 rounded-lg w-48"
          />
        </label>
      </div>

      {/* Таблица */}
      <div className="flex-1 overflow-hidden border rounded-xl" ref={tableContainerRef}>
        <table className="min-w-full text-left">
        <thead className="text-sm sticky top-0 z-10" style={{backgroundColor: "#eee"}}>
            <tr>
              <th onClick={() => toggle("name")}           className="px-4 py-2 cursor-pointer">
                Имя&nbsp;{sort.key==="name" && (sort.dir==="asc"?"▲":"▼")}
              </th>
              <th onClick={() => toggle("email")}          className="px-4 py-2 cursor-pointer">
                Email&nbsp;{sort.key==="email" && (sort.dir==="asc"?"▲":"▼")}
              </th>
              <th onClick={() => toggle("projects_count")} className="px-4 py-2 cursor-pointer w-32">
                Проектов&nbsp;{sort.key==="projects_count" && (sort.dir==="asc"?"▲":"▼")}
              </th>
            </tr>
          </thead>

          <tbody className="overflow-y-auto">
            {sorted(curators).map(c => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link to={`/user/${c.id}`}
                    state={{ from: location.pathname + location.search }}
                    className="text-blue-600 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{c.email}</td>
                <td className="px-4 py-2">{c.projects_count}</td>
              </tr>
            ))}
            {curators.length === 0 && !loading && (
              <tr>
                <td colSpan={3} className="text-center py-6 text-gray-500">
                  {query.trim() ? "Ничего не найдено" : "Нет кураторов"}
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
