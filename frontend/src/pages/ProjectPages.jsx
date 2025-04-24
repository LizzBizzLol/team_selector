import React, { useState, useEffect } from "react";
import SkillCombobox from "../components/SkillCombobox";
import UserCombobox from "../components/UserCombobox";
import { Link } from "react-router-dom";
import api from "../api";

/* -------------------------------------------------------------------
   CreateProjectPage – форма создания проекта
------------------------------------------------------------------- */
export const CreateProjectPage = () => {
  const [title, setTitle] = useState("");
  const [curator, setCurator] = useState(null);
  const [requirements, setRequirements] = useState([{ skill: null, level: "" }]);
  const [minPart, setMinPart] = useState(2);
  const [maxPart, setMaxPart] = useState(5);
  const [jsonFile, setJsonFile] = useState(null);
  const [errors, setErrors]  = useState({});
  const [status, setStatus]  = useState("");

  /* helpers */
  const addRequirement = () =>
    setRequirements([...requirements, { skill: null, level: "" }]);

  const updateRequirement = (idx, field, val) => {
    const copy = [...requirements];
    copy[idx][field] = val;
    setRequirements(copy);
  };

  const removeRequirement = (idx) =>
    setRequirements((reqs) => reqs.filter((_, i) => i !== idx));

  /* submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setStatus("Отправка…");

    let projectId = null;

    try {
      /* 1) проект */
      const { data } = await api.post("projects/", {
        title,
        curator: curator?.id ?? null,
        min_participants: minPart,
        max_participants: maxPart,
      });
      projectId = data.id;

      /* 2) требования */
      await Promise.all(
        requirements
          .filter((r) => r.skill)
          .map((r) =>
            api.post(`projects/${projectId}/add_requirement/`, {
              skill: r.skill.id,
              level: +r.level || 1,
            })
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

      /* ------- УСПЕХ ---------------- */
      setErrors({});
      setStatus("✅ Проект создан");
      /* очистка */
      setTitle("");
      setCurator(null);
      setRequirements([{ skill: null, level: "" }]);
      setMinPart(2);
      setMaxPart(5);
      setJsonFile(null);
    } catch (err) {
      /* если что-то упало после создания проекта — удалим его */
      if (err.response?.config?.url?.startsWith("projects/") &&
          err.response?.config?.url?.includes("add_requirement")) {
        await api.delete(`projects/${projectId}/`);
      }

      if (err.response?.data && typeof err.response.data === "object") {
        const msg =
          err.response.data.detail ||
          Object.values(err.response.data).flat().join(" ");
        setErrors(err.response.data);
        setStatus(msg);
      } else {
        setErrors({ save: [err.message] });
        setStatus("Ошибка: " + err.message);
      }
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
          {errors.title && <p className="text-red-500 text-sm">{errors.title[0]}</p>}
        </div>

        {/* куратор */}
        <div>
          <label className="block mb-1 font-medium">Куратор</label>
          <UserCombobox value={curator} onChange={setCurator} />
          {errors.curator && <p className="text-red-500 text-sm">{errors.curator[0]}</p>}
        </div>

        {/* min/max */}
        <div className="flex gap-4">
          <div>
            <label className="block mb-1 font-medium">Мин. участников</label>
            <input
              type="number"
              min="2"
              max="5"
              className="border w-24 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={minPart}
              onChange={(e) => setMinPart(Math.max(2, Math.min(5, e.target.value)))}
            />
            {errors.min_participants && (
              <p className="text-red-500 text-sm">{errors.min_participants[0]}</p>
            )}
          </div>
          <div>
            <label className="block mb-1 font-medium">Макс. участников</label>
            <input
              type="number"
              min="2"
              max="5"
              className="border w-24 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={maxPart}
              onChange={(e) => setMaxPart(Math.max(2, Math.min(5, e.target.value)))}
            />
            {errors.max_participants && (
              <p className="text-red-500 text-sm">{errors.max_participants[0]}</p>
            )}
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
                type="number"
                min="1"
                max="5"
                step="1"
                className="border w-24 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={r.level}
                onChange={(e) =>
                  updateRequirement(idx, "level", Math.max(1, Math.min(5, e.target.value)))
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
          <label className="block mb-1 font-medium">JSON-файл с требованиями проекта</label>
          <input type="file" accept=".json" onChange={(e) => setJsonFile(e.target.files[0])} />
        </div>

        <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
          Создать проект
        </button>
        {status && (
          <p className={`text-sm mt-2 ${
              status.startsWith("✅") ? "text-green-600" : "text-red-600"
          }`}>
            {status}
          </p>
        )}
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
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [curator, setCurator] = useState(null);

  /* загрузка проекта + требований */
  const fetchData = async () => {
    const p = await api.get(`projects/${projectId}/`);
    setProject(p.data);
    setTitle(p.data.title);
    setReqs(
      p.data.requirements.map((x) => ({
        id: x.id,
        skill: x.skill,
        skill_name: x.skill_name,
        level: x.level,
      }))
    );
    setCurator(p.data.curator? { id: p.data.curator, name: p.data.curator_name } : null);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /* сохранение */
  const save = async () => {
    try {
      await api.patch(`projects/${projectId}/`, {
        title,
        curator: curator?.id ?? null,
      });
        
      /* добавляем / обновляем актуальные */
      await Promise.all(
        reqs.filter(r => r.skill)          // пропускаем пустые строки
            .map(r =>
          api.post(`projects/${projectId}/add_requirement/`, {
            skill: r.skill,
            level: r.level,
          })
        )
      );
      setErrors({});
      setStatus("✔️ Сохранено"); 
      setEdit(false);
      fetchData();
    } catch (err) {
      if (err.response?.data && typeof err.response.data === "object") {
        const msg =
          err.response.data.detail ||
          Object.values(err.response.data).flat().join(" ");
        setErrors({ save: [msg] });
        setStatus("Ошибка сохранения");
      } else {
        setErrors({ save: [err.message] });
        setStatus("Ошибка сохранения");
      }
    }
  };

  if (!project) return <p className="text-center mt-8">Загрузка…</p>;

  /* JSX */
  return (
    <div className="max-w-3xl mx-auto mt-12 p-8 border border-gray-300 rounded-xl shadow space-y-6">
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
        <button
          onClick={() => {
            if (!window.confirm("Удалить проект?")) return;
            api.delete(`projects/${projectId}/`);
            window.location.href = "/projects";
          }}
          className="px-3 py-1 border border-red-600 text-red-600 rounded hover:bg-red-50"
        >
          Удалить
        </button>
      </div>

      {/* Название */}
      {edit ? (
        <input
          className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      ) : (
        <h2 className="text-2xl font-semibold">{project.title}</h2>
      )}

      {/* Куратор */}
      <div>
        <label className="block mb-1 font-medium">Куратор</label>
        {edit ? (
          <UserCombobox value={curator} onChange={setCurator} />
        ) : (
          <p>{project.curator_name || "—"}</p>
        )}
      </div>

      {/* Требования */}
      <div>
        <label className="block mb-2 font-medium">Требования</label>
        {edit ? (
          <>
            {reqs.map((r, i) => (
              <div key={r.id || i} className="flex gap-2 mb-2 items-center">
                <SkillCombobox
                  value={{ id: r.skill, name: r.skill_name }}
                  onChange={(val) => {
                    const upd = [...reqs];
                    upd[i] = { ...upd[i], skill: val.id, skill_name: val.name };
                    setReqs(upd);
                  }}
                />
                <input
                  type="number"
                  min="1"
                  max="5"
                  className="border w-24 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={r.level}
                  onChange={(e) => {
                    const upd = [...reqs];
                    upd[i].level = e.target.value;
                    setReqs(upd);
                  }}
                />
                <button
                  type="button"
                  disabled={reqs.length === 1}
                  onClick={() => {
                    if (reqs.length === 1) return;
                    setReqs(reqs.filter((_, idx) => idx !== i));
                    // удаляем связь сразу
                    if (r.id) {
                      api.post(`projects/${projectId}/remove_requirement/`, { req_id: r.id });
                    }
                  }}
                  className={`px-2 ${reqs.length === 1 ? "opacity-30" : "text-red-500"}`}
                >
                  ✖
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setReqs([...reqs, { skill: null, skill_name: "", level: 1 }])
              }
              className="mt-1 px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
            >
              + Добавить требование
            </button>
          </>
        ) : (
          <ul className="list-disc pl-6 space-y-1">
            {reqs.map((r) => (
              <li key={r.id}>{r.skill_name} — уровень {r.level}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Сообщения об ошибке */}
      {/* сначала статус, потом детали */}
      {status && (
        <p className={`text-sm mt-4 ${
            status.startsWith("✔️") ? "text-green-600"
          : "text-red-600"
        }`}>
          {status}
        </p>
      )}
      {errors.save && (
        <p className="text-red-600 text-sm">{errors.save[0]}</p>
      )}
    </div>
  );
};
