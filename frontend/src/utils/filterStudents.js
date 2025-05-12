export default function filterStudents(list, { q = "", skillId = null, minLvl = 0 }) {
    // ↓ приводим к нижнему регистру один раз
    const needle = q.trim().toLowerCase();
  
    return list.filter(s => {
      /* ---- поиск по имени / e-mail ---- */
      const matchesText =
        !needle ||
        s.name.toLowerCase().includes(needle) ||
        s.email.toLowerCase().includes(needle);
  
      /* ---- фильтр по навыку ---- */
      const matchesSkill = !skillId
        ? true
        : s.skills?.some(sk => sk.skill === skillId && sk.level >= minLvl);
  
      return matchesText && matchesSkill;
    });
  }