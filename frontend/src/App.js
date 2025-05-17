import React from "react";
import {
  BrowserRouter, Routes, Route,
  NavLink, useParams
} from "react-router-dom";

import CreateProjectPage, { ProjectCard } from "./pages/ProjectPages";
// удалены устаревшие импорты ProjectForm, UserForm, ProjectList, UserList, SkillList,
// ImportSkills, MatchProject — все остальное подключается внутри страниц
import AdminDashboard from "./pages/AdminDashboard";
import Projects from "./pages/ProjectListPage";
import UserCard from "./pages/UserCard";
import StudentCard from "./pages/StudentCards";
import TeamPage from "./pages/TeamPage";

/* ---------- обёртка для /project/:id ---------- */
function ProjectWrapper() {
  const { id } = useParams();
  return <ProjectCard projectId={id} />;
}

/* ---------- навигационная ссылка с актив‑стилем ---------- */
const NavItem = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `px-3 py-2 rounded-lg hover:bg-blue-50 ${
        isActive ? "bg-blue-100 text-blue-700 font-medium" : "text-blue-600"
      }`
    }
  >
    {children}
  </NavLink>
);

export default function App() {
  return (
    <BrowserRouter>
      {/* ==== фикс‑шапка ==== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-4 px-6 py-3">
          {/* «логотип» — ведёт на /create */}
          <NavItem to="/create" className="mr-auto">
            <span className="font-bold">Напарники</span>
          </NavItem>

          {/* нав‑ссылки */}
          <NavItem to="/create">Создать проект</NavItem>
          <NavItem to="/admin">Админ‑панель</NavItem>
          <NavItem to="/projects">Все проекты</NavItem>
        </div>
      </header>

      {/* ==== страницы ==== */}
      <Routes>
        <Route path="/create"     element={<CreateProjectPage />} />
        <Route path="/project/:id"element={<ProjectWrapper   />} />
        <Route path="/projects"   element={<Projects />} />
        {/* админ–панель */}
        <Route path="/admin" element={<AdminDashboard />} />
        {/* прочие пути */}
        <Route path="/user/:id" element={<UserCard />} />
        <Route path="/student/:id" element={<StudentCard />} />
        <Route path="*"         element={<CreateProjectPage />} />
        <Route path="/team/:id" element={<TeamPage />} />
      </Routes>
    </BrowserRouter>
  );
}
