import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api';
import useSorter from "../hooks/useSorter";
import SkillCombobox from "./SkillCombobox";          // ⬅ уже есть
import filterStudents from "../utils/filterStudents";
import { unwrap } from '../utils/unwrap';
import ScrollToTop from './ScrollToTop';

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [query, setQuery]       = useState("");        // текстовый поиск
  const [skill, setSkill]       = useState(null);      // объект {id,name}
  const [minLvl, setMinLvl]     = useState(1);
  const { sort, sorted, toggle } = useSorter("name");  // по имени по умолч.
  const location = useLocation();
  const observer = useRef();
  const loadingRef = useRef();
  const tableContainerRef = useRef();

  // Функция загрузки студентов
  const loadStudents = useCallback(async (pageNum = 1, append = false) => {
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
      
      const { data } = await api.get('students/', { params });
      const newStudents = unwrap(data);
      
      if (append) {
        setStudents(prev => [...prev, ...newStudents]);
      } else {
        setStudents(newStudents);
      }
      
      // Проверяем, есть ли еще данные
      setHasMore(newStudents.length === 30);
      setPage(pageNum);
    } catch (error) {
      console.error('Ошибка загрузки студентов:', error);
    } finally {
      setLoading(false);
    }
  }, [query, loading]);

  // Эффект для загрузки при изменении фильтров
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadStudents(1, false);
  }, [query]);

  // Настройка Intersection Observer для бесконечной прокрутки
  useEffect(() => {
    if (loading) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadStudents(page + 1, true);
      }
    });
    
    if (loadingRef.current) {
      observer.current.observe(loadingRef.current);
    }
    
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [loading, hasMore, page, loadStudents]);

  if (!students.length && !loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">Пока нет ни одного студента.</p>
          <Link
            to="/"
            state={{ from: location.pathname + location.search }}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Вернуться
          </Link>
        </div>
      </div>
    );
  }
  const listWithLens = students.map(s => ({
    ...s,
    skillsLen: s.skills?.length ?? 0          // ← новое поле-счётчик
  }));

  /* ---- применяем фильтр-поиск ---- */
  const visible = sorted(
    filterStudents(listWithLens, {
      q: "", // Поиск уже применен на бэкенде
      skillId: skill?.id ?? null,
      minLvl
    })
  );

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4">
        Студенты {students.length > 0 && `(${visible.length} показано)`}
      </h2>

      {/* ───────── строка фильтров ───────── */}
      <div className="mb-4 flex flex-wrap gap-3 items-end flex-shrink-0" style={{zIndex: "14"}}>
        {/* 🔍 текстовый поиск */}
        <label className="text-sm">
          <span className="block mb-1">Поиск</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Имя или e-mail"
            className="border px-3 py-2 rounded-lg w-48"
          />
        </label>

        {/* навык + уровень */}
        <label className="text-sm">
          <span className="block mb-1">Навык</span>
          <SkillCombobox value={skill} onChange={setSkill} />
        </label>

        <label className="text-sm">
          <span className="block mb-1">уровень ≥</span>
          <input
            type="number" min={0} max={5}
            value={minLvl}
            onChange={e=>setMinLvl(Math.max(0,Math.min(5, +e.target.value)))}
            className="border px-3 py-2 rounded-lg w-20 text-center"
          />
        </label>

        <button
          onClick={() => { setQuery(""); setSkill(null); setMinLvl(1); }}
          className="ml-auto text-sm text-blue-600 underline"
        >
          Очистить
        </button>
      </div>

      {/* ───────── таблица ───────── */}
      <div className="flex-1 overflow-hidden border rounded-xl" ref={tableContainerRef}>
        <table className="min-w-full text-left">
          <thead className=" text-sm select-none sticky top-0 z-10" style={{backgroundColor: "#eee"}}>
            <tr>
              <th onClick={()=>toggle("name")}  className="px-4 py-2 cursor-pointer">
                Имя {sort.key==="name" && (sort.dir==="asc"?"▲":"▼")}
              </th>
              <th onClick={()=>toggle("email")} className="px-4 py-2 cursor-pointer">
                E-mail {sort.key==="email" && (sort.dir==="asc"?"▲":"▼")}
              </th>
              <th onClick={() => toggle("skillsLen")} className="px-4 py-2 cursor-pointer w-32">
                Навыков&nbsp;
                {sort.key === "skillsLen" && (sort.dir === "asc" ? "▲" : "▼")}
              </th>
            </tr>
          </thead>
          <tbody className="overflow-y-auto">
            {visible.map(s => (
              <tr key={s.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link to={`/student/${s.id}`}
                    state={{ from: location.pathname + location.search }}
                    className="text-blue-600 hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{s.email}</td>
                <td className="px-4 py-2">{s.skillsLen}</td>
              </tr>
            ))}
            {visible.length === 0 && !loading && (
              <tr><td colSpan={3} className="text-center py-6 text-gray-500">
                Ничего не найдено
              </td></tr>
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
