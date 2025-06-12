import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import BackButton from "../components/BackButton";
import api from "../api";
import { level01to05 } from "../utils/level01to05";
import { Link } from "react-router-dom";

export default function StudentCard() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    api.get(`students/${id}/`).then(({ data }) => setStudent(data));
  }, [id]);

  if (!student) return <p className="text-center mt-8">Загрузка…</p>;

  return (
    <main className="pb-10">
      <div className="max-w-xl mx-auto mt-10 p-6 border rounded-xl shadow space-y-4">
        <BackButton fallback="/admin?tab=students" />
        <h1 className="text-2xl font-semibold">{student.name}</h1>
        <p className="text-gray-500">{student.email}</p>

        <h2 className="font-medium mt-4">Навыки</h2>
        {Array.isArray(student.skills) && student.skills.length > 0 ? (
          <table className="min-w-full text-left border rounded text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2">Навык</th>
                <th className="px-3 py-2">Уровень</th>
              </tr>
            </thead>
            <tbody>
              {student.skills.map((s) => (
                <tr key={s.skill_id}>
                  <td className="px-3 py-2">
                    <Link 
                      className="text-blue-600 hover:underline" 
                      to={`/skill/${s.skill_id}`}
                    >
                      {s.skill_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{level01to05(s.level)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">Навыки отсутствуют</p>
        )}
      </div>
    </main>
  );
}
