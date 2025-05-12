import { useState, useEffect, useRef } from "react";
import { Combobox } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import api from '../api';
import { unwrap } from '../utils/unwrap';


export default function SkillCombobox({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState([]);
  const [dropUp, setDropUp] = useState(false);
  const inputRef = useRef(null);

  // подгружаем варианты
  useEffect(() => {
    const load = async () => {
      const { data } = await api.get("skills/", { params: { search: query } });
      // если включена пагинация → берём data.results
      const list = unwrap(data);
      // сортировка только если это действительно массив объектов
      list.sort((a, b) => a.name.localeCompare(b.name));
      setSkills(list);
    }; 
    const t = setTimeout(load, 300);      // debounce 300 мс
    return () => clearTimeout(t);
  }, [query]);

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative">
        <Combobox.Input
          ref={inputRef}
          className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          displayValue={(v) => v?.name || ""}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            // ─ вычисляем, хватит ли места снизу
            const rect = inputRef.current?.getBoundingClientRect();
            if (rect) {
              const spaceBelow = window.innerHeight - rect.bottom;
              setDropUp(spaceBelow < 200);  // 200 px ≈ 4-5 пунктов
            }
          }}
          placeholder="Навык"
        />
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
        </Combobox.Button>

        {skills.length > 0 && (
          <Combobox.Options
            className={`
              absolute z-10 w-full
              ${dropUp ? "bottom-full mb-1" : "mt-1"}
              max-h-48 overflow-y-auto
              rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5
            `}
          >
            {skills.map((s) => (
              <Combobox.Option
                key={s.id}
                value={s}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900'}`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={selected ? "font-medium" : "font-normal"}>
                      {s.name}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <CheckIcon className="h-5 w-5" />
                      </span>
                    )}
                  </>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        )}
        {query && skills.length === 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white py-2 px-3 text-gray-500">
            Нет совпадений
          </div>
        )}
      </div>
    </Combobox>
  );
}