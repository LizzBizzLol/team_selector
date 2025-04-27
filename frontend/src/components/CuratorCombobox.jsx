import { useState, useEffect } from "react";
import { Combobox } from "@headlessui/react";
import api from "../api";

export default function UserCombobox({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      // теперь ищем по реальному API /curators/
      const { data } = await api.get("curators/", {
        params: { search: query }
      });
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
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3" />

        {users.length > 0 && (
          <Combobox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white shadow ring-1 ring-black/5">
            {users.map((u) => (
              <Combobox.Option key={u.id} value={u}>
                {({ active }) => (
                  <div className={`px-4 py-2 ${active ? "bg-blue-600 text-white" : "text-gray-900"}`}>
                    {u.name} <span className="text-xs text-gray-400">({u.email})</span>
                  </div>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        )}
        {query && users.length === 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white py-2 px-3 text-gray-500 ring-1 ring-black/10 rounded">
            Нет совпадений
          </div>
        )}
      </div>
    </Combobox>
  );
}