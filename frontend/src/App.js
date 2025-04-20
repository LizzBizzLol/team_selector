import React from 'react';
import ProjectForm from './components/ProjectForm';
import UserForm from './components/UserForm';
import ProjectList from './components/ProjectList';
import UserList from './components/UserList';
import SkillList from './components/SkillList';
import ImportSkills from './components/ImportSkills';
import MatchProject from './components/MatchProject';

function App() {
  return (
    <div className="App">
      <h1>Team Selector</h1>

      <ProjectForm />
      <UserForm />
      <UserList />
      <SkillList />
      <ImportSkills projectId={1} />
      <ProjectList />
      <MatchProject projectId={1} />
    </div>
  );
}

export default App;
