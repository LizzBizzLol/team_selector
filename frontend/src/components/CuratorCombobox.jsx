import { useState, useEffect } from "react";
import { Combobox } from "@headlessui/react";
import api from "../api";
import { unwrap } from '../utils/unwrap';
import { useUnsavedPrompt } from '../hooks/useUnsavedPrompt';

export default function UserCombobox({ value, onChange, onDirty }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      // теперь ищем по реальному API /curators/
      const { data } = await api.get("curators/", {
        params: { search: query.trim(), limit: 100 }
      });
      const arr = unwrap(data);
      // если выбранный куратор не попал в первые 100 — добавим
      if (value && !arr.some(u => u.id === value.id)) arr.unshift(value);
      setUsers(arr);
    }, 300);
    return () => clearTimeout(t);
  }, [query, value]);

  return (
    <Combobox value={value} onChange={onChange} by="id">
      <div className="relative">
        <Combobox.Input
          className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          displayValue={(v) => v?.name || ""}
          onChange={(e) => {
            setQuery(e.target.value.trim());
            onDirty(true);
          }}
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
        {query.trim() && users.length === 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white py-2 px-3 text-gray-500 ring-1 ring-black/10 rounded">
            Нет совпадений
          </div>
        )}
      </div>
    </Combobox>
  );
}