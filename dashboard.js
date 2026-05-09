'use strict';

/**
 * نظام حياة المسلم — صفحة Dashboard (Phase 2)
 * لوحة التحكم الذكية
 */

const Dashboard = {
  prayerTimings: null,
  nextPrayerTimer: null,
  refreshTimer: null,
  dhikrIndex: 0,
  dhikrCounter: 0,

  adhkar: [
    { text: 'سبحان الله', target: 33, full: 'سبحان الله وبحمده، سبحان الله العظيم' },
    { text: 'الحمد لله', target: 33, full: 'الحمد لله رب العالمين' },
    { text: 'الله أكبر', target: 33, full: 'الله أكبر كبيرًا' },
    { text: 'لا إله إلا الله', target: 100, full: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير' },
    { text: 'أستغفر الله', target: 100, full: 'أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه' },
    { text: 'لا حول ولا قوة إلا بالله', target: 33, full: 'لا حول ولا قوة إلا بالله العلي العظيم' },
    { text: 'سبحان الله وبحمده', target: 100, full: 'سبحان الله وبحمده، سبحان الله العظيم' },
    { text: 'اللهم صل على محمد', target: 100, full: 'اللهم صل وسلم على نبينا محمد' }
  ],

  async init() {
    try {
      await this.loadPrayerData();
      this.startTimers();
      await this.render();
      this.bindEvents();
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      showToast('خطأ في تحميل لوحة التحكم', 'error');
    }
  },

  async loadPrayerData() {
    try {
      const today = new Date().toDateString();
      const cached = await getSetting('prayerData');

      if (cached && cached.date === today && cached.timings) {
        this.prayerTimings = cached.timings;
      } else {
        const data = await refreshPrayerTimes();
      if (data?.timings) {
        this.prayerTimings = data.timings;
        await setSetting('prayerData', { date: today, timings: data.timings });
        updatePrayerDisplay(data.timings);
      }
      }

      if (!this.prayerTimings) {
        this.prayerTimings = getDefaultPrayerTimes().timings;
      }
    } catch (error) {
      console.error('Error loading prayer data:', error);
      this.prayerTimings = getDefaultPrayerTimes().timings;
    }
  },

  startTimers() {
    try {
      this.updateCountdown();
      this.nextPrayerTimer = setInterval(() => this.updateCountdown(), 1000);

      this.refreshData();
      this.refreshTimer = setInterval(() => this.refreshData(), 60000);
    } catch (error) {
      console.error('Error starting timers:', error);
    }
  },

  stopTimers() {
    try {
      if (this.nextPrayerTimer) { clearInterval(this.nextPrayerTimer); this.nextPrayerTimer = null; }
      if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }
    } catch (error) {
      console.error('Error stopping timers:', error);
    }
  },

  async refreshData() {
    try {
      await this.loadPrayerData();
      await this.updateStats();
      await this.updateTodayTasks();
      await this.updateWeeklyChart();
      this.updatePrayerCards();
      this.updateCountdown();
      await this.updateHabitsWidget();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    }
  },

  async render() {
    try {
      const container = document.getElementById('pageContent');
      if (!container) return;

      container.innerHTML = `
        <div class="page active" style="color:var(--text);">
          <!-- Row 1: Quick Stats -->
          <div class="grid grid-4" id="dashStats">
            <div class="stat-card accent">
              <div class="stat-icon"><i data-lucide="check-square"></i></div>
              <div class="stat-value" id="statTasks">0/0</div>
              <div class="stat-label">مهام اليوم</div>
              <div class="progress-bar" style="margin-top:var(--spacing-sm);"><div class="progress-fill accent" id="statTasksBar" style="width:0%"></div></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon"><i data-lucide="clock"></i></div>
              <div class="stat-value" id="statTimeLeft">--:--</div>
              <div class="stat-label">الوقت حتى الصلاة</div>
              <div class="stat-change" id="statNextPrayerName"></div>
            </div>
            <div class="stat-card success">
              <div class="stat-icon"><i data-lucide="sprout"></i></div>
              <div class="stat-value" id="statHabits">0/0</div>
              <div class="stat-label">العادات اليومية</div>
              <div class="progress-bar" style="margin-top:var(--spacing-sm);"><div class="progress-fill success" id="statHabitsBar" style="width:0%"></div></div>
            </div>
            <div class="stat-card warning">
              <div class="stat-icon"><i data-lucide="star"></i></div>
              <div class="stat-value" id="statPoints">0</div>
              <div class="stat-label">النقاط</div>
              <div class="stat-change positive" id="statPointsMsg">ابدأ المهام لكسب نقاط!</div>
            </div>
          </div>

          <!-- Row 2: Prayer Times -->
          <div class="card" style="margin-top:var(--spacing-xl);">
            <div class="card-header">
              <h3 class="card-title"><i data-lucide="mosque"></i> أوقات الصلاة اليوم</h3>
              <button class="btn btn-ghost btn-sm" id="dashRefreshPrayer"><i data-lucide="refresh-cw"></i></button>
            </div>
            <div class="prayer-grid" id="dashPrayers"></div>
            <div style="text-align:center;margin-top:var(--spacing-md);">
              <span class="badge badge-accent" id="dashCountdown">--:--:--</span>
            </div>
          </div>

          <!-- Habits Widget -->
          <div class="card" style="margin-top:var(--spacing-xl);" id="dashHabitsWidget">
            <div class="card-header">
              <h3 class="card-title"><i data-lucide="sprout"></i> العادات اليوم</h3>
              <a href="#habits" class="btn btn-ghost btn-sm">عرض الكل <i data-lucide="arrow-left" style="width:14px;height:14px;"></i></a>
            </div>
            <div id="dashHabitsList"><div class="loading"><div class="spinner"></div></div></div>
          </div>

          <!-- Row 3: Two Columns -->
          <div class="grid grid-2" style="margin-top:var(--spacing-xl);">
            <!-- Today's Tasks -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title"><i data-lucide="list-todo"></i> مهام اليوم</h3>
                <button class="btn btn-primary btn-sm" id="dashQuickAdd"><i data-lucide="plus"></i> مهمة سريعة</button>
              </div>
              <div id="dashQuickInput" style="display:none;margin-bottom:var(--spacing-md);">
                <div style="display:flex;gap:var(--spacing-sm);">
                  <input type="text" id="quickTaskInput" class="form-input" placeholder="اكتب المهمة..." onkeypress="Dashboard.handleQuickKey(event)">
                  <select id="quickTaskPriority" class="form-select" style="width:100px;">
                    <option value="low">منخفض</option>
                    <option value="medium" selected>متوسط</option>
                    <option value="high">عالي</option>
                  </select>
                  <button class="btn btn-primary" onclick="Dashboard.addQuickTask()">أضف</button>
                </div>
              </div>
              <div id="dashTodayTasks"></div>
            </div>

            <!-- Weekly Activity -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title"><i data-lucide="activity"></i> نشاط الأسبوع</h3>
              </div>
              <div style="height:250px;"><canvas id="weeklyChart"></canvas></div>
            </div>
          </div>

          <!-- Row 4: Daily Dhikr -->
          <div class="card" style="margin-top:var(--spacing-xl);">
            <div class="card-header">
              <h3 class="card-title"><i data-lucide="book-heart"></i> الذكر اليومي</h3>
              <button class="btn btn-ghost btn-sm" id="dashNextDhikr"><i data-lucide="skip-forward"></i> ذكر تالي</button>
            </div>
            <div style="text-align:center;padding:var(--spacing-lg);">
              <p style="font-size:1.5rem;font-weight:700;margin-bottom:var(--spacing-sm);" id="dhikrText">سبحان الله</p>
              <p style="font-size:1rem;color:var(--text-muted);margin-bottom:var(--spacing-lg);" id="dhikrFull"></p>
              <div style="display:flex;align-items:center;justify-content:center;gap:var(--spacing-xl);">
                <div style="text-align:center;">
                  <div style="font-size:3rem;font-weight:800;font-family:var(--font-mono);color:var(--accent);" id="dhikrCount">0</div>
                  <div style="font-size:0.875rem;color:var(--text-muted);">من <span id="dhikrTarget">33</span></div>
                </div>
                <button class="btn btn-accent btn-lg" id="dhikrBtn" style="width:120px;height:120px;border-radius:50%;font-size:1.25rem;font-weight:700;">
                  اضغط
                </button>
                <button class="btn btn-ghost btn-lg" id="dhikrReset" style="color:var(--danger);">
                  <i data-lucide="rotate-ccw"></i>
                  إعادة
                </button>
              </div>
              <div class="progress-bar" style="max-width:300px;margin:var(--spacing-md) auto 0;">
                <div class="progress-fill accent" id="dhikrBar" style="width:0%"></div>
              </div>
            </div>
          </div>
        </div>
      `;

      this.updatePrayerCards();
      await this.updateStats();
      await this.updateTodayTasks();
      await this.updateWeeklyChart();
      this.updateDhikrDisplay();
      await this.updateHabitsWidget();

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error rendering dashboard:', error);
      container.innerHTML = `<div class="page active" style="padding:2rem;text-align:center;color:var(--text);">
        <p style="color:var(--text-muted);">⚠️ حدث خطأ أثناء تحميل لوحة التحكم</p>
        <button onclick="Dashboard.init()" class="btn btn-primary" style="margin-top:1rem;">إعادة المحاولة</button>
      </div>`;
    }
  },

  /* ─────────────────────────────────────────────────────
     Stats
     ───────────────────────────────────────────────────── */

  async updateStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayTasks = await db.tasks.where('dueDate').equals(today).toArray();
      const totalToday = todayTasks.length;
      const doneToday = todayTasks.filter(t => t.status === 'done').length;

      const tasksEl = document.getElementById('statTasks');
      const tasksBar = document.getElementById('statTasksBar');
      if (tasksEl) tasksEl.textContent = `${doneToday}/${totalToday}`;
      if (tasksBar) tasksBar.style.width = `${calculateProgress(doneToday, totalToday)}%`;

      const habits = await getAllHabits();
      const todayStr = new Date().toISOString().split('T')[0];
      const doneHabits = habits.filter(h => h.completedDates?.includes(todayStr)).length;
      const totalHabits = habits.length;

      const habitsEl = document.getElementById('statHabits');
      const habitsBar = document.getElementById('statHabitsBar');
      if (habitsEl) habitsEl.textContent = `${doneHabits}/${totalHabits}`;
      if (habitsBar) habitsBar.style.width = `${calculateProgress(doneHabits, totalHabits)}%`;

      const allTasks = await db.tasks.toArray();
      let points = 0;
      allTasks.forEach(t => {
        if (t.status === 'done') {
          if (t.priority === 'high') points += 30;
          else if (t.priority === 'medium') points += 20;
          else points += 10;
        }
      });

      const pointsEl = document.getElementById('statPoints');
      const pointsMsg = document.getElementById('statPointsMsg');
      if (pointsEl) pointsEl.textContent = points;
      if (pointsMsg) {
        if (points >= 200) pointsMsg.textContent = '⭐ ماشاء الله! أداء ممتاز';
        else if (points >= 100) pointsMsg.textContent = '🔥 استمرار رائع!';
        else if (points > 0) pointsMsg.textContent = '💪 بداية جيدة!';
        else pointsMsg.textContent = 'ابدأ المهام لكسب نقاط!';
      }

      await this.loadPrayerData();
      this.updateCountdown();
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Prayer Times
     ───────────────────────────────────────────────────── */

  updatePrayerCards() {
    try {
      const container = document.getElementById('dashPrayers');
      if (!container || !this.prayerTimings) return;

      const prayers = [
        { name: 'الفجر', key: 'Fajr', icon: 'cloud-sun' },
        { name: 'الشروق', key: 'Sunrise', icon: 'sunrise' },
        { name: 'الظهر', key: 'Dhuhr', icon: 'sun' },
        { name: 'العصر', key: 'Asr', icon: 'sun-dim' },
        { name: 'المغرب', key: 'Maghrib', icon: 'sunset' },
        { name: 'العشاء', key: 'Isha', icon: 'moon' }
      ];

      const current = getCurrentPrayer(this.prayerTimings);

      container.innerHTML = prayers.map(p => `
        <div class="prayer-card ${current.key === p.key ? 'current' : ''}">
          <i data-lucide="${p.icon}" style="width:24px;height:24px;margin:0 auto var(--spacing-sm);color:var(--accent);"></i>
          <div class="prayer-card-name">${p.name}</div>
          <div class="prayer-card-time">${this.prayerTimings[p.key] || '--:--'}</div>
        </div>
      `).join('');

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error updating prayer cards:', error);
    }
  },

  updateCountdown() {
    try {
      if (!this.prayerTimings) return;

      const next = getNextPrayer(this.prayerTimings);
      const countdownEl = document.getElementById('dashCountdown');
      const timeEl = document.getElementById('statTimeLeft');
      const nameEl = document.getElementById('statNextPrayerName');

      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const nowSeconds = nowMinutes * 60 + now.getSeconds();

      const [nextHours, nextMinutes] = next.time.split(':').map(Number);
      let nextTotalSeconds = nextHours * 3600 + nextMinutes * 60;

      if (nextTotalSeconds <= nowSeconds) {
        nextTotalSeconds += 24 * 3600;
      }

      const diff = nextTotalSeconds - nowSeconds;
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;

      if (countdownEl) countdownEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (timeEl) timeEl.textContent = `${h}:${String(m).padStart(2,'0')}`;
      if (nameEl) nameEl.textContent = `⏳ ${next.name}`;
    } catch (error) {
      console.error('Error updating countdown:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Today's Tasks
     ───────────────────────────────────────────────────── */

  async updateTodayTasks() {
    try {
      const container = document.getElementById('dashTodayTasks');
      if (!container) return;

      const today = new Date().toISOString().split('T')[0];
      const tasks = await db.tasks.where('dueDate').equals(today).toArray();

      if (tasks.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i data-lucide="check-circle" class="empty-state-icon"></i>
            <p>مفيش مهام اليوم — استمتع بوقتك! 🎉</p>
          </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
      }

      const sorted = tasks.sort((a, b) => {
        const pOrder = { high: 0, medium: 1, low: 2 };
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        return (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1);
      });

      container.innerHTML = sorted.map(t => `
        <div class="task-item ${t.status === 'done' ? 'completed' : ''}">
          <div class="task-checkbox" onclick="Dashboard.quickToggle(${t.id})">
            ${t.status === 'done' ? '<i data-lucide="check" style="width:14px;height:14px;"></i>' : ''}
          </div>
          <span class="task-title">${sanitizeHTML(t.title)}</span>
          <span class="task-priority ${getPriorityClass(t.priority)}">${getPriorityLabel(t.priority)}</span>
        </div>
      `).join('');

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error updating today tasks:', error);
    }
  },

  async quickToggle(id) {
    try {
      await toggleTaskComplete(id);
      await this.updateStats();
      await this.updateTodayTasks();
      await this.updateWeeklyChart();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  },

  showQuickInput() {
    try {
      const input = document.getElementById('dashQuickInput');
      if (input) {
        input.style.display = 'block';
        document.getElementById('quickTaskInput')?.focus();
      }
    } catch (error) {
      console.error('Error showing quick input:', error);
    }
  },

  handleQuickKey(e) {
    if (e.key === 'Enter') this.addQuickTask();
    if (e.key === 'Escape') {
      const input = document.getElementById('dashQuickInput');
      if (input) input.style.display = 'none';
    }
  },

  async addQuickTask() {
    try {
      const input = document.getElementById('quickTaskInput');
      if (!input) return;
      const title = input.value.trim();
      if (!title) { showToast('اكتب عنوان المهمة', 'warning'); return; }

      const priority = document.getElementById('quickTaskPriority')?.value || 'medium';
      const today = new Date().toISOString().split('T')[0];

      await addTask({
        title,
        description: '',
        priority,
        status: 'todo',
        dueDate: today,
        hijriDate: toHijri(new Date())?.full || null,
        prayerLink: null,
        tags: ['يوم']
      });

      input.value = '';
      await this.updateStats();
      await this.updateTodayTasks();
      showToast('تم إضافة المهمة', 'success');
    } catch (error) {
      console.error('Error adding quick task:', error);
      showToast('خطأ في الإضافة', 'error');
    }
  },

  /* ─────────────────────────────────────────────────────
     Weekly Chart
     ───────────────────────────────────────────────────── */

  async updateWeeklyChart() {
    try {
      const canvas = document.getElementById('weeklyChart');
      if (!canvas) return;

      const tasks = await db.tasks.where('status').equals('done').toArray();
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);

      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const weekData = new Array(7).fill(0);

      tasks.forEach(t => {
        if (t.updatedAt) {
          const d = new Date(t.updatedAt);
          if (d >= startOfWeek) {
            const idx = d.getDay();
            weekData[idx]++;
          }
        }
      });

      if (window._weeklyChartInstance) {
        window._weeklyChartInstance.data.datasets[0].data = weekData;
        window._weeklyChartInstance.update();
        return;
      }

      window._weeklyChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
          labels: days,
          datasets: [{
            label: 'مهام منجزة',
            data: weekData,
            borderColor: '#148f77',
            backgroundColor: 'rgba(20, 143, 119, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#148f77',
            pointBorderColor: '#161b22',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: '#8b949e', stepSize: 1 },
              grid: { color: 'rgba(48, 54, 61, 0.5)' }
            },
            x: {
              ticks: { color: '#8b949e' },
              grid: { display: false }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error updating weekly chart:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Dhikr Counter
     ───────────────────────────────────────────────────── */

  updateDhikrDisplay() {
    try {
      const dhikr = this.adhkar[this.dhikrIndex];
      const textEl = document.getElementById('dhikrText');
      const fullEl = document.getElementById('dhikrFull');
      const countEl = document.getElementById('dhikrCount');
      const targetEl = document.getElementById('dhikrTarget');
      const barEl = document.getElementById('dhikrBar');

      if (textEl) textEl.textContent = dhikr.text;
      if (fullEl) fullEl.textContent = dhikr.full;
      if (countEl) countEl.textContent = this.dhikrCounter;
      if (targetEl) targetEl.textContent = dhikr.target;
      if (barEl) barEl.style.width = `${calculateProgress(this.dhikrCounter, dhikr.target)}%`;

      if (this.dhikrCounter >= dhikr.target) {
        if (countEl) countEl.style.color = 'var(--success)';
      } else {
        if (countEl) countEl.style.color = 'var(--accent)';
      }
    } catch (error) {
      console.error('Error updating dhikr display:', error);
    }
  },

  incrementDhikr() {
    try {
      const dhikr = this.adhkar[this.dhikrIndex];
      if (this.dhikrCounter < dhikr.target) {
        this.dhikrCounter++;
        this.updateDhikrDisplay();

        if (this.dhikrCounter >= dhikr.target) {
          showToast(`أحسنت! أكملت ${dhikr.text}`, 'success');
        }

        if (navigator.vibrate) navigator.vibrate(50);
      }
    } catch (error) {
      console.error('Error incrementing dhikr:', error);
    }
  },

  nextDhikr() {
    try {
      this.dhikrIndex = (this.dhikrIndex + 1) % this.adhkar.length;
      this.dhikrCounter = 0;
      this.updateDhikrDisplay();
    } catch (error) {
      console.error('Error going to next dhikr:', error);
    }
  },

  resetDhikr() {
    try {
      this.dhikrCounter = 0;
      this.updateDhikrDisplay();
    } catch (error) {
      console.error('Error resetting dhikr:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Habits Widget
     ───────────────────────────────────────────────────── */

  async updateHabitsWidget() {
    try {
      const container = document.getElementById('dashHabitsList');
      if (!container) return;

      const habits = await getAllHabits();
      const today = new Date().toISOString().split('T')[0];
      const sorted = habits.sort((a, b) => ((a.completedDates || []).includes(today) ? 1 : 0) - ((b.completedDates || []).includes(today) ? 1 : 0));
      const top5 = sorted.slice(0, 5);

      if (top5.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:var(--spacing-md);"><i data-lucide="sprout" class="empty-state-icon" style="width:32px;height:32px;"></i><p style="font-size:0.875rem;">لا توجد عادات — <a href="#habits" style="color:var(--accent);">أضف عادة</a></p></div>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
      }

      container.innerHTML = top5.map(h => {
        const done = (h.completedDates || []).includes(today);
        return `
          <div class="habit-mini-item ${done ? 'done' : ''}" style="display:flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-xs) var(--spacing-sm);border-radius:var(--radius-md);transition:all .2s;margin-bottom:2px;">
            <span style="font-size:1.25rem;">${h.icon || '📖'}</span>
            <span style="flex:1;font-size:0.875rem;${done ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${sanitizeHTML(h.name)}</span>
            <button class="habit-dash-toggle ${done ? 'done' : ''}" data-id="${h.id}" style="width:28px;height:28px;border-radius:50%;border:2px solid ${done ? (h.color||'#3498db') : 'var(--border)'};background:${done ? (h.color||'#3498db') : 'transparent'};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.75rem;transition:all .2s;">
              ${done ? '✓' : '○'}
            </button>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.habit-dash-toggle').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          const habit = await db.habits.get(id);
          const todayStr = new Date().toISOString().split('T')[0];
          if (habit?.completedDates?.includes(todayStr)) {
            await uncompleteHabit(id, todayStr);
          } else {
            await completeHabit(id, todayStr);
          }
          await this.updateHabitsWidget();
          await this.updateStats();
        });
      });

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error updating habits widget:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Events
     ───────────────────────────────────────────────────── */

  bindEvents() {
    try {
      document.getElementById('dashRefreshPrayer')?.addEventListener('click', () => {
        showToast('جاري تحديث أوقات الصلاة...', 'info');
        setSetting('prayerData', null).then(async () => {
          await this.loadPrayerData();
          this.updatePrayerCards();
          this.updateCountdown();
          showToast('تم التحديث', 'success');
        });
      });

      document.getElementById('dashQuickAdd')?.addEventListener('click', () => this.showQuickInput());

      document.getElementById('dashNextDhikr')?.addEventListener('click', () => this.nextDhikr());

      document.getElementById('dhikrBtn')?.addEventListener('click', () => this.incrementDhikr());

      document.getElementById('dhikrReset')?.addEventListener('click', () => this.resetDhikr());

      document.getElementById('dhikrBtn')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.incrementDhikr();
        }
      });
    } catch (error) {
      console.error('Error binding events:', error);
    }
  }
};

if (typeof window !== 'undefined') {
  window.Dashboard = Dashboard;
}
