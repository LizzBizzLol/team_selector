import React, { useState, useEffect, useRef } from "react";
import SkillCombobox from "../components/SkillCombobox";
import UserCombobox from "../components/CuratorCombobox";
import { Link } from "react-router-dom";
import BackButton from "../components/BackButton"; // именно default-импорт
import api from "../api";
import RequirementsTable from "../components/RequirementsTable";
import { Dialog } from "@headlessui/react";   // остаётся для Team-диалога
import Toast from "../components/Toast";
import humanizeError from "../utils/humanizeError";
import TeamTable from "../components/TeamTable";
import { unwrap } from "../utils/unwrap";
import useUnsavedPrompt from "../hooks/useUnsavedPrompt";

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
  const [status, setStatus] = useState("");   // сообщение «успех / ошибка»
  const [sending, setSending] = useState(false); // прогресс
  const [dirty, setDirty] = useState(false);
  const fileInputRef = useRef(null);
  const [toast, setToast] = useState({ show:false, ok:true, text:"" });

useUnsavedPrompt(dirty);  

  // Загрузка общего числа студентов
  useEffect(() => {
    api.get("students/")
       .then(({ data }) => {
         const count = unwrap(data).length || 1;
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
        let data;
      try {
        data = JSON.parse(text);
      } catch(e) {
        setToast({show:true, ok:false, text:"Файл не JSON: "+e.message});
        return;
      }
      if (!data.title) {
        setToast({show:true, ok:false, text:"В файле нет поля «title»"});
        return;
      }
  
        // Заголовок
        if (data.title) setTitle(data.title);
  
        // сначала пробуем по ID
        if (data.curator?.id) {                 // curator теперь объект {id,name}
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
              const found = unwrap(res.data).find(
                (s) => s.name.toLowerCase() === item.skill.toLowerCase()
              );
              if (found) {
// skill ОБЯЗАТЕЛЬНО объект {id,name}
                reqsArr.push({ skill: {id: found.id, name: found.name}, level: lvl });
                }
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
      setDirty(true);
    };
  
    const removeRequirement = (idx) => {
      setRequirements((reqs) => reqs.filter((_, i) => i !== idx));
      setDirty(true);
    };
  
    // Отправка формы создания проекта
    const handleSubmit = async (e) => {
      e.preventDefault();
      setErrors({});
      setStatus("");
      setSending(true);
  
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
  
        setToast({ show:true, ok:true, text:`Проект «${title}» создан` });
        setSending(false);
        fileInputRef.current.value = "";    // очистили выбор файла
        setDirty(false);
        // сброс формы
        setTitle("");
        setCurator(null);
        setRequirements([{ skill: null, level: 1 }]);
        setMinPart(1);
        setMaxPart(totalStudents);
      } catch (err) {
        setSending(false);
        setToast({ show:true, ok:false, text:humanizeError(err) });   
      }
    };  

  /* JSX */
  return (
    <main className="flex justify-center pt-12 pb-14 bg-gray-50 min-h-screen overflow-auto">
    <form onSubmit={handleSubmit}
  className="w-full max-w-lg sm:max-w-2xl px-6 py-8 mx-auto space-y-6 border rounded-xl shadow bg-white text-xs sm:text-sm md:text-base">
        <h1 className="text-2xl font-semibold text-center mb-6 sticky top-0 bg-white/80 backdrop-blur">
        Создание проекта
      </h1>
        {/* название */}
        <div>
          <label className="block font-medium">Название проекта</label>
          <input
            className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
            required
          />
          {errors.title && <p className="text-red-500 text-sm">{errors.title[0]}</p>}
        </div>

        {/* куратор */}
        <div>
          <label className="block mb-1 font-medium">Куратор</label>
          <UserCombobox value={curator} onChange={setCurator} onDirty={setDirty} />
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
                if (v > maxPart) setMaxPart(v); setDirty(true);
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
                if (v < minPart) setMinPart(v); setDirty(true);
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
                onChange={(val) => {
                  updateRequirement(idx, "skill", val);
                  setDirty(true);
                }}
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
            onClick={() => {
              addRequirement();
              setDirty(true);
            }}
            className="mt-1 px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
          >
            + Добавить
          </button>
        </div>

        {/* JSON-файл */}
        <div>
          <label className="block mb-1 font-medium">JSON-файл с данными о проекте</label>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} />
        </div>
        <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
          {sending ? "Отправка…" : "Создать проект"}
        </button>
        {status && (
          <p className={`text-sm mt-2 ${
              status.startsWith("✅") ? "text-green-600" : "text-red-600"
          }`}>
            {status}
          </p>
        )}
      </form>
      <Toast show={toast.show} ok={toast.ok} text={toast.text} onClose={() => setToast(t => ({ ...t, show:false }))} />
    </main>
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
  const [team, setTeam] = useState(null);       // успешный подбор
  const [matchErr, setMatchErr] = useState(""); // текст ошибки
  const [matching, setMatching] = useState(false);
  const [setToast] = useState({ show:false, ok:true, text:"" });
  const [dirty, setDirty] = useState(false);
  const canSave =
  edit &&               // мы в режиме редактирования 
  dirty &&              // есть изменения
  reqs.some(r => r.skill && r.skill.id);   // хотя бы 1 валидный навык

useUnsavedPrompt(dirty);

  /* загрузка проекта + требований */
  const fetchData = async () => {
    const { data } = await api.get(`projects/${projectId}/`);
    // Сохраняем основную модель
    setProject(data);
    // Заголовок
    setTitle(data.title);
    setDirty(true);
    // Требования из skill_links
  setReqs(
    (data.skill_links || []).map(x => ({
      id:    x.id,
      skill: { id: x.skill, name: x.skill_name },   // объект для Combobox
      level: x.level,
    }))
  );
  // Куратор — из вложенного объекта data.curator
  if (data.curator) {
    setCurator({ id: data.curator.id, name: data.curator.name });
  } else {
    setCurator(null);
    setDirty(true);
  }
  };
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

    /* сохранение ---------------------------------------------------- */
    const save = async () => {
      try {
        /* 1 — PATCH самого проекта */
        await api.patch(`projects/${projectId}/`, {
          title,
          curator_id: curator?.id ?? null,
        });
  /* 2 — валидация: хотя бы один полный элемент */
        const cleaned = reqs.filter(r => r.skill && r.skill.id)
                     .map(r => ({ skill: r.skill.id, level: +r.level }));
        if (!cleaned.length) {
          setToast({ show:true, ok:false, text:"Добавьте хотя бы один навык" });  
          return;
        }
        setDirty(true);

        await api.put(`projects/${projectId}/sync_requirements/`,
          { requirements: cleaned });
          setDirty(false);          //  ✨
          setEdit(false);
          fetchData();
    
        /* 3 — финал */
        fetchData();
        setStatus("✔️ Сохранено");
        setEdit(false);
        setErrors({});
        setDirty(false);
      } catch (err) {
        const msg =
          err.response?.data?.detail ||
          Object.values(err.response?.data || {}).flat().join(" ") ||
          err.message;
        setErrors({ save: [msg] });
        setStatus("Ошибка сохранения");
      }
    };
      

  if (!project) return <p className="text-center mt-8">Загрузка…</p>;

  /* JSX */
  return (
    <div className="max-w-3xl mx-auto mt-12 p-8 border border-gray-300 rounded-xl shadow space-y-6">
      <div className="flex justify-between items-center mb-4">
      <BackButton fallback="/projects" />
      
      <button
        onClick={() => (edit ? save() : setEdit(true))}
        className="px-3 py-1 border border-blue-600 text-blue-600 rounded
              hover:bg-blue-50 disabled:opacity-40"
              disabled={!canSave}
        >
          {edit ? "Сохранить" : "Редактировать"}
        </button>
        {!edit && (
        <button
          onClick={async () => {
            setMatchErr(""); setTeam(null); setMatching(true);
            try {
              const { data } = await api.post(`projects/${projectId}/match/`);
              if (data.students?.length) setTeam(data);
              else setMatchErr(data.detail || "Команда пуста");
            } catch (e) {
              setMatchErr(e.response?.data?.detail || e.message);
            } finally { setMatching(false); }
          }}
          className="px-3 py-1 border border-green-600 text-green-600 rounded hover:bg-green-50"
        >
          {matching ? "Подбор…" : "Сформировать команду"}
        </button>
        )}

        <button
          onClick={() => {
            if (!window.confirm("Удалить проект?")) return;
            setDirty(false);                // убираем диалог «изменения не сохранены»
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
          onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
        />
      ) : (
        <h2 className="text-2xl font-semibold">{project.title}</h2>
      )}

      {/* Куратор */}
      <div>
        <label className="block mb-1 font-medium">Куратор</label>
        {edit ? (
          <UserCombobox value={curator} onChange={setCurator} onDirty={setDirty} />
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
              <div key={`${r.skill ?? 'new'}-${i}`} className="flex gap-2 mb-2 items-center">
                <SkillCombobox
                  value={r.skill}
                  onChange={(val) => {
                    // val может быть null, если поле очищено
                    if (!val) return;
                    const upd = [...reqs];
                    upd[i] = { ...upd[i], skill: val };   // сохраняем объект
                    setReqs(upd);
                    setDirty(true);
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
                    setDirty(true);
                  }}
                />
                <button
                  type="button"
                  disabled={reqs.length === 1}
                  onClick={() => {
                    setReqs(prev => prev.filter((_, idx) => idx !== i));
                    setDirty(true);
                  }}
                  className={`px-2 ${reqs.length === 1 ? "opacity-30" : "text-red-500"}`}
                >
                ✖
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setReqs([...reqs, { skill: null, skill_name: "", level: 1 }]);
                setDirty(true);
              }}
              className="mt-1 px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
            >
              + Добавить требование
            </button>
          </>
        ) : (
          <RequirementsTable reqs={reqs} />
        )}
      </div>
      {/* Команды */}
      {!edit && (
        <section>
          <h3 className="font-medium mb-2">Команды</h3>
          <TeamTable projectId={projectId} />
        </section>
      )}


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
      <Dialog open={!!team || !!matchErr} onClose={() => {setTeam(null); setMatchErr("");}}>
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed left-1/2 top-1/3 w-96 max-w-full -translate-x-1/2 transform bg-white p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-lg font-medium">
            Результат подбора
          </h2>
          {matchErr && <p className="text-red-600">{matchErr}</p>}
          {team && (
            <div>
              <p className="mb-2 font-medium">
                Команда #{team.id} • {team.students.length} чел.
              </p>
              <ul className="list-disc pl-5 space-y-1 max-h-60 overflow-y-auto">
                {team.students.map(s=>(
                  <li key={s.id}>{s.name} <span className="text-xs text-gray-400">({s.email})</span></li>
                ))}
              </ul>
            </div>
          )}
          <button
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => {setTeam(null); setMatchErr("");}}
          >
            ОК
          </button>
        </div>
      </Dialog>
    </div>
  );
};
