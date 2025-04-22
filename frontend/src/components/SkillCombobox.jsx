import { useState, useEffect } from "react";
import { Combobox } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import axios from "axios";

export default function SkillCombobox({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState([]);

  // подгружаем варианты
  useEffect(() => {
    const load = async () => {
      const { data } = await axios.get("/api/skills/", {
        params: { search: query }
      });
      setSkills(data);
    };
    const t = setTimeout(load, 300);      // debounce 300 мс
    return () => clearTimeout(t);
  }, [query]);

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative">
        <Combobox.Input
          className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          displayValue={(v) => v}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Навык"
        />
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
        </Combobox.Button>

        {skills.length > 0 && (
          <Combobox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md
                                        bg-white py-1 text-base shadow-lg ring-1 ring-black/5">
            {skills.map((s) => (
              <Combobox.Option
                key={s.id}
                value={s.name}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-blue-600 text-white' : 'text-gray-900'
                  }`
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
      </div>
    </Combobox>
  );
}
