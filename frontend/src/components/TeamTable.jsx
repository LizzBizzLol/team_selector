// src/components/TeamTable.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { unwrap } from '../utils/unwrap';

const PAGE = 5;          // строк на страницу

export default function TeamTable({ projectId }) {
  const [teams, setTeams]     = useState([]);
  const [count, setCount]     = useState(0);   // всего команд
  const [offset, setOffset]   = useState(0);   // текущий offset
  const page  = Math.floor(offset / PAGE) + 1;
  const pages = Math.ceil(count  / PAGE) || 1;

  const load = async (newOffset=0) => {
    const { data } = await api.get("teams/", {
      params: {
        project:  projectId,
        ordering: "-created_at",
        limit:    PAGE,
        offset:   newOffset
      }
    });
    setTeams(unwrap(data));         // если pagination выкл.
    setCount(data.count ?? data.length);    // DRF включает .count
    setOffset(newOffset);
  };

  useEffect(() => { load(0); }, [projectId]);   // eslint-disable-line

  /* удалить команду */
  const remove = async (id) => {
    if (!window.confirm("Удалить эту команду?")) return;
    await api.delete(`teams/${id}/`);
    // перезагружаем текущую страницу
    load(offset >= count - 1 ? Math.max(0, offset - PAGE) : offset);
  };

  if (!teams.length)
    return <p className="text-sm text-gray-500">Команд пока нет.</p>;

  return (
    <div className="space-y-2">
      {/* таблица */}
      <table className="min-w-full text-left border rounded">
        <thead className="bg-gray-100 text-sm">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Студенты</th>
            <th className="px-3 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {teams.map(t => (
            <tr key={t.id} className="border-t align-top">
              <td className="px-3 py-1 whitespace-nowrap">{t.id}</td>
              <td className="px-3 py-1">
                <ul className="list-disc pl-5">
                  {t.students.map(s => <li key={s.id}>{s.name}</li>)}
                </ul>
              </td>
              <td className="px-3 py-1">
                <button onClick={() => remove(t.id)}
                        className="text-red-500 text-lg leading-none">✖</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* пагинация */}
      <div className="flex items-center justify-end gap-3 text-sm">
        <button
          disabled={offset === 0}
          onClick={() => load(offset - PAGE)}
          className="px-2 py-1 border rounded disabled:opacity-40"
        >
          ◀
        </button>
        <span>{page} / {pages}</span>
        <button
          disabled={offset + PAGE >= count}
          onClick={() => load(offset + PAGE)}
          className="px-2 py-1 border rounded disabled:opacity-40"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
