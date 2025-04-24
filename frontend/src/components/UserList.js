import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function UsersList() {
    const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get("users/")
       .then(({ data }) => setUsers(data))
       .catch(console.error);
  }, []);

  return (
    <div>
      <h2>Список пользователей</h2>
      <ul>
        {users.map((u) => (
          <li key={u.id} className="mb-2">
            <strong>
              <Link to={`/user/${u.id}`} className="text-blue-600 hover:underline">
                {u.name}
              </Link>
            </strong>{" "}
            <span className="text-xs text-gray-500">
              ({u.role === "curator" ? "Куратор" : "Студент"})
            </span>

            {u.skills?.length > 0 && (
              <ul className="list-disc pl-6 text-sm">
                {u.skills.map((s) => (
                  <li key={s.skill_name}>
                    {s.skill_name} — {s.level}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
