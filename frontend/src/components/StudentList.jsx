import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api';
import useSorter from "../hooks/useSorter";
import SkillCombobox from "./SkillCombobox";          // ⬅ уже есть
import filterStudents from "../utils/filterStudents";
import { unwrap } from '../utils/unwrap';

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [query, setQuery]       = useState("");        // текстовый поиск
  const [skill, setSkill]       = useState(null);      // объект {id,name}
  const [minLvl, setMinLvl]     = useState(1);
  const { sort, sorted, toggle } = useSorter("name");  // по имени по умолч.
  const location = useLocation();
  useEffect(() => {
    api.get('students/')
       .then(({ data }) => setStudents(unwrap(data)))
       .catch(console.error);
  }, []);

  if (!students.length) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <p className="mb-4 text-gray-600">Пока нет ни одного студента.</p>
        <Link
          to="/"
          state={{ from: location.pathname + location.search }}
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Вернуться
        </Link>
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
      q: query,
      skillId: skill?.id ?? null,
      minLvl
    })
  );

  return (
    <div className="overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4">Студенты</h2>

      {/* ───────── строка фильтров ───────── */}
      <div className="mb-4 flex flex-wrap gap-3 items-end">
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
      <table className="min-w-full text-left border rounded-xl overflow-hidden">
        <thead className="bg-gray-100 text-sm select-none">
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
        <tbody>
          {visible.map(s => (
            <tr key={s.id} className="border-t">
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
          {visible.length === 0 && (
            <tr><td colSpan={3} className="text-center py-6 text-gray-500">
              Ничего не найдено
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );  
}
