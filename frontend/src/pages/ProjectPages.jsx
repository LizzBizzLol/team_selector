import React, { useState, useEffect } from "react";
import SkillCombobox from "../components/SkillCombobox";
import UserCombobox from "../components/CuratorCombobox";
import { Link } from "react-router-dom";
import api from "../api";

/* -------------------------------------------------------------------
   CreateProjectPage – форма создания проекта
------------------------------------------------------------------- */
export default function CreateProjectPage() {
  const [title, setTitle] = useState("");
  const [curator, setCurator] = useState(null);
  const [requirements, setRequirements] = useState([{ skill: null, level: 1 }]);
  const [minPart, setMinPart] = useState(1);
  const [maxPart, setMaxPart] = useState(1);
  const [totalStudents, setTotalStudents] = useState(1);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");


  // Загрузка общего числа студентов
  useEffect(() => {
    api.get("students/")
       .then(({ data }) => {
         const count = data.length || 1;
         setTotalStudents(count);
         setMaxPart(count);
       })
       .catch(console.error);
  }, []);

    // Обработка файла JSON для предзаполнения формы
    const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
  
        // Заголовок
        if (data.title) setTitle(data.title);
  
        // сначала пробуем по ID
        if (data.curator?.id) {
          setCurator({ id: data.curator.id, name: data.curator.name });
        }
        // если ID не задан, ищем в списке кураторов по точному имени (ignore case)
        else if (data.curator?.name) {
          try {
            const { data: curList } = await api.get("curators/", {
              params: { search: data.curator.name }
            });
          const found = curList.find(
            (c) => c.name.toLowerCase() === data.curator.name.toLowerCase()
          );
          if (found) setCurator({ id: found.id, name: found.name });
          else setCurator(null);
          } catch {
            setCurator(null);
          }
        } else {
          setCurator(null);
        }  
  
        // Мин/макс участники с валидацией
        let min = Number(data.min_participants) || 1;
        let max = Number(data.max_participants) || totalStudents;
        min = Math.max(1, Math.min(min, totalStudents));
        max = Math.max(1, Math.min(max, totalStudents));
        if (min > max) max = min;
        setMinPart(min);
        setMaxPart(max);
  
        // Требования: поиск навыков по имени и клэмп уровня
        if (Array.isArray(data.requirements)) {
          const reqsArr = [];
          for (const item of data.requirements) {
            if (!item.skill) continue;
            let lvl = Number(item.level);
            if (isNaN(lvl)) lvl = 1;
            lvl = Math.max(1, Math.min(5, lvl));
            try {
              const res = await api.get("skills/", { params: { search: item.skill } });
              const found = res.data.find(
                (s) => s.name.toLowerCase() === item.skill.toLowerCase()
              );
              if (found) reqsArr.push({ skill: found, level: lvl });
            } catch {
              // пропускаем при ошибке
            }
          }
          if (reqsArr.length) setRequirements(reqsArr);
        }
      } catch (err) {
        console.error("Error parsing JSON:", err);
        window.alert(
          "Не удалось прочитать JSON-файл. Проверьте, что он соответствует формату:\n" +
          "{ title, curator: { name }, min_participants, max_participants, requirements: [ { skill, level }, … ] }"
        );  
      }
    };
  
    // Добавление нового требования вручную
    const addRequirement = () =>
      setRequirements([...requirements, { skill: null, level: 1 }]);
  
    const updateRequirement = (idx, field, val) => {
      const arr = [...requirements];
      arr[idx][field] = val;
      setRequirements(arr);
    };
  
    const removeRequirement = (idx) =>
      setRequirements((reqs) => reqs.filter((_, i) => i !== idx));
  
    // Отправка формы создания проекта
    const handleSubmit = async (e) => {
      e.preventDefault();
      setErrors({});
      setStatus("Отправка…");
  
      let projectId = null;
      try {
        // 1) Создание проекта
        const { data } = await api.post("projects/", {
          title,
          curator_id: curator?.id ?? null,
          min_participants: minPart,
          max_participants: maxPart,
        });
        projectId = data.id;
  
        // 2) Сохранение требований
        await Promise.all(
          requirements
            .filter((r) => r.skill)
            .map((r) =>
              api.post(`projects/${projectId}/add_requirement/`, {
                skill: r.skill.id,
                level: r.level,
              })
            )
        );
  
        setStatus("✅ Проект создан");
        // сброс формы
        setTitle("");
        setCurator(null);
        setRequirements([{ skill: null, level: 1 }]);
        setMinPart(1);
        setMaxPart(totalStudents);
      } catch (err) {
        // при ошибке удаления созданного проекта не требуется, т.к. JSON-импорт убран
        console.error("CreateProject error:", err);
        if (err.response?.data) {
          setErrors(err.response.data);
          setStatus("Ошибка: " + JSON.stringify(err.response.data));
        } else {
          setStatus("Ошибка при создании проекта: " + err.message);
        }
      }
    };

  /* JSX */
  return (
    <div
      className="max-w-2xl mx-auto mt-10 p-8 border border-gray-300 rounded-xl shadow space-y-8"
    >
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
              min={1}
              max={totalStudents}
              className="border w-24 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={minPart}
              onChange={(e) => {
                let v = Number(e.target.value);
                v = Math.max(1, Math.min(totalStudents, v));
                setMinPart(v);
                if (v > maxPart) setMaxPart(v);
              }}
              required
            />
            {errors.min_participants && (
              <p className="text-red-500 text-sm">{errors.min_participants[0]}</p>
            )}
          </div>
          <div>
            <label className="block mb-1 font-medium">Макс. участников</label>
            <input
              type="number"
              min={1}
              max={totalStudents}
              className="border w-24 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={maxPart}
              onChange={(e) => {
                let v = Number(e.target.value);
                v = Math.max(1, Math.min(totalStudents, v));
                setMaxPart(v);
                if (v < minPart) setMinPart(v);
              }}
              required
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
                  updateRequirement(
                    idx,
                    "level",
                    Math.max(1, Math.min(5, Number(e.target.value)))
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

        {/* JSON-файл */}
        <div>
          <label className="block mb-1 font-medium">JSON-файл с данными о проекте</label>
          <input type="file" accept=".json" onChange={handleFileUpload} />
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
    const { data } = await api.get(`projects/${projectId}/`);
    // Сохраняем основную модель
    setProject(data);
    // Заголовок
    setTitle(data.title);
    // Требования из skill_links
  setReqs(
    (data.skill_links || []).map(x => ({
      id:         x.id, 
      skill:      x.skill,
      skill_name: x.skill_name,
      level:      x.level,
    }))
  );
  // Куратор — из вложенного объекта data.curator
  if (data.curator) {
    setCurator({ id: data.curator.id, name: data.curator.name });
  } else {
    setCurator(null);
  }
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
        curator_id: curator?.id ?? null,
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
          <Link to={`/user/${project.curator.id}`} className="text-blue-600 hover:underline">
          {project.curator_name || "—"}
        </Link>
        )}
      </div>

      {/* Требования */}
      <div>
        <label className="block mb-2 font-medium">Требования</label>
        {edit ? (
          <>
            {reqs.map((r, i) => (
              <div key={r.skill || i} className="flex gap-2 mb-2 items-center">
                <SkillCombobox
                  value={{ id: r.skill, name: r.skill_name }}
                  onChange={(val) => {
                    // val может быть null, если поле очищено
                    if (!val) return;
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
                    if (r.skill) {
                      api.post(`projects/${projectId}/remove_requirement/`, { skill_id: r.skill })
                      .then(() => {
                      // обновляем локальные reqs, отфильтровав удалённый:
                        setReqs((prev) =>
                        prev.filter(item => item.skill !== r.skill)
                        );
                      });
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
            {[...reqs]
              .sort((a, b) => a.skill_name.localeCompare(b.skill_name))
              .map((r) => (
                <li key={r.skill}>
                  {r.skill_name} — уровень {r.level}
                </li>
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
      {errors && Object.entries(errors).map(([field, msgs]) => (
        <p key={field} className="text-red-500 text-sm">
          {field}: {Array.isArray(msgs)? msgs.join(", "): msgs}
        </p>
      ))} 
    </div>
  );
};
