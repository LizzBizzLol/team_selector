import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api";

export default function UserCard() {
  const { id } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.get(`curators/${id}/`).then(({ data }) => setUser(data));
  }, [id]);

  if (!user) return <p className="mt-8 text-center">Загрузка…</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 border rounded-xl shadow space-y-4">
      <Link to="/admin?tab=curators" className="text-blue-600 hover:underline">
        ← Кураторы
      </Link>
      
      <h1 className="text-2xl font-semibold">{user.name}</h1>
      <span className="text-xs uppercase tracking-wide text-gray-400">
        Куратор
      </span>
      <p className="text-gray-500">{user.email}</p>
    </div>
  );
}