import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api";

export default function UserCard() {
  const { id } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.get(`users/${id}/`).then(({ data }) => setUser(data));
  }, [id]);

  if (!user) return <p className="mt-8 text-center">Загрузка…</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 border rounded-xl shadow space-y-4">
      <Link to="/projects" className="text-blue-600 hover:underline">
        ← Все проекты
      </Link>
      
      <h1 className="text-2xl font-semibold">{user.name}</h1>
      <span className="text-xs uppercase tracking-wide text-gray-400">
        {user.role === "curator" ? "Куратор" : "Студент"}
      </span>
      <p className="text-gray-500">{user.email}</p>

      <h2 className="font-medium mt-4">Навыки</h2>
      <ul className="list-disc pl-6">
        {user.skills.map(s => (
          <li key={s.skill_name}>{s.skill_name} — {s.level}</li>
        ))}
      </ul>
    </div>
  );
}