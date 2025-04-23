import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function ProjectListPage() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.get("projects/").then(({ data }) => setProjects(data));
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((p) => (
        <Link key={p.id} to={`/project/${p.id}`}
              className="border rounded-xl p-4 shadow hover:shadow-lg transition">
          <h3 className="font-semibold mb-2">{p.title}</h3>
          <p className="text-sm text-gray-500 mb-4">
            Куратор: {p.curator_name || "—"}
          </p>
          <p className="text-xs text-gray-400">
            Участники: {p.min_participants}–{p.max_participants}
          </p>
        </Link>
      ))}
    </div>
  );
}
