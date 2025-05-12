import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import BackButton from "../components/BackButton";
import api from "../api";
import { unwrap } from '../utils/unwrap';
export default function StudentCard() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    api.get(`students/${id}/`).then(({ data }) => setStudent(unwrap(data)));
  }, [id]);

  if (!student) return <p className="text-center mt-8">Загрузка…</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 border rounded-xl shadow space-y-4">
      <BackButton fallback="/admin?tab=students" />
      <h1 className="text-2xl font-semibold">{student.name}</h1>
      <p className="text-gray-500">{student.email}</p>

      <h2 className="font-medium mt-4">Навыки</h2>
      {Array.isArray(student.skills) && student.skills.length > 0 ? (
        <ul className="list-disc pl-6 space-y-1">
          {student.skills.map((s) => (
            <li key={s.skill_name}>
              <span className="font-medium">{s.skill_name}</span> — уровень{" "}{s.level}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">Навыки отсутствуют</p>
      )}
    </div>
  );
}
