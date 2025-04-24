import { useState, useEffect } from "react";
import { Combobox } from "@headlessui/react";
import api from "../api";

export default function UserCombobox({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await api.get("users/", { params: { search: query, role: "curator" }});
      setUsers(data);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative">
        <Combobox.Input
          className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          displayValue={(v) => v?.name || ""}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Выберите куратора"
        />
        {users.length > 0 && (
          <Combobox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto
                                         rounded-md bg-white shadow ring-1 ring-black/5">
            {users.map((u) => (
              <Combobox.Option key={u.id} value={u}>
                {({ active }) => (
                  <div className={`px-4 py-2 ${active ? "bg-blue-600 text-white" : ""}`}>
                    {u.name} <span className="text-xs text-gray-400">({u.email})</span>
                  </div>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        )}
      </div>
    </Combobox>
  );
}
