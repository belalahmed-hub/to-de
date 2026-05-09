'use strict';

/**
 * نظام حياة المسلم - قاعدة البيانات (Dexie.js / IndexedDB)
 * كل البيانات بتتحفظ هنا مش في localStorage
 */

/* ═══════════════════════════════════════════════
   Data Cache with TTL
   ═══════════════════════════════════════════════ */

const DataCache = {
  _cache: {},
  _expiry: {},

  set(key, value, ttlMs = 60000) {
    this._cache[key] = value;
    this._expiry[key] = Date.now() + ttlMs;
  },

  get(key) {
    if (this._expiry[key] && Date.now() > this._expiry[key]) {
      delete this._cache[key];
      delete this._expiry[key];
      return null;
    }
    return this._cache[key] || null;
  },

  invalidate(key) {
    delete this._cache[key];
    delete this._expiry[key];
  },

  clear() {
    this._cache = {};
    this._expiry = {};
  }
};

const db = new Dexie('HayahDB');

db.version(1).stores({
  tasks: '++id, title, description, priority, status, dueDate, hijriDate, prayerLink, *tags, createdAt, updatedAt',
  projects: '++id, name, color, description, createdAt',
  notes: '++id, title, content, *tags, createdAt',
  habits: '++id, name, icon, frequency, *completedDates, createdAt',
  teamMembers: '++id, name, role, avatar, email',
  settings: 'key, value'
});

db.version(4).stores({
  tasks: '++id, title, description, niyyah, priority, status, dueDate, hijriDate, prayerLink, assignee, *tags, createdAt, updatedAt',
  projects: '++id, name, color, description, createdAt',
  notes: '++id, title, content, color, *tags, createdAt, updatedAt',
  habits: '++id, name, icon, color, frequency, target, unit, category, *completedDates, streak, bestStreak, createdAt',
  teamMembers: '++id, name, role, email, color, phone, notes, createdAt',
  settings: 'key, value',
  aiConversations: '++id, title, updatedAt, createdAt',
  activityLog: '++id, memberId, action, taskId, timestamp',
  pomodoroSessions: '++id, taskId, duration, type, completedAt',
  weeklyReviews: '++id, weekStart, accomplishments, challenges, goals, createdAt'
});

db.version(3).stores({
  tasks: '++id, title, description, niyyah, priority, status, dueDate, hijriDate, prayerLink, assignee, *tags, createdAt, updatedAt',
  projects: '++id, name, color, description, createdAt',
  notes: '++id, title, content, *tags, createdAt',
  habits: '++id, name, icon, color, frequency, target, unit, category, *completedDates, streak, bestStreak, createdAt',
  teamMembers: '++id, name, role, email, color, phone, notes, createdAt',
  settings: 'key, value',
  aiConversations: '++id, title, updatedAt, createdAt',
  activityLog: '++id, memberId, action, taskId, timestamp'
});

db.on('ready', () => {
  console.log('✅ HayahDB ready');
});

db.on('error', (err) => {
  console.error('❌ Database error:', err);
});

async function initDB() {
  try {
    await db.open();
    await seedDefaults();
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

async function seedDefaults() {
  try {
    const settingsCount = await db.settings.count();
    if (settingsCount === 0) {
      await db.settings.bulkPut([
        { key: 'city', value: 'Cairo' },
        { key: 'prayerMethod', value: 'Egypt' },
        { key: 'language', value: 'ar' },
        { key: 'theme', value: 'dark' },
        { key: 'notifications', value: true },
        { key: 'groqApiKey', value: '' },
        { key: 'sidebarCollapsed', value: false },
        { key: 'defaultPriority', value: 'medium' }
      ]);
    }

    const projectsCount = await db.projects.count();
    if (projectsCount === 0) {
      await db.projects.bulkAdd([
        { name: 'العبادات', color: '#1a5276', description: 'الصلاة، القرآن، الأذكار', createdAt: new Date().toISOString() },
        { name: 'العمل', color: '#148f77', description: 'المهام المهنية', createdAt: new Date().toISOString() },
        { name: 'التعلم', color: '#d4ac0d', description: 'دورات ومهارات جديدة', createdAt: new Date().toISOString() }
      ]);
    }

    const habitsCount = await db.habits.count();
    if (habitsCount === 0) {
      await db.habits.bulkAdd([
        { name: 'قراءة القرآن', icon: '📖', color: '#148f77', frequency: 'daily', target: 1, unit: 'جزء', category: 'spiritual', completedDates: [], streak: 0, bestStreak: 0, createdAt: new Date().toISOString() },
        { name: 'صلاة الفجر في وقتها', icon: '🕌', color: '#d4ac0d', frequency: 'daily', target: 1, unit: 'مرة', category: 'spiritual', completedDates: [], streak: 0, bestStreak: 0, createdAt: new Date().toISOString() },
        { name: 'شرب الماء', icon: '💧', color: '#3498db', frequency: 'daily', target: 8, unit: 'كوب', category: 'health', completedDates: [], streak: 0, bestStreak: 0, createdAt: new Date().toISOString() },
        { name: 'التمرين', icon: '💪', color: '#e74c3c', frequency: 'daily', target: 30, unit: 'دقيقة', category: 'health', completedDates: [], streak: 0, bestStreak: 0, createdAt: new Date().toISOString() },
        { name: 'القراءة', icon: '📚', color: '#9b59b6', frequency: 'daily', target: 20, unit: 'دقيقة', category: 'learning', completedDates: [], streak: 0, bestStreak: 0, createdAt: new Date().toISOString() }
      ]);
    }
  } catch (error) {
    console.error('Error seeding defaults:', error);
  }
}

/* ─────────────────────────────────────────────────────
   Tasks CRUD
   ───────────────────────────────────────────────────── */

async function getCachedTasks() {
  const cached = DataCache.get('tasks');
  if (cached) return cached;
  const tasks = await db.tasks.orderBy('createdAt').reverse().toArray();
  DataCache.set('tasks', tasks, 60000);
  return tasks;
}

async function addTask(task) {
  try {
    const now = new Date().toISOString();
    DataCache.invalidate('tasks');
    return await db.tasks.add({
      title: task.title,
      description: task.description || '',
      niyyah: task.niyyah || '',
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      dueDate: task.dueDate || null,
      hijriDate: task.hijriDate || null,
      prayerLink: task.prayerLink || null,
      assignee: task.assignee || null,
      tags: task.tags || [],
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    console.error('Error adding task:', error);
    throw error;
  }
}

async function updateTask(id, updates) {
  try {
    updates.updatedAt = new Date().toISOString();
    DataCache.invalidate('tasks');
    return await db.tasks.update(id, updates);
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

async function deleteTask(id) {
  try {
    DataCache.invalidate('tasks');
    return await db.tasks.delete(id);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

async function getTask(id) {
  try {
    return await db.tasks.get(id);
  } catch (error) {
    console.error('Error getting task:', error);
    return null;
  }
}

async function getAllTasks(filter = {}) {
  try {
    let collection = db.tasks.orderBy('createdAt').reverse();
    let tasks = await collection.toArray();

    if (filter.priority) {
      tasks = tasks.filter(t => t.priority === filter.priority);
    }
    if (filter.status) {
      tasks = tasks.filter(t => t.status === filter.status);
    }
    if (filter.tags && filter.tags.length > 0) {
      tasks = tasks.filter(t => t.tags?.some(tag => filter.tags.includes(tag)));
    }
    if (filter.search) {
      const term = filter.search.toLowerCase();
      tasks = tasks.filter(t =>
        t.title?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
      );
    }
    if (filter.dueDate) {
      tasks = tasks.filter(t => t.dueDate === filter.dueDate);
    }

    return tasks;
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
}

async function getTasksByStatus(status) {
  try {
    return await db.tasks.where('status').equals(status).sortBy('createdAt');
  } catch (error) {
    console.error('Error getting tasks by status:', error);
    return [];
  }
}

async function toggleTaskComplete(id) {
  try {
    const task = await db.tasks.get(id);
    if (!task) return null;

    const completed = !task.completed;
    await db.tasks.update(id, {
      completed,
      status: completed ? 'done' : 'todo',
      updatedAt: new Date().toISOString()
    });
    return { ...task, completed, status: completed ? 'done' : 'todo' };
  } catch (error) {
    console.error('Error toggling task:', error);
    return null;
  }
}

/* ─────────────────────────────────────────────────────
   Projects CRUD
   ───────────────────────────────────────────────────── */

async function addProject(project) {
  try {
    return await db.projects.add({
      name: project.name,
      color: project.color || '#1a5276',
      description: project.description || '',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding project:', error);
    throw error;
  }
}

async function updateProject(id, updates) {
  try {
    return await db.projects.update(id, updates);
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

async function deleteProject(id) {
  try {
    return await db.projects.delete(id);
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

async function getAllProjects() {
  try {
    return await db.projects.orderBy('name').toArray();
  } catch (error) {
    console.error('Error getting projects:', error);
    return [];
  }
}

async function getProject(id) {
  try {
    return await db.projects.get(id);
  } catch (error) {
    console.error('Error getting project:', error);
    return null;
  }
}

/* ─────────────────────────────────────────────────────
   Notes CRUD
   ───────────────────────────────────────────────────── */

async function addNote(note) {
  try {
    DataCache.invalidate('notes');
    return await db.notes.add({
      title: note.title,
      content: note.content || '',
      color: note.color || '#161b22',
      tags: note.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
}

async function updateNote(id, updates) {
  try {
    updates.updatedAt = new Date().toISOString();
    DataCache.invalidate('notes');
    return await db.notes.update(id, updates);
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  }
}

async function deleteNote(id) {
  try {
    DataCache.invalidate('notes');
    return await db.notes.delete(id);
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
}

async function getAllNotes() {
  try {
    return await db.notes.orderBy('createdAt').reverse().toArray();
  } catch (error) {
    console.error('Error getting notes:', error);
    return [];
  }
}

async function getNote(id) {
  try {
    return await db.notes.get(id);
  } catch (error) {
    console.error('Error getting note:', error);
    return null;
  }
}

/* ─────────────────────────────────────────────────────
   Habits CRUD
   ───────────────────────────────────────────────────── */

async function addHabit(habit) {
  try {
    return await db.habits.add({
      name: habit.name,
      icon: habit.icon || '📖',
      color: habit.color || '#3498db',
      frequency: habit.frequency || 'daily',
      target: habit.target || null,
      unit: habit.unit || 'مرة',
      category: habit.category || 'other',
      completedDates: [],
      streak: 0,
      bestStreak: 0,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding habit:', error);
    throw error;
  }
}

async function updateHabit(id, updates) {
  try {
    DataCache.invalidate('habits');
    return await db.habits.update(id, updates);
  } catch (error) {
    console.error('Error updating habit:', error);
    throw error;
  }
}

async function deleteHabit(id) {
  try {
    DataCache.invalidate('habits');
    return await db.habits.delete(id);
  } catch (error) {
    console.error('Error deleting habit:', error);
    throw error;
  }
}

async function getCachedHabits() {
  const cached = DataCache.get('habits');
  if (cached) return cached;
  const habits = await db.habits.orderBy('name').toArray();
  DataCache.set('habits', habits, 60000);
  return habits;
}

async function getAllHabits() {
  try {
    return await db.habits.orderBy('name').toArray();
  } catch (error) {
    console.error('Error getting habits:', error);
    return [];
  }
}

async function completeHabit(id, date) {
  try {
    const habit = await db.habits.get(id);
    if (!habit) return null;

    const dateStr = date || new Date().toISOString().split('T')[0];
    const completedDates = [...(habit.completedDates || [])];

    if (!completedDates.includes(dateStr)) {
      completedDates.push(dateStr);
    }

    DataCache.invalidate('habits');
    await db.habits.update(id, { completedDates });
    return completedDates;
  } catch (error) {
    console.error('Error completing habit:', error);
    return null;
  }
}

async function uncompleteHabit(id, date) {
  try {
    const habit = await db.habits.get(id);
    if (!habit) return null;

    const dateStr = date || new Date().toISOString().split('T')[0];
    const completedDates = (habit.completedDates || []).filter(d => d !== dateStr);

    await db.habits.update(id, { completedDates });
    return completedDates;
  } catch (error) {
    console.error('Error uncompleting habit:', error);
    return null;
  }
}

async function getHabitStreak(id) {
  try {
    const habit = await db.habits.get(id);
    if (!habit || !habit.completedDates?.length) return 0;

    const sorted = [...habit.completedDates].sort().reverse();
    let streak = 1;
    const today = new Date();

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = new Date(sorted[i]);
      const prev = new Date(sorted[i + 1]);
      const diff = Math.floor((current - prev) / (1000 * 60 * 60 * 24));

      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Error getting habit streak:', error);
    return 0;
  }
}

async function dbToggleHabitDate(id, dateStr) {
  try {
    const habit = await db.habits.get(id);
    if (!habit) return null;
    const completedDates = [...(habit.completedDates || [])];
    const idx = completedDates.indexOf(dateStr);
    if (idx >= 0) {
      completedDates.splice(idx, 1);
    } else {
      completedDates.push(dateStr);
    }
    DataCache.invalidate('habits');
    await db.habits.update(id, { completedDates });
    return completedDates;
  } catch (error) {
    console.error('Error toggling habit date:', error);
    return null;
  }
}

async function dbGetHabitStats(id) {
  try {
    const habit = await db.habits.get(id);
    if (!habit) return null;
    const dates = habit.completedDates || [];
    const streak = calculateStreak(dates);
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    let completedLast30 = 0;
    for (const d of dates) {
      const dateObj = new Date(d);
      if (dateObj >= thirtyDaysAgo && dateObj <= today) completedLast30++;
    }
    const completionRate = Math.round((completedLast30 / 30) * 100);
    return { streak, bestStreak: habit.bestStreak || streak, completionRate, totalDays: dates.length, unit: habit.unit || 'مرة' };
  } catch (error) {
    console.error('Error getting habit stats:', error);
    return null;
  }
}

function calculateStreak(completedDates) {
  const unique = [...new Set(completedDates)];
  const sorted = unique.sort().reverse();
  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (sorted.includes(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/* ─────────────────────────────────────────────────────
   Team Members CRUD
   ───────────────────────────────────────────────────── */

async function addTeamMember(member) {
  try {
    const now = new Date().toISOString();
    return await db.teamMembers.add({
      name: member.name,
      role: member.role || 'عضو',
      email: member.email || '',
      phone: member.phone || '',
      color: member.color || '#3498db',
      notes: member.notes || '',
      createdAt: now
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    throw error;
  }
}

async function updateTeamMember(id, updates) {
  try {
    return await db.teamMembers.update(id, updates);
  } catch (error) {
    console.error('Error updating team member:', error);
    throw error;
  }
}

async function deleteTeamMember(id) {
  try {
    return await db.teamMembers.delete(id);
  } catch (error) {
    console.error('Error deleting team member:', error);
    throw error;
  }
}

async function getAllTeamMembers() {
  try {
    return await db.teamMembers.orderBy('name').toArray();
  } catch (error) {
    console.error('Error getting team members:', error);
    return [];
  }
}

async function getTeamMember(id) {
  try {
    return await db.teamMembers.get(id);
  } catch (error) {
    console.error('Error getting team member:', error);
    return null;
  }
}

/* ─────────────────────────────────────────────────────
   Pomodoro Sessions CRUD
   ───────────────────────────────────────────────────── */

async function addPomodoroSession(session) {
  try {
    return await db.pomodoroSessions.add({
      taskId: session.taskId || null,
      duration: session.duration || 25,
      type: session.type || 'work',
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding pomodoro session:', error);
    throw error;
  }
}

async function getPomodoroSessions(filter = {}) {
  try {
    let collection = db.pomodoroSessions.orderBy('completedAt').reverse();
    let sessions = await collection.toArray();
    if (filter.type) sessions = sessions.filter(s => s.type === filter.type);
    if (filter.taskId) sessions = sessions.filter(s => s.taskId === filter.taskId);
    if (filter.days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filter.days);
      sessions = sessions.filter(s => new Date(s.completedAt) >= cutoff);
    }
    return sessions;
  } catch (error) {
    console.error('Error getting pomodoro sessions:', error);
    return [];
  }
}

async function getTodayPomodoroCount() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sessions = await db.pomodoroSessions
      .where('type').equals('work')
      .toArray();
    return sessions.filter(s => s.completedAt.startsWith(today)).length;
  } catch (error) {
    console.error('Error getting today pomodoro count:', error);
    return 0;
  }
}

/* ─────────────────────────────────────────────────────
   Weekly Reviews CRUD
   ───────────────────────────────────────────────────── */

async function addWeeklyReview(review) {
  try {
    return await db.weeklyReviews.add({
      weekStart: review.weekStart,
      accomplishments: review.accomplishments || '',
      challenges: review.challenges || '',
      goals: review.goals || '',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding weekly review:', error);
    throw error;
  }
}

async function getLastWeeklyReview() {
  try {
    const reviews = await db.weeklyReviews.orderBy('createdAt').reverse().toArray();
    return reviews.length > 0 ? reviews[0] : null;
  } catch (error) {
    console.error('Error getting last weekly review:', error);
    return null;
  }
}

async function getWeeklyReviews() {
  try {
    return await db.weeklyReviews.orderBy('createdAt').reverse().toArray();
  } catch (error) {
    console.error('Error getting weekly reviews:', error);
    return [];
  }
}

/* ─────────────────────────────────────────────────────
   Settings CRUD
   ───────────────────────────────────────────────────── */

async function getSetting(key) {
  try {
    const setting = await db.settings.get({ key });
    return setting ? setting.value : null;
  } catch (error) {
    console.error(`Error getting setting "${key}":`, error);
    return null;
  }
}

async function setSetting(key, value) {
  try {
    await db.settings.put({ key, value });
    return true;
  } catch (error) {
    console.error(`Error setting "${key}":`, error);
    return false;
  }
}

async function getAllSettings() {
  try {
    const settings = await db.settings.toArray();
    return settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error getting all settings:', error);
    return {};
  }
}

async function getPrayerSettings() {
  try {
    const city = await getSetting('city') || 'Cairo';
    const method = await getSetting('prayerMethod') || 'Egypt';
    const notifications = await getSetting('notifications') !== false;
    return { city, method, notifications };
  } catch (error) {
    console.error('Error getting prayer settings:', error);
    return { city: 'Cairo', method: 'Egypt', notifications: true };
  }
}

async function updatePrayerSettings(updates) {
  try {
    if (updates.city) await setSetting('city', updates.city);
    if (updates.method) await setSetting('prayerMethod', updates.method);
    if (updates.notifications !== undefined) await setSetting('notifications', updates.notifications);
    return true;
  } catch (error) {
    console.error('Error updating prayer settings:', error);
    return false;
  }
}

/* ─────────────────────────────────────────────────────
   Stats & Analytics Helpers
   ───────────────────────────────────────────────────── */

async function getTaskStats() {
  try {
    const tasks = await db.tasks.toArray();
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'done' || t.completed).length,
      inProgress: tasks.filter(t => t.status === 'inProgress').length,
      todo: tasks.filter(t => t.status === 'todo' && !t.completed).length,
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length
    };
  } catch (error) {
    console.error('Error getting task stats:', error);
    return { total: 0, completed: 0, inProgress: 0, todo: 0, high: 0, medium: 0, low: 0 };
  }
}

async function clearAllData() {
  try {
    await Promise.all([
      db.tasks.clear(),
      db.projects.clear(),
      db.notes.clear(),
      db.habits.clear(),
      db.teamMembers.clear(),
      db.pomodoroSessions.clear(),
      db.weeklyReviews.clear()
    ]);
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
}

async function exportAllData() {
  try {
    return {
      tasks: await db.tasks.toArray(),
      projects: await db.projects.toArray(),
      notes: await db.notes.toArray(),
      habits: await db.habits.toArray(),
      teamMembers: await db.teamMembers.toArray(),
      settings: await db.settings.toArray(),
      pomodoroSessions: await db.pomodoroSessions.toArray(),
      weeklyReviews: await db.weeklyReviews.toArray(),
      exportedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    return null;
  }
}

async function importAllData(data) {
  try {
    if (data.tasks) {
      await db.tasks.clear();
      await db.tasks.bulkAdd(data.tasks);
    }
    if (data.projects) {
      await db.projects.clear();
      await db.projects.bulkAdd(data.projects);
    }
    if (data.notes) {
      await db.notes.clear();
      await db.notes.bulkAdd(data.notes);
    }
    if (data.habits) {
      await db.habits.clear();
      await db.habits.bulkAdd(data.habits);
    }
    if (data.teamMembers) {
      await db.teamMembers.clear();
      await db.teamMembers.bulkAdd(data.teamMembers);
    }
    if (data.settings) {
      await db.settings.clear();
      await db.settings.bulkAdd(data.settings);
    }
    if (data.pomodoroSessions) {
      await db.pomodoroSessions.clear();
      await db.pomodoroSessions.bulkAdd(data.pomodoroSessions);
    }
    if (data.weeklyReviews) {
      await db.weeklyReviews.clear();
      await db.weeklyReviews.bulkAdd(data.weeklyReviews);
    }
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.DataCache = DataCache;
  window.db = db;
  window.initDB = initDB;
  window.addTask = addTask;
  window.updateTask = updateTask;
  window.deleteTask = deleteTask;
  window.getTask = getTask;
  window.getAllTasks = getAllTasks;
  window.getTasksByStatus = getTasksByStatus;
  window.toggleTaskComplete = toggleTaskComplete;
  window.addProject = addProject;
  window.updateProject = updateProject;
  window.deleteProject = deleteProject;
  window.getAllProjects = getAllProjects;
  window.getProject = getProject;
  window.addNote = addNote;
  window.updateNote = updateNote;
  window.deleteNote = deleteNote;
  window.getAllNotes = getAllNotes;
  window.getNote = getNote;
  window.addHabit = addHabit;
  window.updateHabit = updateHabit;
  window.deleteHabit = deleteHabit;
  window.getAllHabits = getAllHabits;
  window.completeHabit = completeHabit;
  window.uncompleteHabit = uncompleteHabit;
  window.getHabitStreak = getHabitStreak;
  window.dbGetHabitStats = dbGetHabitStats;
  window.calculateStreak = calculateStreak;
  window.dbToggleHabitDate = dbToggleHabitDate;
  window.addTeamMember = addTeamMember;
  window.updateTeamMember = updateTeamMember;
  window.deleteTeamMember = deleteTeamMember;
  window.getAllTeamMembers = getAllTeamMembers;
  window.getTeamMember = getTeamMember;
  window.getSetting = getSetting;
  window.setSetting = setSetting;
  window.getAllSettings = getAllSettings;
  window.getPrayerSettings = getPrayerSettings;
  window.updatePrayerSettings = updatePrayerSettings;
  window.getCachedTasks = getCachedTasks;
  window.getCachedHabits = getCachedHabits;
  window.getTaskStats = getTaskStats;
  window.clearAllData = clearAllData;
  window.exportAllData = exportAllData;
  window.importAllData = importAllData;
  window.addPomodoroSession = addPomodoroSession;
  window.getPomodoroSessions = getPomodoroSessions;
  window.getTodayPomodoroCount = getTodayPomodoroCount;
  window.addWeeklyReview = addWeeklyReview;
  window.getLastWeeklyReview = getLastWeeklyReview;
  window.getWeeklyReviews = getWeeklyReviews;
}
