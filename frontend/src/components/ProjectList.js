import React, { useEffect, useState } from "react";
import api from "../api";
import { Link } from "react-router-dom";

export default function ProjectList() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.get("projects/")
      .then(({ data }) => setProjects(data))
      .catch((err) => console.error(err));
  }, []);
  if (!projects.length) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <p className="mb-4 text-gray-600">Пока нет ни одного проекта.</p>
        <Link
          to="/create"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Создать проект
        </Link>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4">Список проектов</h2>

      <table className="min-w-full text-left border rounded-xl overflow-hidden">
        <thead className="bg-gray-100 text-sm">
          <tr>
            <th className="px-4 py-2">Название</th>
            <th className="px-4 py-2">Куратор</th>
            <th className="px-4 py-2">Участники</th>
          </tr>
        </thead>

        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-t">
              {/* ─ название проекта → карточка ─ */}
              <td className="px-4 py-2">
                <Link
                  to={`/project/${p.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {p.title}
                </Link>
              </td>

              {/* ─ куратор → карточка пользователя ─ */}
              <td className="px-4 py-2">
                {p.curator ? (
                  <Link to={`/user/${p.curator.id}`} className="text-blue-600 hover:underline">
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
        </tbody>
      </table>
    </div>
  );
}
