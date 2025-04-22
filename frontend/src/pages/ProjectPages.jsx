import React, { useState, useEffect } from "react";
import SkillCombobox from "../components/SkillCombobox";
import axios from "axios";

/* -------------------------------------------------------------------
   CreateProjectPage – форма создания проекта
------------------------------------------------------------------- */
export const CreateProjectPage = () => {
    
  const [title, setTitle] = useState("");
  const [curator, setCurator] = useState("");
  const [requirements, setRequirements] = useState([{ skill: "", level: "" }]);
  const [participants, setParticipants] = useState("");
  const [studentsFile, setStudentsFile] = useState(null);
  const [status, setStatus] = useState("");

  const addRequirement = () => setRequirements([...requirements, { skill: "", level: "" }]);
  const updateRequirement = (idx, field, value) => {
    const copy = [...requirements];
    copy[idx][field] = value;
    setRequirements(copy);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Отправка…");
    try {
      const { data } = await axios.post("/api/projects/", { title, description: curator });
      const id = data.id;
      await Promise.all(
        requirements.map((r) =>
          r.skill ? axios.post("/api/requirements/", { project: id, skill: r.skill, level_required: +r.level || 0 }) : null
        )
      );
      if (studentsFile) {
        const json = JSON.parse(await studentsFile.text());
        await axios.post(`/api/projects/${id}/import_skills/`, json, { headers: { "Content-Type": "application/json" } });
      }
      setStatus("✅ Проект создан");
      setTitle(""); setCurator(""); setRequirements([{ skill: "", level: "" }]); setParticipants(""); setStudentsFile(null);
    } catch (err) {
      setStatus("Ошибка: " + (err.response?.data || err.message));
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 border border-gray-300 rounded-xl shadow space-y-8">
      <h1 className="text-2xl font-semibold text-center">Создание проекта</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* название */}
        <div>
          <label className="block mb-1 font-medium">Название проекта</label>
          <input className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        {/* куратор */}
        <div>
          <label className="block mb-1 font-medium">Куратор</label>
          <input className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500" value={curator} onChange={(e) => setCurator(e.target.value)} />
        </div>

        {/* требования */}
        <div>
          <label className="block mb-2 font-medium">Требования</label>
          {requirements.map((r, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
                {/* поиск навыка */}
                <SkillCombobox value={r.skill} onChange={(val) => updateRequirement(idx, "skill", val)}/>
                {/* уровень 1‑5 */}
                <input type="number" min="1" max="5" step="1" className="border w-28 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="1‑5" value={r.level} onChange={(e) => updateRequirement(idx, "level", e.target.value)}/>
            </div>
          ))}
          <button type="button" onClick={addRequirement} className="px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">+ Добавить</button>
        </div>

        {/* участники */}
        <div>
          <label className="block mb-1 font-medium">Количество участников</label>
          <input type="number" min="1" className="border w-40 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500" value={participants} onChange={(e) => setParticipants(e.target.value)} />
        </div>

        {/* файл */}
        <div>
          <label className="block mb-1 font-medium">JSON‑файл матрицы студентов</label>
          <input type="file" accept=".json" onChange={(e) => setStudentsFile(e.target.files[0])} />
        </div>

        <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Создать проект</button>
        {status && <p className="text-sm">{status}</p>}
      </form>
    </div>
  );
};

/* -------------------------------------------------------------------
   ProjectCard – карточка проекта
------------------------------------------------------------------- */
export const ProjectCard = ({ projectId }) => {
  const [project, setProject] = useState(null);
  const [reqs, setReqs] = useState([]);
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState("");
  const [curator, setCurator] = useState("");

  const fetchData = async () => {
    const p = await axios.get(`/api/projects/${projectId}/`);
    setProject(p.data); setTitle(p.data.title); setCurator(p.data.description || "");
    const r = await axios.get(`/api/requirements/?project=${projectId}`); setReqs(r.data);
  };
  useEffect(() => { fetchData(); }, [projectId]);

  const save = async () => {
    await axios.patch(`/api/projects/${projectId}/`, { title, description: curator });
    await Promise.all(reqs.map((r) => axios.patch(`/api/requirements/${r.id}/`, r)));
    setEdit(false); fetchData();
  };
  const ch = (i, f, v) => { const c=[...reqs]; c[i][f]=v; setReqs(c); };

  if (!project) return <p className="text-center mt-8">Загрузка…</p>;

  return (
    <div className="max-w-3xl mx-auto mt-12 p-8 border border-gray-300 rounded-xl shadow space-y-6">
      {/* заголовок + кнопка */}
      <div className="flex justify-between items-center">
        {edit ? (
          <input className="border flex-1 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 mr-4" value={title} onChange={(e) => setTitle(e.target.value)} />
        ) : (
          <h2 className="text-2xl font-semibold mr-4">{project.title}</h2>
        )}
        <button onClick={() => (edit ? save() : setEdit(true))} className="px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
          {edit ? "Сохранить" : "Редактировать"}
        </button>
      </div>

      {/* куратор */}
      <div>
        <label className="block mb-1 font-medium">Куратор</label>
        {edit ? (
          <input className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500" value={curator} onChange={(e) => setCurator(e.target.value)} />
        ) : (
          <p>{curator}</p>
        )}
      </div>

      {/* требования */}
      <div>
        <label className="block mb-2 font-medium">Требования</label>
        {edit ? (
          reqs.map((r,i)=>(
            <div key={r.id} className="flex gap-2 mb-2">
              <input className="border flex-1 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500" value={r.skill} onChange={(e)=>ch(i,"skill",e.target.value)} />
              <input className="border w-32 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500" value={r.level_required} onChange={(e)=>ch(i,"level_required",e.target.value)} />
            </div>
          ))
        ) : (
          <ul className="list-disc pl-6 space-y-1">{reqs.map((r)=>(<li key={r.id}>{r.skill} – уровень {r.level_required}</li>))}</ul>
        )}
      </div>
    </div>
  );
};
