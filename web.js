// Simple HealthTracker app (vanilla JS)
// Data stored in localStorage per username under key `healthtracker:{username}`
//
// Data model:
// {
//   habits: { id: {id, name, color} },
//   entries: { "YYYY-MM-DD": { notes: "...", completed: { habitId: true } } },
//   goals: { "YYYY-MM": [ { id, title, target } ] }
// }

(() => {
  // Utilities
  const qs = s => document.querySelector(s);
  const qsa = s => [...document.querySelectorAll(s)];
  const uid = (p = '') => Date.now().toString(36) + Math.random().toString(36).slice(2,6) + p;

  // DOM elements
  const usernameInput = qs('#usernameInput');
  const loadUserBtn = qs('#loadUserBtn');
  const newUserBtn = qs('#newUserBtn');
  const monthLabel = qs('#monthLabel');
  const prevMonthBtn = qs('#prevMonth');
  const nextMonthBtn = qs('#nextMonth');
  const calendarEl = qs('#calendar');
  const habitListEl = qs('#habitList');
  const newHabitName = qs('#newHabitName');
  const newHabitColor = qs('#newHabitColor');
  const addHabitBtn = qs('#addHabitBtn');
  const selectedDateLabel = qs('#selectedDateLabel');
  const dayHabitsEl = qs('#dayHabits');
  const dayNotesEl = qs('#dayNotes');
  const saveNotesBtn = qs('#saveNotesBtn');
  const newGoalTitle = qs('#newGoalTitle');
  const newGoalTarget = qs('#newGoalTarget');
  const addGoalBtn = qs('#addGoalBtn');
  const goalsListEl = qs('#goalsList');
  const exportBtn = qs('#exportBtn');
  const importBtn = qs('#importBtn');
  const importFile = qs('#importFile');
  const celebrationEl = qs('#celebration');

  // App state
  let state = {
    username: null,
    data: null,
    viewYear: (new Date()).getFullYear(),
    viewMonth: (new Date()).getMonth(), // 0-indexed
    selectedDate: (new Date()).toISOString().slice(0,10)
  };

  // LocalStorage helpers
  function storageKey(user){ return `healthtracker:${user}` }
  function loadData(user){
    try {
      const raw = localStorage.getItem(storageKey(user));
      if(!raw) return { habits:{}, entries:{}, goals:{} };
      return JSON.parse(raw);
    } catch(e){
      console.error('load error', e);
      return { habits:{}, entries:{}, goals:{} };
    }
  }
  function saveData(){
    if(!state.username || !state.data) return;
    localStorage.setItem(storageKey(state.username), JSON.stringify(state.data));
  }

  // UI helpers
  function setUser(name){
    state.username = name;
    state.data = loadData(name);
    renderAll();
  }

  function createDefaultIfEmpty(){
    // create a couple of sample habits if none exist
    if(Object.keys(state.data.habits).length === 0){
      const h1 = uid('run');
      const h2 = uid('stretch');
      state.data.habits[h1] = { id:h1, name:'Run / Cardio 30m', color:'#06b6d4' };
      state.data.habits[h2] = { id:h2, name:'Stretch / Mobility', color:'#4ade80' };
      saveData();
    }
  }

  // Calendar rendering
  function renderCalendar(){
    calendarEl.innerHTML = '';
    const year = state.viewYear;
    const month = state.viewMonth;
    const first = new Date(year, month, 1);
    const startDay = first.getDay(); // 0 Sun - 6 Sat
    const daysInMonth = new Date(year, month+1, 0).getDate();

    // label
    monthLabel.textContent = first.toLocaleString(undefined, { month:'long', year:'numeric' });

    // weekday headers
    const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    weekDays.forEach(d => {
      const header = document.createElement('div');
      header.className = 'day muted';
      header.style.minHeight = '28px';
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'center';
      header.textContent = d;
      calendarEl.appendChild(header);
    });

    // fill blanks for previous month
    for(let i=0;i<startDay;i++){
      const cell = document.createElement('div');
      cell.className = 'day other';
      calendarEl.appendChild(cell);
    }

    // render days
    for(let d=1; d<=daysInMonth; d++){
      const iso = new Date(year, month, d).toISOString().slice(0,10);
      const entry = state.data.entries[iso] || { notes:'', completed:{} };
      const cell = document.createElement('button');
      cell.className = 'day';
      cell.setAttribute('data-date', iso);
      cell.innerHTML = `<div class="date">${d}</div><div class="dots"></div>`;
      // dots for completed habits (max 4 visible)
      const dots = cell.querySelector('.dots');
      const completedIds = Object.entries(entry.completed || {}).filter(([k,v])=>v).map(([k])=>k);
      completedIds.slice(0,4).forEach(hid=>{
        const dot = document.createElement('span');
        dot.className = 'dot';
        const color = (state.data.habits[hid] && state.data.habits[hid].color) || '#9ca3af';
        dot.style.background = color;
        dots.appendChild(dot);
      });

      // highlight selected
      if(state.selectedDate === iso) cell.style.boxShadow = '0 10px 30px rgba(2,6,23,0.06)';

      cell.addEventListener('click', () => {
        state.selectedDate = iso;
        renderAll();
      });

      calendarEl.appendChild(cell);
    }
  }

  // Habits list for management (right-pane)
  function renderHabitsList(){
    habitListEl.innerHTML = '';
    const habits = Object.values(state.data.habits).sort((a,b)=>a.name.localeCompare(b.name));
    if(habits.length === 0){
      habitListEl.innerHTML = '<li class="muted">No habits yet. Add one above.</li>';
      return;
    }
    habits.forEach(h=>{
      const li = document.createElement('li');
      li.className = 'habit-item';
      li.innerHTML = `
        <div class="habit-left">
          <div class="habit-color" style="background:${h.color}"></div>
          <div>
            <div style="font-weight:600">${escapeHtml(h.name)}</div>
            <div class="muted" style="font-size:12px">id: ${h.id.slice(0,6)}</div>
          </div>
        </div>
        <div class="habit-controls">
          <button class="btn small ghost edit-habit">Edit</button>
          <button class="btn small ghost remove-habit">Remove</button>
        </div>
      `;
      li.querySelector('.edit-habit').addEventListener('click', ()=>{
        const newName = prompt('Edit habit name', h.name);
        if(newName) { state.data.habits[h.id].name = newName; saveData(); renderAll(); }
      });
      li.querySelector('.remove-habit').addEventListener('click', ()=>{
        if(!confirm('Remove this habit? This will not remove historical entries (they will remain but without a label).')) return;
        delete state.data.habits[h.id];
        // remove from entries
        Object.values(state.data.entries).forEach(e => {
          if(e.completed && e.completed[h.id]) delete e.completed[h.id];
        });
        saveData();
        renderAll();
      });
      habitListEl.appendChild(li);
    });
  }

  // Day details (left bottom) — show checkboxes for each habit
  function renderDayDetails(){
    selectedDateLabel.textContent = `Selected date: ${state.selectedDate}`;
    const entry = state.data.entries[state.selectedDate] || { notes:'', completed:{} };
    dayHabitsEl.innerHTML = '';
    const habits = Object.values(state.data.habits).sort((a,b)=>a.name.localeCompare(b.name));
    if(habits.length === 0){
      dayHabitsEl.innerHTML = '<div class="muted">Add habits to track daily tasks.</div>';
    } else {
      habits.forEach(h=>{
        const div = document.createElement('div');
        div.className = 'day-habit';
        const checked = !!(entry.completed && entry.completed[h.id]);
        div.innerHTML = `
          <div style="display:flex; gap:8px; align-items:center;">
            <div class="checkbox ${checked ? 'checked' : ''}" data-hid="${h.id}">
              ${checked ? checkSvg() : ''}
            </div>
            <div>
              <div style="font-weight:600">${escapeHtml(h.name)}</div>
              <div class="muted" style="font-size:12px">habit id ${h.id.slice(0,6)}</div>
            </div>
          </div>
          <div class="muted" style="font-size:12px">${checked ? 'Completed' : 'Not done'}</div>
        `;
        const checkEl = div.querySelector('.checkbox');
        checkEl.style.borderColor = checked ? 'transparent' : '';
        checkEl.addEventListener('click', ()=>{
          toggleHabitForDay(h.id, state.selectedDate);
        });
        dayHabitsEl.appendChild(div);
      });
    }
    dayNotesEl.value = entry.notes || '';
  }

  function toggleHabitForDay(hid, iso){
    if(!state.data.entries[iso]) state.data.entries[iso] = { notes:'', completed:{} };
    const e = state.data.entries[iso];
    e.completed = e.completed || {};
    e.completed[hid] = !e.completed[hid];
    saveData();
    renderAll();
    // update monthly goals progress check
    checkGoalsForMonth(iso.slice(0,7));
  }

  // Save notes
  saveNotesBtn.addEventListener('click', ()=>{
    if(!state.data.entries[state.selectedDate]) state.data.entries[state.selectedDate] = { notes:'', completed:{} };
    state.data.entries[state.selectedDate].notes = dayNotesEl.value;
    saveData();
    flash('Notes saved');
  });

  // Goals
  function renderGoals(){
    goalsListEl.innerHTML = '';
    const key = `${state.viewYear}-${String(state.viewMonth+1).padStart(2,'0')}`;
    const goals = state.data.goals[key] || [];
    if(goals.length === 0){
      goalsListEl.innerHTML = '<li class="muted">No goals for this month. Add one above.</li>';
      return;
    }
    goals.forEach(g=>{
      const li = document.createElement('li');
      li.className = 'goal-item';
      const progressPct = computeGoalProgressPct(g, state.viewYear, state.viewMonth);
      li.innerHTML = `
        <div style="flex:1">
          <div style="display:flex; justify-content:space-between; align-items:center">
            <strong>${escapeHtml(g.title)}</strong>
            <small class="muted">${Math.round(progressPct)}%</small>
          </div>
          <div class="progress" style="margin-top:8px"><i style="width:${progressPct}%"></i></div>
          <div class="muted" style="font-size:12px; margin-top:8px">Target: ${g.target} completions this month</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; margin-left:8px">
          <button class="btn small ghost edit-goal">Edit</button>
          <button class="btn small ghost remove-goal">Remove</button>
        </div>
      `;
      li.querySelector('.edit-goal').addEventListener('click', ()=>{
        const newTitle = prompt('Edit goal title', g.title);
        if(!newTitle) return;
        const newTarget = parseInt(prompt('Target (number of completions for month)', g.target),10) || g.target;
        g.title = newTitle; g.target = newTarget;
        saveData(); renderAll();
      });
      li.querySelector('.remove-goal').addEventListener('click', ()=>{
        if(!confirm('Remove this goal?')) return;
        const key = `${state.viewYear}-${String(state.viewMonth+1).padStart(2,'0')}`;
        state.data.goals[key] = (state.data.goals[key] || []).filter(x=>x.id !== g.id);
        saveData(); renderAll();
      });
      goalsListEl.appendChild(li);
    });
  }

  function computeGoalProgressPct(goal, year, month){
    // naive interpretation: count days where any habit completion happened and sum them as 'completions'
    // Or you could define rule per goal. For now: completions = total number of days where at least one habit completed.
    const key = `${year}-${String(month+1).padStart(2,'0')}`;
    const daysInMonth = new Date(year, month+1, 0).getDate();
    let completions = 0;
    for(let d=1; d<=daysInMonth; d++){
      const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const e = state.data.entries[iso];
      if(e && e.completed && Object.values(e.completed).some(v=>v)) completions++;
    }
    const pct = Math.min(100, Math.round((completions / (goal.target || 1)) * 100));
    // if reached, celebrate
    if(pct >= 100) {
      triggerCelebration();
    }
    return pct;
  }

  function checkGoalsForMonth(monthKey){
    // monthKey like "2025-12"
    // call computeGoalProgressPct for each goal to ensure celebration on crossing threshold
    const parts = monthKey.split('-');
    const y = parseInt(parts[0],10);
    const m = parseInt(parts[1],10)-1;
    const key = `${y}-${String(m+1).padStart(2,'0')}`;
    const goals = state.data.goals[key] || [];
    goals.forEach(g => computeGoalProgressPct(g, y, m));
  }

  // Add habit
  addHabitBtn.addEventListener('click', ()=>{
    const name = newHabitName.value.trim();
    if(!name) return flash('Enter habit name');
    const color = newHabitColor.value || '#06b6d4';
    const id = uid('h');
    state.data.habits[id] = { id, name, color };
    newHabitName.value = '';
    saveData();
    renderAll();
  });

  // Add goal
  addGoalBtn.addEventListener('click', ()=>{
    const title = newGoalTitle.value.trim();
    const target = parseInt(newGoalTarget.value,10);
    if(!title || !target) return flash('Provide goal title and numeric target');
    const key = `${state.viewYear}-${String(state.viewMonth+1).padStart(2,'0')}`;
    state.data.goals[key] = state.data.goals[key] || [];
    const g = { id: uid('g'), title, target };
    state.data.goals[key].push(g);
    newGoalTitle.value = ''; newGoalTarget.value = '';
    saveData(); renderAll();
  });

  // Export/import
  exportBtn.addEventListener('click', ()=>{
    if(!state.username) return flash('Load a username first');
    const payload = { username: state.username, data: state.data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.username}-healthtracker.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flash('Exported JSON');
  });

  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', async (ev)=>{
    const f = ev.target.files[0];
    if(!f) return;
    try {
      const txt = await f.text();
      const payload = JSON.parse(txt);
      if(!payload || !payload.username || !payload.data) {
        flash('Invalid file format');
        return;
      }
      // ask if user wants to merge or replace
      const mode = confirm(`File belongs to user "${payload.username}". Press OK to MERGE into current user "${state.username}" (or Cancel to replace current data).`) ? 'merge' : 'replace';
      if(mode === 'replace'){
        state.data = payload.data;
      } else {
        // merge: shallow-merge habits & entries & goals
        state.data.habits = { ...state.data.habits, ...payload.data.habits };
        state.data.entries = { ...state.data.entries, ...payload.data.entries };
        state.data.goals = { ...state.data.goals, ...payload.data.goals };
      }
      saveData();
      renderAll();
      flash('Import complete');
    } catch(e){
      console.error(e);
      flash('Import failed');
    } finally {
      importFile.value = '';
    }
  });

  // navigation
  prevMonthBtn.addEventListener('click', ()=>{
    state.viewMonth--;
    if(state.viewMonth < 0){ state.viewMonth = 11; state.viewYear--; }
    renderAll();
  });
  nextMonthBtn.addEventListener('click', ()=>{
    state.viewMonth++;
    if(state.viewMonth > 11){ state.viewMonth = 0; state.viewYear++; }
    renderAll();
  });

  // user load/new
  loadUserBtn.addEventListener('click', ()=>{
    const u = usernameInput.value.trim();
    if(!u) return flash('Enter a username to load');
    setUser(u);
    createDefaultIfEmpty();
    flash(`Loaded ${u}`);
  });
  newUserBtn.addEventListener('click', ()=>{
    const u = usernameInput.value.trim() || prompt('Enter new username') || '';
    if(!u) return;
    if(localStorage.getItem(storageKey(u))) {
      if(!confirm('That username exists. Load it?')) return;
    } else {
      // create empty
      localStorage.setItem(storageKey(u), JSON.stringify({ habits:{}, entries:{}, goals:{} }));
    }
    setUser(u);
    createDefaultIfEmpty();
    flash(`Ready for ${u}`);
  });

  // small helpers
  function renderAll(){
    renderCalendar();
    renderHabitsList();
    renderDayDetails();
    renderGoals();
  }

  function flash(msg){
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.position = 'fixed';
    el.style.right = '18px';
    el.style.bottom = '18px';
    el.style.padding = '10px 14px';
    el.style.background = 'linear-gradient(180deg, #06b6d4, #0891b2)';
    el.style.color = 'white';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '0 8px 24px rgba(12,74,110,0.12)';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    document.body.appendChild(el);
    requestAnimationFrame(()=>{ el.style.transition = 'all 260ms ease'; el.style.opacity='1'; el.style.transform='translateY(0)'; });
    setTimeout(()=> {
      el.style.opacity='0'; el.style.transform='translateY(8px)';
      setTimeout(()=> el.remove(), 260);
    }, 1800);
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  }

  function checkSvg(){
    return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  // Celebration / confetti
  function triggerCelebration(){
    // simple throttling so it doesn't spam
    if(celebrationEl.dataset.locked) return;
    celebrationEl.dataset.locked = '1';
    const count = 22;
    for(let i=0;i<count;i++){
      const node = document.createElement('div');
      node.className = 'confetti';
      const w = 8 + Math.random()*14;
      node.style.width = `${w}px`;
      node.style.height = `${12 + Math.random()*18}px`;
      node.style.left = `${Math.random()*100}%`;
      node.style.background = randomColor();
      node.style.transform = `rotate(${Math.random()*360}deg)`;
      node.style.opacity = 0;
      celebrationEl.appendChild(node);
      // remove after animation
      setTimeout(()=> node.remove(), 2400 + Math.random()*800);
    }
    setTimeout(()=> { delete celebrationEl.dataset.locked }, 2600);
  }
  function randomColor(){
    const palette = ['#06b6d4','#ef4444','#f59e0b','#10b981','#8b5cf6','#ec4899'];
    return palette[Math.floor(Math.random()*palette.length)];
  }

  // initial UI
  (function startup(){
    // default to anonymous user if none
    // But don't auto-load; wait for user interaction to keep it explicit
    state.viewYear = new Date().getFullYear();
    state.viewMonth = new Date().getMonth();
    state.selectedDate = new Date().toISOString().slice(0,10);
    monthLabel.textContent = '';
    // allow pressing Enter in username to load
    usernameInput.addEventListener('keypress', e => { if(e.key === 'Enter') loadUserBtn.click(); });
    // attempt a quick peek: if the user has only one healthtracker key, prefill username field
    const keys = Object.keys(localStorage).filter(k => k.startsWith('healthtracker:'));
    if(keys.length === 1){
      const user = keys[0].split(':')[1];
      usernameInput.value = user;
    }
  })();

})();
