import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api";
import useSorter from "../hooks/useSorter";
import { unwrap } from '../utils/unwrap';

export default function CuratorList() {
  const [curators, setCurators] = useState([]);
  const { sort, sorted, toggle } = useSorter("name");
  const location = useLocation();

  useEffect(() => {
    api.get("curators/")
       .then(({ data }) => setCurators(unwrap(data)))
       .catch(console.error);
  }, []);

  if (!curators.length) return <p>Кураторов пока нет.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left border rounded-xl overflow-hidden">
        <thead className="bg-gray-100 text-sm select-none">
          <tr>
            <th onClick={() => toggle("name")}           className="px-4 py-2 cursor-pointer">
              Имя&nbsp;{sort.key==="name" && (sort.dir==="asc"?"▲":"▼")}
            </th>
            <th onClick={() => toggle("email")}          className="px-4 py-2 cursor-pointer">
              Email&nbsp;{sort.key==="email" && (sort.dir==="asc"?"▲":"▼")}
            </th>
            <th onClick={() => toggle("projects_count")} className="px-4 py-2 cursor-pointer w-32">
              Проектов&nbsp;{sort.key==="projects_count" && (sort.dir==="asc"?"▲":"▼")}
            </th>
          </tr>
        </thead>

        <tbody>
          {sorted(curators).map(c => (
            <tr key={c.id} className="border-t">
              <td className="px-4 py-2">
                <Link to={`/user/${c.id}`}
                  state={{ from: location.pathname + location.search }}
                  className="text-blue-600 hover:underline">
                  {c.name}
                </Link>
              </td>
              <td className="px-4 py-2">{c.email}</td>
              <td className="px-4 py-2">{c.projects_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
