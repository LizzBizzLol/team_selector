import React, { useState, useEffect, useRef } from "react";
import SkillCombobox   from "../components/SkillCombobox";
import UserCombobox    from "../components/CuratorCombobox";
import RequirementsTable from "../components/RequirementsTable";
import TeamTable       from "../components/TeamTable";
import BackButton      from "../components/BackButton";
import Toast           from "../components/Toast";
import { Dialog }      from "@headlessui/react";
import { Link }        from "react-router-dom";
import api             from "../api";
import humanizeError   from "../utils/humanizeError";
import useUnsavedPrompt from "../hooks/useUnsavedPrompt";
import { unwrap }      from "../utils/unwrap";
import TeamHeatmap from "../components/TeamHeatmap";  
import TeamFormationModal from "../components/TeamFormationModal";

/* ------------------------------------------------------------------ */
/*  CreateProjectPage                                                 */
/* ------------------------------------------------------------------ */
export default function CreateProjectPage() {
  /* ---------- state ---------- */
  const [title,        setTitle]        = useState("");
  const [curator,      setCurator]      = useState(null);                 // {id,name}
  const [requirements, setRequirements] = useState([{ skill:null, level:1 }]);
  const [minPart,      setMinPart]      = useState(1);
  const [maxPart,      setMaxPart]      = useState(1);
  const [totalStudents,setTotalStudents]= useState(1);
  const [sending,      setSending]      = useState(false);
  const [errors,       setErrors]       = useState({});
  const [status,       setStatus]       = useState("");
  const [toast,        setToast]        = useState({ show:false, ok:true, text:"" });
  const [dirty,        setDirty]        = useState(false);                // ✨
  const fileInputRef                      = useRef(null);

  useUnsavedPrompt(dirty);

  /* ---------- helpers ---------- */
  const markDirty = () => setDirty(true);

  /* ---------- эффекты ---------- */
  /* общее кол-во студентов */
  useEffect(() => {
    api.get("students/")
        .then(({data}) => {
          const n = unwrap(data).length || 1;
          setTotalStudents(n);
          setMaxPart(n);
        })
        .catch(console.error);
  }, []);

  /* ---------- JSON-файл ---------- */
  const handleFileUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const json = JSON.parse(await file.text());
      if (!json.title) { setToast({show:true,ok:false,text:"В файле нет «title»"}); return; }

      setTitle(json.title);                                  // ►
      /* куратор */
      if (json.curator?.id) {
        setCurator({ id:json.curator.id, name:json.curator.name });
      } else if (json.curator?.name) {
        const {data} = await api.get("curators/", { params:{search:json.curator.name} });
        const found   = unwrap(data).find(c => c.name.toLowerCase() === json.curator.name.toLowerCase());
        setCurator(found ? {id:found.id,name:found.name} : null);
      } else setCurator(null);

      /* min/max */
      const min = Math.max(1, Math.min(+json.min_participants||1, totalStudents));
      const max = Math.max(min, Math.min(+json.max_participants||totalStudents, totalStudents));
      setMinPart(min); setMaxPart(max);

      /* требования */
      if (Array.isArray(json.requirements)) {
        const reqs = [];
        for (const item of json.requirements) {
          if (!item.skill) continue;
          const lvl = Math.max(1, Math.min(5, +item.level||1));
          const {data} = await api.get("skills/", { params:{search:item.skill} });
          const found  = unwrap(data).find(s => s.name.toLowerCase() === item.skill.toLowerCase());
          if (found) reqs.push({ skill:{id:found.id,name:found.name}, level:lvl });
        }
        if (reqs.length) setRequirements(reqs);
      }
      markDirty();
    } catch (err) {
      setToast({show:true,ok:false,text:"Не удалось прочитать JSON-файл"});
    }
  };

  /* ---------- CRUD helpers ---------- */
  const addRequirement    = () => { setRequirements([...requirements,{skill:null,level:1}]); markDirty(); };
  const updateRequirement = (i,field,val)=>{
    const arr=[...requirements]; arr[i][field]=val; setRequirements(arr); markDirty();
  };
  const removeRequirement = i => { setRequirements(requirements.filter((_,idx)=>idx!==i)); markDirty(); };

  /* ---------- submit ---------- */
  const handleSubmit = async e => {
    e.preventDefault();
    setSending(true); setErrors({}); setStatus("");

    try {
      /* 1 - проект */
      const {data:proj} = await api.post("projects/",{
        title,
        curator_id      : curator?.id ?? null,
        min_participants: minPart,
        max_participants: maxPart
      });
      /* 2 - требования */
      await Promise.all(requirements.filter(r=>r.skill).map(r=>
        api.post(`projects/${proj.id}/add_requirement/`,{
          skill: r.skill.id,
          level: r.level
        })
      ));
      setToast({show:true,ok:true,text:`Проект «${title}» создан`});

      /* reset */
      setTitle(""); setCurator(null);
      setRequirements([{skill:null,level:1}]);
      setMinPart(1); setMaxPart(totalStudents);
      fileInputRef.current.value="";
      setDirty(false);
    } catch(err){
      setToast({show:true,ok:false,text:humanizeError(err)});
    } finally { setSending(false); }
  };

  /* ---------- UI ---------- */
  return (
  <main className="flex justify-center pt-12 pb-14 bg-gray-50 min-h-screen overflow-auto">
    <form onSubmit={handleSubmit}
          className="w-full max-w-lg sm:max-w-2xl px-6 py-8 mx-auto space-y-6
                     border rounded-xl shadow bg-white text-xs sm:text-sm md:text-base">

      <h1 className="text-2xl font-semibold text-center mb-6 sticky top-0 bg-white/80 backdrop-blur">
        Создание проекта
      </h1>

      {/* ---------- название ---------- */}
      <div>
        <label className="block font-medium">Название проекта</label>
        <input className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
               value={title}
               onChange={e=>{setTitle(e.target.value); markDirty();}}
               required/>
      </div>

      {/* ---------- куратор ---------- */}
      <div>
        <label className="block mb-1 font-medium">Куратор</label>
        <UserCombobox value={curator} onChange={v=>{setCurator(v); markDirty();}}/>
      </div>

      {/* ---------- min/max ---------- */}
      <div className="flex gap-4">
        <div>
          <label className="block mb-1 font-medium">Мин. участников</label>
          <input type="number" min={1} max={totalStudents}
                 className="border w-24 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                 value={minPart}
                 onChange={e=>{
                   const v=Math.max(1,Math.min(totalStudents,+e.target.value));
                   setMinPart(v); if(v>maxPart) setMaxPart(v); markDirty();
                 }} required/>
        </div>
        <div>
          <label className="block mb-1 font-medium">Макс. участников</label>
          <input type="number" min={1} max={totalStudents}
                 className="border w-24 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                 value={maxPart}
                 onChange={e=>{
                   const v=Math.max(1,Math.min(totalStudents,+e.target.value));
                   setMaxPart(v); if(v<minPart) setMinPart(v); markDirty();
                 }} required/>
        </div>
      </div>

      {/* ---------- требования ---------- */}
      <div>
        <label className="block mb-2 font-medium">Требования</label>
        {requirements.map((r,i)=>(
          <div key={i} className="flex gap-2 mb-2 items-center">
            <SkillCombobox value={r.skill}
                           onChange={v=>updateRequirement(i,"skill",v)}/>
            <input type="number" min="1" max="5"
                   className="border w-24 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                   value={r.level}
                   onChange={e=>updateRequirement(i,"level",+e.target.value)}/>
            {requirements.length>1 &&
              <button type="button" className="text-red-500 px-2"
                      onClick={()=>removeRequirement(i)}>✖</button>}
          </div>
        ))}
        <button type="button" onClick={addRequirement}
                className="mt-1 px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
          + Добавить
        </button>
      </div>

      {/* ---------- JSON-файл ---------- */}
      <div>
        <label className="block mb-1 font-medium">JSON-файл с данными</label>
        <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileUpload}/>
      </div>

      <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              disabled={sending}>
        {sending ? "Отправка…" : "Создать проект"}
      </button>
    </form>

    <Toast show={toast.show} ok={toast.ok} text={toast.text}
           onClose={()=>setToast(t=>({...t,show:false}))}/>
  </main>);
}

/* -------------------------------------------------------------------
   ProjectCard – карточка проекта
------------------------------------------------------------------- */
export const ProjectCard = ({ projectId }) => {
  const [project, setProject] = useState(null);
  const [reqs,    setReqs]    = useState([]);
  const [edit,    setEdit]    = useState(false);

  // TEAM-BEGIN
  const [team,     setTeam]     = useState(null);   // успешный автоподбор
  const [teamVer,  setTeamVer]  = useState(0);    // 👉 версия списка команд
  const [matchErr, setMatchErr] = useState("");     // текст ошибки
  const [matching, setMatching] = useState(false);  // спиннер

const handleMatch = async () => {
  setMatchErr(""); setTeam(null); setMatching(true);
  try {
    const { data } = await api.post(`projects/${projectId}/match/`);
    if (data.students?.length) { setTeam(data); setTeamVer(v => v+1); } // триггерим перерисовку TeamTable 
    else setMatchErr(data.detail || "Команда пуста");
  } catch (e) {
    setMatchErr(e.response?.data?.detail || e.message);
  } finally { setMatching(false); }
  };
  // TEAM-END

  const [title,   setTitle]   = useState("");
  const [curator, setCurator] = useState(null);         // {id,name}

  const [status,  setStatus]  = useState("");
  const [errors,  setErrors]  = useState({});
  
  const [dirty,   setDirty]   = useState(false);        // ✨ «есть правки»

  const markDirty = () => setDirty(true);               // удобный хелпер

  /* ───── диалог «несохранённые изменения» ───── */
  useUnsavedPrompt(dirty);

  /* ───── загрузка проекта ───── */
  const load = async () => {
    const { data } = await api.get(`projects/${projectId}/`);
    setProject(data);
    setTitle(data.title);

    setReqs(
      (data.skill_links||[]).map(x=>({
        id: x.id,
        skill: { id:x.skill, name:x.skill_name },
        level: x.level
      }))
    );

    setCurator(data.curator ? {id:data.curator.id, name:data.curator.name} : null);
    setDirty(false);               // ← свежие данные, правок нет
  };
  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[projectId]);

  /* ───── можно ли сохранить? ───── */
  const validReqs = reqs.filter(r=>r.skill && r.skill.id);
  const canSave   = edit && dirty && validReqs.length>0;

  /* ───── сохранить ───── */
  const save = async () => {
    try {
      await api.patch(`projects/${projectId}/`, {
        title,
        curator_id: curator?.id ?? null
      });

      await api.put(`projects/${projectId}/sync_requirements/`, {
        requirements: validReqs.map(r=>({skill:r.skill.id, level:+r.level}))
      });

      setStatus("✔️ Сохранено");
      setErrors({});
      setEdit(false);
      setDirty(false);              // всё ушло в БД
      load();                       // подбираем id новых строк
    }
    catch(err){
      const msg = err.response?.data?.detail
               || Object.values(err.response?.data||{}).flat().join(" ")
               || err.message;
      setErrors({save:[msg]});
      setStatus("Ошибка сохранения");
    }
  };

  const [showFormationModal, setShowFormationModal] = useState(false);

  if (!project) return <p className="text-center mt-8">Загрузка…</p>;

  /* ───── UI ───── */
  return (
    <div className="max-w-3xl mx-auto mt-12 p-8 border rounded-xl shadow space-y-6">
      <div className="flex justify-between items-center mb-4">
        <BackButton fallback="/projects"/>

        <button
          className="px-3 py-1 border rounded hover:bg-blue-50
                     border-blue-600 text-blue-600 disabled:opacity-40"
          disabled={!canSave}
          onClick={()=> edit ? save() : setEdit(true)}
        >
          {edit ? "Сохранить" : "Редактировать"}
        </button>

        {!edit && (
          <button
            onClick={() => setShowFormationModal(true)}
            className="px-3 py-1 border border-green-600 text-green-600 rounded hover:bg-green-50"
          >
            Сформировать команду
          </button>
        )}

        {!edit && (
          <button
            className="px-3 py-1 border border-red-600 text-red-600 rounded hover:bg-red-50"
            onClick={()=>{
              if (!window.confirm("Удалить проект?")) return;
              setDirty(false);               // отключаем beforeunload
              api.delete(`projects/${projectId}/`).then(
                ()=>window.location.href="/projects"
              );
            }}
          >
            Удалить
          </button>
        )}
      </div>

      {/* ─── Название ─── */}
      {edit ? (
        <input
          className="border w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={title}
          onChange={e=>{ setTitle(e.target.value); markDirty(); }}
        />
      ) : (
        <h2 className="text-2xl font-semibold">{project.title}</h2>
      )}

      {/* ─── Куратор ─── */}
      <div>
        <label className="block mb-1 font-medium">Куратор</label>
        {edit ? (
          <UserCombobox value={curator}
                        onChange={v=>{ setCurator(v); markDirty(); }}/>
        ) : (
          project.curator
            ? <Link to={`/user/${project.curator.id}`}
                    className="text-blue-600 hover:underline">
                {project.curator_name}
              </Link>
            : "—"
        )}
      </div>

      {/* ─── Требования ─── */}
      <div>
        <label className="block mb-2 font-medium">Требования</label>
        {edit ? (
          <>
            {reqs.map((r,i)=>(
              <div key={i} className="flex gap-2 mb-2 items-center">
                <SkillCombobox value={r.skill}
                               onChange={v=>{
                                 const arr=[...reqs]; arr[i].skill=v;
                                 setReqs(arr); markDirty();
                               }}/>
                <input type="number" min="1" max="5"
                       className="border w-24 text-center px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                       value={r.level}
                       onChange={e=>{
                         const arr=[...reqs]; arr[i].level=+e.target.value||1;
                         setReqs(arr); markDirty();
                       }}/>
                {reqs.length>1 &&
                  <button type="button" className="text-red-500 px-2"
                          onClick={()=>{ setReqs(reqs.filter((_,idx)=>idx!==i)); markDirty(); }}>
                    ✖
                  </button>}
              </div>
            ))}

            <button type="button" onClick={()=>{
                      setReqs([...reqs,{skill:null,level:1}]); markDirty();
                    }}
                    className="mt-1 px-3 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
              + Добавить требование
            </button>
          </>
        ) : (
          <RequirementsTable reqs={reqs}/>
        )}
      </div>

      {/* ─── статусы / ошибки ─── */}
      {status && <p className={`text-sm ${status.startsWith("✔")?"text-green-600":"text-red-600"}`}>{status}</p>}
      {errors.save && <p className="text-red-600 text-sm">{errors.save[0]}</p>}
      {!edit && (
        <section>
          <h3 className="font-medium mb-2">Команды</h3>
          {/* key заставит компонент размонтироваться-смонтироваться */}
          <TeamTable key={teamVer} projectId={projectId} />
        </section>
      )}
      <Dialog open={!!team || !!matchErr} onClose={()=>{ setTeam(null); setMatchErr(""); }}>
  <div className="fixed inset-0 bg-black/30" aria-hidden="true"/>
  <div
    className="fixed left-1/2 top-1/3 w-96 max-w-full -translate-x-1/2 transform bg-white p-6 rounded-xl shadow-lg space-y-4"
    style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}
  >
    <h2 className="text-lg font-medium">Результат подбора</h2>

    {matchErr && <p className="text-red-600">{matchErr}</p>}

    {team && (
      <>
        <div style={{ overflowY: "auto", maxHeight: "45vh" }}>
          <p className="mb-2 font-medium">
            Команда #{team.local_number ?? team.id} • {team.students.length} чел.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            {team.students.map(s=>(
              <li key={s.id}>
                {s.name} <span className="text-xs text-gray-400">({s.email})</span>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={() => {
              const data = {
                team: team.local_number ?? team.id,
                project: project?.title ?? "",
                students: team.students.map(s => ({
                  name: s.name,
                  email: s.email
                })),
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `team_${team.local_number ?? team.id}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Скачать JSON
          </button>
        </div>
      </>
    )}

    {/* Отступ снизу для кнопки ОК */}
    <div style={{paddingBottom: 16, textAlign: "center"}}>
      <button
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={()=>{ setTeam(null); setMatchErr(""); }}>
        ОК
      </button>
    </div>
  </div>
</Dialog>


      <TeamHeatmap
        team={team}
        requirements={reqs.map(r=>({
          skill_id: r.skill.id,
          skill_name: r.skill.name,
          level: r.level
        }))}
      />

      <TeamFormationModal
        open={showFormationModal}
        onClose={() => setShowFormationModal(false)}
        projectId={projectId}
      />
    </div>
  );
};
