'use strict';

const Focus = {
  active: false,
  task: null,
  tasks: [],
  timer: null,
  state: 'idle',
  type: 'work',
  workDuration: 25,
  breakDuration: 5,
  timeLeft: 25 * 60,
  totalTime: 25 * 60,
  sessionCount: 0,
  maxSessions: 4,
  currentSession: 1,
  overlay: null,
  prayerInterval: null,
  previousPage: 'dashboard',

  async init(taskId) {
    this.previousPage = App && App.currentPage && App.currentPage !== 'focus' ? App.currentPage : 'dashboard';
    this.tasks = await getAllTasks({ status: 'todo' });
    if (taskId) {
      this.task = await getTask(taskId);
    } else if (this.tasks.length > 0) {
      this.task = this.tasks[0];
    } else {
      this.showEmptyState();
      return;
    }
    const settings = await getAllSettings();
    this.workDuration = settings.pomodoroDuration || 25;
    this.breakDuration = settings.pomodoroBreakDuration || 5;
    this.maxSessions = settings.pomodoroSessions || 4;
    this.state = 'idle';
    this.type = 'work';
    this.sessionCount = await getTodayPomodoroCount();
    this.currentSession = this.sessionCount + 1;
    this.timeLeft = this.workDuration * 60;
    this.totalTime = this.workDuration * 60;
    this.render();
    this.startPrayerCountdown();
  },

  showEmptyState() {
    const container = document.getElementById('pageContent');
    if (!container) return;
    container.innerHTML = `
      <div class="page active" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:1.5rem;text-align:center;padding:2rem;">
        <div style="font-size:4rem;">🎯</div>
        <h2 style="color:var(--text-primary);margin:0;font-size:1.5rem;">وضع التركيز</h2>
        <p style="color:var(--text-muted);margin:0;">لا توجد مهام نشطة للتركيز عليها</p>
        <button onclick="location.hash='tasks'" style="background:var(--primary);color:#fff;border:none;padding:.75rem 1.5rem;border-radius:10px;font-family:var(--font-arabic);font-size:1rem;cursor:pointer;margin-top:.5rem;">➕ إضافة مهمة جديدة</button>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  render() {
    if (this.overlay) this.overlay.remove();
    this.overlay = document.createElement('div');
    this.overlay.className = 'focus-overlay';
    this.overlay.innerHTML = `
      <div class="focus-container">
        <div class="focus-header">
          <button class="focus-btn-icon" onclick="Focus.end()" title="خروج">
            <i data-lucide="x"></i>
          </button>
          <div class="focus-session-info">الجلسة ${this.currentSession} من ${this.maxSessions}</div>
          <button class="focus-btn-icon" onclick="Focus.toggleTaskList()" title="تغيير المهمة">
            <i data-lucide="list"></i>
          </button>
        </div>

        <div class="focus-task-info">
          <h2 class="focus-task-title">${sanitizeHTML(this.task?.title || 'استراحة')}</h2>
          <p class="focus-task-desc">${sanitizeHTML(this.task?.description || (this.type === 'break' ? 'وقت الاستراحة' : ''))}</p>
        </div>

        <div class="focus-timer-wrapper">
          <svg class="focus-timer-svg" viewBox="0 0 220 220">
            <circle class="focus-timer-bg" cx="110" cy="110" r="95" />
            <circle class="focus-timer-progress" id="focusTimerCircle" cx="110" cy="110" r="95"
              stroke-dasharray="596.9" stroke-dashoffset="0"
              transform="rotate(-90 110 110)" />
            <text class="focus-timer-text" id="focusTimerText" x="110" y="110" text-anchor="middle" dominant-baseline="central">${this.formatTime(this.timeLeft)}</text>
            <text class="focus-timer-label" id="focusTimerLabel" x="110" y="140" text-anchor="middle">${this.type === 'work' ? 'تركيز' : 'استراحة'}</text>
          </svg>
        </div>

        <div class="focus-controls">
          <button class="focus-btn" id="focusSkipBtn" onclick="Focus.skip()" ${this.state === 'idle' ? 'disabled' : ''}>
            <i data-lucide="skip-forward"></i> تخطى
          </button>
          <button class="focus-btn focus-btn-primary" id="focusMainBtn" onclick="Focus.toggleTimer()">
            <i data-lucide="${this.state === 'running' ? 'pause' : 'play'}"></i> ${this.state === 'running' ? 'توقف' : 'ابدأ'}
          </button>
          <button class="focus-btn" id="focusDoneBtn" onclick="Focus.complete()" ${this.state === 'idle' ? 'disabled' : ''}>
            <i data-lucide="check"></i> أنجزت
          </button>
        </div>

        <div class="focus-prayer-info" id="focusPrayerInfo">
          <i data-lucide="clock" style="width:14px;height:14px;"></i>
          <span id="focusPrayerText">جاري تحميل وقت الصلاة...</span>
        </div>

        <div class="focus-task-list" id="focusTaskList" style="display:none;">
          <div class="focus-task-list-header">المهام</div>
          ${this.tasks.map(t => `
            <div class="focus-task-item ${t.id === this.task?.id ? 'active' : ''}" onclick="Focus.switchTask(${t.id})">
              <span class="focus-task-item-title">${sanitizeHTML(t.title)}</span>
              <span class="badge ${getPriorityClass(t.priority)}">${getPriorityLabel(t.priority)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);
    this.active = true;
    setTimeout(() => {
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }, 0);
    if (this.state === 'running') this.updateTimerDisplay();
  },

  toggleTimer() {
    if (this.state === 'running') {
      this.pause();
    } else if (this.state === 'paused' || this.state === 'idle') {
      this.start();
    }
  },

  start() {
    if (this.state === 'idle') {
      this.type = 'work';
      this.timeLeft = this.workDuration * 60;
      this.totalTime = this.workDuration * 60;
    }
    this.state = 'running';
    this.updateButtons();
    this.timer = setInterval(() => this.tick(), 1000);
  },

  pause() {
    this.state = 'paused';
    clearInterval(this.timer);
    this.updateButtons();
  },

  tick() {
    this.timeLeft--;
    this.updateTimerDisplay();
    if (this.timeLeft <= 0) {
      this.timerEnd();
    }
  },

  timerEnd() {
    clearInterval(this.timer);
    this.state = 'idle';
    this.playBeep();
    if (this.type === 'work') {
      addPomodoroSession({ taskId: this.task?.id, duration: this.workDuration, type: 'work' });
      this.sessionCount++;
      this.currentSession = this.sessionCount + 1;
      showToast('أحسنت! وقت الاستراحة 🎉', 'success');
      this.type = 'break';
      this.timeLeft = this.breakDuration * 60;
      this.totalTime = this.breakDuration * 60;
    } else {
      showToast('انتهت الاستراحة! عد للعمل 💪', 'info');
      this.type = 'work';
      this.timeLeft = this.workDuration * 60;
      this.totalTime = this.workDuration * 60;
      if (this.currentSession > this.maxSessions) {
        showToast('أكملت كل الجلسات! رائع 🎉', 'success');
      }
    }
    this.updateTimerDisplay();
    this.updateButtons();
    this.updateSessionInfo();
  },

  complete() {
    if (!this.task) return;
    if (confirm('تأكيد إنجاز المهمة؟')) {
      toggleTaskComplete(this.task.id);
      showToast('أحسنت! 🎉', 'success');
      this.end();
    }
  },

  skip() {
    this.timerEnd();
  },

  end() {
    clearInterval(this.timer);
    clearInterval(this.prayerInterval);
    this.active = false;
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (typeof App !== 'undefined' && App.showPage) {
      App.showPage(this.previousPage || 'dashboard');
    }
  },

  switchTask(taskId) {
    getTask(taskId).then(task => {
      if (task) {
        this.task = task;
        this.render();
      }
    });
  },

  toggleTaskList() {
    const el = document.getElementById('focusTaskList');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  },

  updateTimerDisplay() {
    const textEl = document.getElementById('focusTimerText');
    const circleEl = document.getElementById('focusTimerCircle');
    const labelEl = document.getElementById('focusTimerLabel');
    if (!textEl || !circleEl) return;
    textEl.textContent = this.formatTime(this.timeLeft);
    if (labelEl) labelEl.textContent = this.type === 'work' ? 'تركيز' : 'استراحة';
    const progress = this.totalTime > 0 ? this.timeLeft / this.totalTime : 1;
    const circumference = 596.9;
    circleEl.style.strokeDashoffset = (circumference * (1 - progress)).toString();
    circleEl.style.stroke = this.type === 'work' ? 'var(--primary)' : 'var(--success)';
  },

  updateButtons() {
    const mainBtn = document.getElementById('focusMainBtn');
    const skipBtn = document.getElementById('focusSkipBtn');
    const doneBtn = document.getElementById('focusDoneBtn');
    if (mainBtn) {
      const icon = this.state === 'running' ? 'pause' : 'play';
      const label = this.state === 'running' ? 'توقف' : 'ابدأ';
      mainBtn.innerHTML = `<i data-lucide="${icon}"></i> ${label}`;
    }
    if (skipBtn) skipBtn.disabled = this.state === 'idle';
    if (doneBtn) doneBtn.disabled = this.state === 'idle';
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 0);
  },

  updateSessionInfo() {
    const el = this.overlay?.querySelector('.focus-session-info');
    if (el) el.textContent = `الجلسة ${this.currentSession} من ${this.maxSessions}`;
  },

  startPrayerCountdown() {
    this.updatePrayerInfo();
    this.prayerInterval = setInterval(() => this.updatePrayerInfo(), 10000);
  },

  updatePrayerInfo() {
    const el = document.getElementById('focusPrayerText');
    if (!el) return;
    const timings = App?.prayerData?.timings;
    if (!timings) { el.textContent = 'بيانات الصلاة غير متوفرة'; return; }
    const next = getNextPrayer(timings);
    if (next) {
      el.textContent = `🕌 ${next.name} بعد ${next.timeRemaining}`;
    }
  },

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  },

  playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Beep failed:', e);
    }
  }
};

window.Focus = Focus;
