import React, { useState, useEffect } from "react";
import SkillCombobox from "../components/SkillCombobox";
import UserCombobox  from "../components/UserCombobox";
import { Link } from "react-router-dom";
import api from "../api";

/* -------------------------------------------------------------------
   CreateProjectPage – форма создания проекта
------------------------------------------------------------------- */
export const CreateProjectPage = () => {
  const [title,        setTitle]        = useState("");
  const [curator,      setCurator]      = useState(null);
  const [requirements, setRequirements] = useState([{ skill: "", level: "" }]);
  const [minPart,      setMinPart]      = useState(2);
  const [maxPart,      setMaxPart]      = useState(5);
  const [jsonFile,     setJsonFile]     = useState(null);
  const [status,       setStatus]       = useState("");

  /* helpers */
  const addRequirement = () =>
    setRequirements([...requirements, { skill: "", level: "" }]);

  const updateRequirement = (idx, field, val) => {
    const copy = [...requirements];
    copy[idx][field] = val;
    setRequirements(copy);
  };

  const removeRequirement = (idx) =>
    setRequirements(reqs => reqs.filter((_, i) => i !== idx));

  /* submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Отправка…");

    try {
      /* 1) проект */
      const { data } = await api.post("projects/", {
        title,
        description: "",
        curator: curator?.id ?? null,
        min_participants: minPart,
        max_participants: maxPart,
      });
      const projectId = data.id;

      /* 2) требования */
      await Promise.all(
        requirements.map(r =>
          r.skill
            ? api.post("requirements/", {
                project: projectId,
                skill: r.skill,
                level_required: +r.level || 0,
              })
            : null
        )
      );

      /* 3) JSON */
      if (jsonFile) {
        const json = JSON.parse(await jsonFile.text());
        await api.post(
          `projects/${projectId}/import_skills/`,
          json,
          { headers: { "Content-Type": "application/json" } }
        );
      }

      setStatus("✅ Проект создан");
      /* очистка */
      setTitle("");
      setCurator(null);
      setRequirements([{ skill: "", level: "" }]);
      setMinPart(2); setMaxPart(5);
      setJsonFile(null);
    } catch (err) {
      setStatus("Ошибка: " + (err.response?.data || err.message));
    }
  };

  /* JSX */
  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 border border-gray-300 rounded-xl shadow space-y-8">
      <h1 className="text-2xl font-semibold text-center">Создание проекта</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* название */}
        <div>
          <label className="block mb-1 font-medium">Название проекта</label>
          <input
            className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* куратор */}
        <div>
          <label className="block mb-1 font-medium">Куратор</label>
          <UserCombobox value={curator} onChange={setCurator} />
        </div>

        {/* min/max */}
        <div className="flex gap-4">
          <div>
            <label className="block mb-1 font-medium">Мин. участников</label>
            <input
              type="number" min="2" max="5"
              className="border w-24 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={minPart}
              onChange={(e) =>
                setMinPart(Math.max(2, Math.min(5, e.target.value)))
              }
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Макс. участников</label>
            <input
              type="number" min="2" max="5"
              className="border w-24 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={maxPart}
              onChange={(e) =>
                setMaxPart(Math.max(2, Math.min(5, e.target.value)))
              }
            />
          </div>
        </div>

        {/* требования */}
        <div>
          <label className="block mb-2 font-medium">Требования</label>
          {requirements.map((r, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-center">
              <SkillCombobox
                value={r.skill}
                onChange={(val) => updateRequirement(idx, "skill", val)}
              />
              <input
                type="number" min="1" max="5" step="1"
                className="border w-24 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={r.level}
                onChange={(e) =>
                  updateRequirement(
                    idx,
                    "level",
                    Math.max(1, Math.min(5, e.target.value))
                  )
                }
              />
              {requirements.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRequirement(idx)}
                  className="text-red-500 px-2"
                >
                  ✖
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addRequirement}
            className="mt-1 px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
          >
            + Добавить
          </button>
        </div>

        {/* JSON */}
        <div>
          <label className="block mb-1 font-medium">
            JSON-файл с требованиями проекта
          </label>
          <input
            type="file" accept=".json"
            onChange={(e) => setJsonFile(e.target.files[0])}
          />
        </div>

        <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
          Создать проект
        </button>

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
  const [reqs,   setReqs]     = useState([]);
  const [edit,   setEdit]     = useState(false);
  const [title,  setTitle]    = useState("");
  const [curator,setCurator]  = useState("");

  const fetchData = async () => {
    const p = await api.get(`projects/${projectId}/`);
    setProject(p.data);
    setTitle(p.data.title);
    setCurator(p.data.description || "");
    const r = await api.get(`requirements/?project=${projectId}`);
    setReqs(r.data);
  };
  useEffect(() => { fetchData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);

  const save = async () => {
    await api.patch(`projects/${projectId}/`, { title, description: curator });
    await Promise.all(reqs.map(r => api.patch(`requirements/${r.id}/`, r)));
    setEdit(false); fetchData();
  };
  const ch = (i,f,v)=>{const c=[...reqs]; c[i][f]=v; setReqs(c);};

  if (!project) return <p className="text-center mt-8">Загрузка…</p>;

  return (
    <div className="max-w-3xl mx-auto mt-12 p-8 border border-gray-300 rounded-xl shadow space-y-6">
      {/* стрелка назад + кнопка edit */}
      <div className="flex justify-between items-center mb-4">
        <Link to="/projects" className="text-blue-600 hover:underline">
          ← Все проекты
        </Link>

        <button
          onClick={() => (edit ? save() : setEdit(true))}
          className="px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
        >
          {edit ? "Сохранить" : "Редактировать"}
        </button>
      </div>

      {/* название */}
      {edit ? (
        <input
          className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      ) : (
        <h2 className="text-2xl font-semibold">{project.title}</h2>
      )}

      {/* куратор */}
      <div>
        <label className="block mb-1 font-medium">Куратор</label>
        {edit ? (
          <input
            className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={curator}
            onChange={(e) => setCurator(e.target.value)}
          />
        ) : (
          <p>
            {" "}
            <Link 
              to={`/user/${project.curator}`} className="text-blue-600 hover:underline"> {project.curator_name || curator} 
            </Link>
          </p>
        )}
      </div>

      {/* требования */}
      <div>
        <label className="block mb-2 font-medium">Требования</label>
        {edit ? (
          reqs.map((r,i)=>(
            <div key={r.id} className="flex gap-2 mb-2">
              <input
                className="border flex-1 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={r.skill}
                onChange={(e)=>ch(i,"skill",e.target.value)}
              />
              <input
                className="border w-28 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={r.level_required}
                onChange={(e)=>ch(i,"level_required",e.target.value)}
              />
            </div>
          ))
        ) : (
          <ul className="list-disc pl-6 space-y-1">
            {reqs.map(r=>(
              <li key={r.id}>
              {r.skill_name} — уровень {r.level_required}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};