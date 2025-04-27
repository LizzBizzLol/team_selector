import { Tab } from "@headlessui/react";
import { useSearchParams } from "react-router-dom";
import ProjectList   from "../components/ProjectList";
import CuratorList   from "../components/CuratorList";
import StudentList   from "../components/StudentList";
import SkillList     from "../components/SkillList";

export default function AdminDashboard() {
  const [params] = useSearchParams();
  const defaultIndex = params.get("tab") === "curators" ? 1 :
                      params.get("tab") === "students" ? 2 :
                      params.get("tab") === "skills" ? 3 : 0;
  const tabs = ["Проекты", "Кураторы", "Студенты", "Навыки"];

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">Напарники — админ-панель</h1>

      <Tab.Group defaultIndex={defaultIndex}>
        <Tab.List className="flex gap-2 border-b">
          {tabs.map((t) => (
            <Tab key={t} className={({ selected }) =>
              `px-4 py-2 ${
                selected ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'
              }`
            }>
              {t}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="mt-6">
          <Tab.Panel><ProjectList /></Tab.Panel>
          <Tab.Panel><CuratorList /></Tab.Panel>
          <Tab.Panel><StudentList /></Tab.Panel>
          <Tab.Panel><SkillList /></Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
