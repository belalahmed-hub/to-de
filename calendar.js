'use strict';

/**
 * نظام حياة المسلم — التقويم الكامل (Phase 5)
 * ميلادي + هجري + أوقات صلاة + مناسبات إسلامية
 */

const Calendar = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: new Date(),
  view: 'month',
  prayerTimingsCache: {},

  hijriMonths: [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
    'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
    'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
  ],

  gregorianMonths: [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ],

  weekDays: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],

  islamicOccasions: {
    '1-1': { name: 'رأس السنة الهجرية', icon: 'star' },
    '10-1': { name: 'عاشوراء', icon: 'heart' },
    '12-3': { name: 'المولد النبوي', icon: 'sparkles' },
    '27-7': { name: 'الإسراء والمعراج', icon: 'rocket' },
    '1-9': { name: 'بداية رمضان', icon: 'moon' },
    '27-9': { name: 'ليلة القدر', icon: 'stars' },
    '1-10': { name: 'عيد الفطر', icon: 'gift' },
    '2-10': { name: 'عيد الفطر (يوم ٢)', icon: 'gift' },
    '3-10': { name: 'عيد الفطر (يوم ٣)', icon: 'gift' },
    '9-12': { name: 'يوم عرفة', icon: 'mountain' },
    '10-12': { name: 'عيد الأضحى', icon: 'gift' },
    '11-12': { name: 'عيد الأضحى (يوم ٢)', icon: 'gift' },
    '12-12': { name: 'عيد الأضحى (يوم ٣)', icon: 'gift' }
  },

  async init() {
    try {
      this.currentMonth = new Date().getMonth();
      this.currentYear = new Date().getFullYear();
      this.selectedDate = new Date();
      this.view = 'month';
      this.prayerTimingsCache = {};
      this.render();
      this.bindEvents();
    } catch (error) {
      console.error('Error initializing Calendar:', error);
      showToast('خطأ في تحميل التقويم', 'error');
    }
  },

  render() {
    try {
      const container = document.getElementById('pageContent');
      if (!container) return;

      const hijriNow = toHijri(new Date(this.currentYear, this.currentMonth, 1));
      const hijriMonthName = hijriNow ? hijriNow.monthName : '';
      const hijriYear = hijriNow ? hijriNow.year : '';

      container.innerHTML = `
        <div class="page active">
          <div class="calendar-layout">
            <!-- Main Calendar Area -->
            <div class="calendar-main">
              <!-- Header -->
              <div class="card calendar-header-card">
                <div class="calendar-header-content">
                  <div class="calendar-title-section">
                    <h2 class="calendar-month-title">
                      ${this.gregorianMonths[this.currentMonth]} ${this.currentYear}
                    </h2>
                    <p class="calendar-hijri-subtitle">
                      ${hijriMonthName} ${hijriYear} هـ
                    </p>
                  </div>
                  <div class="calendar-controls">
                    <div class="view-toggle-group">
                      <button class="btn btn-sm cal-view-btn ${this.view === 'month' ? 'active' : ''}" data-view="month">شهر</button>
                      <button class="btn btn-sm cal-view-btn ${this.view === 'week' ? 'active' : ''}" data-view="week">أسبوع</button>
                    </div>
                    <div class="calendar-nav-btns">
                      <button class="btn btn-ghost btn-sm cal-nav-btn" data-nav="prev">
                        <i data-lucide="chevron-right" style="width:16px;height:16px;"></i>
                      </button>
                      <button class="btn btn-ghost btn-sm cal-nav-btn" data-nav="today">اليوم</button>
                      <button class="btn btn-ghost btn-sm cal-nav-btn" data-nav="next">
                        <i data-lucide="chevron-left" style="width:16px;height:16px;"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Grid -->
              ${this.view === 'month' ? this.renderMonthGrid() : this.renderWeekView()}
            </div>

            <!-- Sidebar -->
            <div class="calendar-sidebar" id="calendarSidebar">
              ${this.renderDaySidebar()}
            </div>
          </div>
        </div>
      `;

      this.loadMonthTasks();
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error rendering Calendar:', error);
    }
  },

  renderMonthGrid() {
    const daysInMonth = getDaysInMonth(this.currentYear, this.currentMonth);
    const firstDayOfMonth = getFirstDayOfMonth(this.currentYear, this.currentMonth);

    const adjustedFirstDay = (firstDayOfMonth + 1) % 7;

    const today = new Date();
    const todayStr = this.toDateStr(today);

    let html = `<div class="calendar-grid" id="calendarGrid">`;

    html += this.weekDays.map(d => `<div class="calendar-header">${d}</div>`).join('');

    const prevMonthDays = getDaysInMonth(
      this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear,
      this.currentMonth === 0 ? 11 : this.currentMonth - 1
    );

    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      html += `<div class="calendar-day other-month"><span>${day}</span></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      const dateStr = this.toDateStr(date);
      const isToday = dateStr === todayStr;
      const isSelected = this.toDateStr(this.selectedDate) === dateStr;
      const dayOfWeek = date.getDay();
      const isFriday = dayOfWeek === 5;
      const hijri = toHijri(date);
      const occasion = this.getIslamicOccasion(hijri);

      let classes = 'calendar-day';
      if (isToday) classes += ' today';
      if (isSelected) classes += ' selected';
      if (isFriday) classes += ' friday';

      html += `
        <div class="${classes}" data-date="${dateStr}" onclick="Calendar.selectDate('${dateStr}')">
          <span class="cal-day-num">${day}</span>
          ${hijri ? `<span class="cal-hijri-num">${hijri.day}</span>` : ''}
          <div class="cal-task-dots" id="dots-${dateStr}"></div>
          ${occasion ? `<span class="cal-occasion-badge"><i data-lucide="${occasion.icon}" style="width:8px;height:8px;"></i> ${occasion.name}</span>` : ''}
        </div>
      `;
    }

    const totalCells = adjustedFirstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="calendar-day other-month"><span>${i}</span></div>`;
    }

    html += `</div>`;
    return html;
  },

  renderWeekView() {
    const startOfWeek = new Date(this.selectedDate);
    const dayOfWeek = startOfWeek.getDay();
    const diff = (dayOfWeek + 1) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - diff);

    const today = new Date();
    const todayStr = this.toDateStr(today);

    let html = `<div class="calendar-week-view" id="calendarWeekView">`;

    html += `<div class="week-header">`;
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      const dateStr = this.toDateStr(date);
      const isToday = dateStr === todayStr;
      const hijri = toHijri(date);

      html += `
        <div class="week-day-header ${isToday ? 'today' : ''}" onclick="Calendar.selectDate('${dateStr}')">
          <span class="week-day-name">${this.weekDays[i]}</span>
          <span class="week-day-num">${date.getDate()}</span>
          ${hijri ? `<span class="week-hijri">${hijri.day}</span>` : ''}
        </div>
      `;
    }
    html += `</div>`;

    html += `<div class="week-time-grid">`;
    for (let hour = 4; hour <= 23; hour++) {
      html += `
        <div class="week-hour-row">
          <div class="week-hour-label">${String(hour).padStart(2, '0')}:00</div>
          <div class="week-hour-slots">`;
      for (let i = 0; i < 7; i++) {
        html += `<div class="week-slot" data-hour="${hour}" data-day="${i}"></div>`;
      }
      html += `</div></div>`;
    }
    html += `</div></div>`;

    return html;
  },

  renderDaySidebar() {
    const dateStr = this.toDateStr(this.selectedDate);
    const hijri = toHijri(this.selectedDate);
    const occasion = this.getIslamicOccasion(hijri);
    const dayName = this.weekDays[this.selectedDate.getDay()];

    return `
      <div class="sidebar-card" id="daySidebar">
        <div class="sidebar-date-header">
          <h3 class="sidebar-date-title">${dayName}</h3>
          <p class="sidebar-gregorian">${this.selectedDate.getDate()} ${this.gregorianMonths[this.currentMonth]} ${this.currentYear}</p>
          ${hijri ? `<p class="sidebar-hijri">${hijri.day} ${hijri.monthName} ${hijri.year} هـ</p>` : ''}
          ${occasion ? `<div class="sidebar-occasion"><i data-lucide="${occasion.icon}" style="width:14px;height:14px;"></i> ${occasion.name}</div>` : ''}
        </div>

        <div class="sidebar-prayers" id="sidebarPrayers">
          <h4 class="sidebar-section-title">
            <i data-lucide="clock" style="width:14px;height:14px;"></i>
            أوقات الصلاة
          </h4>
          <div class="sidebar-prayer-list" id="sidebarPrayerList">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>

        <div class="sidebar-tasks">
          <div class="sidebar-section-header">
            <h4 class="sidebar-section-title">
              <i data-lucide="check-square" style="width:14px;height:14px;"></i>
              مهام اليوم
            </h4>
            <button class="btn btn-sm btn-primary" onclick="Calendar.addTaskForDate('${dateStr}')">
              <i data-lucide="plus" style="width:12px;height:12px;"></i>
            </button>
          </div>
          <div class="sidebar-task-list" id="sidebarTaskList">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    `;
  },

  async loadMonthTasks() {
    try {
      const tasks = await db.tasks.toArray();
      const taskMap = {};

      tasks.forEach(t => {
        if (t.dueDate) {
          if (!taskMap[t.dueDate]) taskMap[t.dueDate] = [];
          taskMap[t.dueDate].push(t);
        }
      });

      Object.keys(taskMap).forEach(dateStr => {
        const dotsEl = document.getElementById('dots-' + dateStr);
        if (!dotsEl) return;

        const dayTasks = taskMap[dateStr];
        const hasHigh = dayTasks.some(t => t.priority === 'high' && t.status !== 'done');
        const hasMedium = dayTasks.some(t => t.priority === 'medium' && t.status !== 'done');
        const hasLow = dayTasks.some(t => t.priority === 'low' && t.status !== 'done');

        let dotsHtml = '';
        if (hasHigh) dotsHtml += '<span class="task-dot dot-high"></span>';
        if (hasMedium) dotsHtml += '<span class="task-dot dot-medium"></span>';
        if (hasLow) dotsHtml += '<span class="task-dot dot-low"></span>';

        dotsEl.innerHTML = dotsHtml;
      });

      this.loadDaySidebar();
    } catch (error) {
      console.error('Error loading month tasks:', error);
    }
  },

  async loadDaySidebar() {
    try {
      const dateStr = this.toDateStr(this.selectedDate);

      await this.loadSidebarPrayers();
      await this.loadSidebarTasks(dateStr);
    } catch (error) {
      console.error('Error loading day sidebar:', error);
    }
  },

  async loadSidebarPrayers() {
    try {
      const container = document.getElementById('sidebarPrayerList');
      if (!container) return;

      const dateStr = this.toDateStr(this.selectedDate);
      let data = this.prayerTimingsCache[dateStr];

      if (!data) {
        data = await PrayerManager.getPrayerTimes(this.selectedDate);
        this.prayerTimingsCache[dateStr] = data;
      }

      const timings = data.timings;
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const prayers = [
        { name: PrayerManager.prayerNames.Fajr, key: 'Fajr', icon: 'sunrise' },
        { name: PrayerManager.prayerNames.Sunrise, key: 'Sunrise', icon: 'sun' },
        { name: PrayerManager.prayerNames.Dhuhr, key: 'Dhuhr', icon: 'sun-medium' },
        { name: PrayerManager.prayerNames.Asr, key: 'Asr', icon: 'cloud-sun' },
        { name: PrayerManager.prayerNames.Maghrib, key: 'Maghrib', icon: 'sunset' },
        { name: PrayerManager.prayerNames.Isha, key: 'Isha', icon: 'moon' }
      ];

      let html = '';
      prayers.forEach(prayer => {
        const time = timings[prayer.key];
        if (!time) return;

        const [h, m] = time.split(':').map(Number);
        const prayerMinutes = h * 60 + m;
        const isPassed = prayerMinutes <= currentMinutes;
        const formattedTime = PrayerManager.formatPrayerTime(time);

        html += `
          <div class="sidebar-prayer-item ${isPassed ? 'passed' : ''}">
            <div class="prayer-item-info">
              <i data-lucide="${prayer.icon}" class="prayer-item-icon"></i>
              <span class="prayer-item-name">${prayer.name}</span>
            </div>
            <span class="prayer-item-time">${formattedTime}</span>
          </div>
        `;
      });

      container.innerHTML = html;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error loading sidebar prayers:', error);
      const container = document.getElementById('sidebarPrayerList');
      if (container) container.innerHTML = '<p class="text-muted">خطأ في تحميل أوقات الصلاة</p>';
    }
  },

  async loadSidebarTasks(dateStr) {
    try {
      const container = document.getElementById('sidebarTaskList');
      if (!container) return;

      const tasks = await db.tasks.where('dueDate').equals(dateStr).toArray();

      if (tasks.length === 0) {
        container.innerHTML = `
          <div class="sidebar-empty">
            <i data-lucide="calendar-x" style="width:20px;height:20px;color:var(--border);"></i>
            <p>مفيش مهام لليوم ده</p>
          </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
      }

      container.innerHTML = tasks.map(t => `
        <div class="sidebar-task-item ${t.status === 'done' ? 'done' : ''}">
          <div class="sidebar-task-check" onclick="Calendar.toggleTask(${t.id})">
            <i data-lucide="${t.status === 'done' ? 'check-circle-2' : 'circle'}" style="width:16px;height:16px;color:${t.status === 'done' ? 'var(--success)' : 'var(--border)'};"></i>
          </div>
          <div class="sidebar-task-info">
            <span class="sidebar-task-title">${sanitizeHTML(t.title)}</span>
            <span class="task-priority ${getPriorityClass(t.priority)}" style="font-size:0.625rem;padding:1px 4px;">${getPriorityLabel(t.priority)}</span>
          </div>
        </div>
      `).join('');

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error loading sidebar tasks:', error);
    }
  },

  async toggleTask(id) {
    try {
      const task = await getTask(id);
      if (!task) return;

      await updateTask(id, {
        status: task.status === 'done' ? 'todo' : 'done',
        updatedAt: new Date().toISOString()
      });

      if (task.status !== 'done') {
        showToast('🎉 مهمة منجزة!', 'success');
      }

      this.loadMonthTasks();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  },

  addTaskForDate(dateStr) {
    try {
      if (typeof Tasks !== 'undefined') {
        Tasks.openTaskModal({ dueDate: dateStr });
      } else {
        openModal('مهمة جديدة', `
          <form onsubmit="Calendar.saveQuickTask(event, '${dateStr}')">
            <div class="form-group"><label class="form-label">العنوان *</label><input type="text" id="cTitle" class="form-input" required></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">الأولوية</label><select id="cPrio" class="form-select"><option value="low">منخفض</option><option value="medium" selected>متوسط</option><option value="high">عالي</option></select></div>
            </div>
            <div style="display:flex;gap:var(--spacing-sm);justify-content:flex-end;">
              <button type="button" class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
              <button type="submit" class="btn btn-primary">إضافة</button>
            </div>
          </form>
        `);
      }
    } catch (error) {
      console.error('Error adding task for date:', error);
    }
  },

  async saveQuickTask(e, dateStr) {
    try {
      e.preventDefault();
      const title = document.getElementById('cTitle')?.value;
      if (!title) return;

      const hijri = toHijri(new Date(dateStr));

      await addTask({
        title,
        description: '',
        priority: document.getElementById('cPrio')?.value || 'medium',
        dueDate: dateStr,
        hijriDate: hijri?.full || null,
        prayerLink: null,
        tags: ['التقويم']
      });

      closeModal();
      showToast('تم إضافة المهمة', 'success');
      this.loadMonthTasks();
    } catch (error) {
      console.error('Error saving quick task:', error);
    }
  },

  selectDate(dateStr) {
    try {
      this.selectedDate = new Date(dateStr + 'T00:00:00');

      document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.toggle('selected', el.dataset.date === dateStr);
      });

      this.loadDaySidebar();
    } catch (error) {
      console.error('Error selecting date:', error);
    }
  },

  navigate(direction) {
    try {
      if (this.view === 'month') {
        this.currentMonth += direction;
        if (this.currentMonth > 11) {
          this.currentMonth = 0;
          this.currentYear++;
        } else if (this.currentMonth < 0) {
          this.currentMonth = 11;
          this.currentYear--;
        }
      } else if (this.view === 'week') {
        this.selectedDate.setDate(this.selectedDate.getDate() + (direction * 7));
        this.currentMonth = this.selectedDate.getMonth();
        this.currentYear = this.selectedDate.getFullYear();
      }

      this.render();
    } catch (error) {
      console.error('Error navigating calendar:', error);
    }
  },

  goToday() {
    try {
      const today = new Date();
      this.currentMonth = today.getMonth();
      this.currentYear = today.getFullYear();
      this.selectedDate = today;
      this.render();
    } catch (error) {
      console.error('Error going to today:', error);
    }
  },

  setView(view) {
    try {
      this.view = view;
      this.render();
    } catch (error) {
      console.error('Error setting view:', error);
    }
  },

  getIslamicOccasion(hijri) {
    try {
      if (!hijri) return null;
      const key = `${hijri.day}-${hijri.month}`;
      return this.islamicOccasions[key] || null;
    } catch (error) {
      console.error('Error getting Islamic occasion:', error);
      return null;
    }
  },

  toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  bindEvents() {
    try {
      document.querySelectorAll('.cal-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const nav = btn.dataset.nav;
          if (nav === 'prev') this.navigate(-1);
          else if (nav === 'next') this.navigate(1);
          else if (nav === 'today') this.goToday();
        });
      });

      document.querySelectorAll('.cal-view-btn').forEach(btn => {
        btn.addEventListener('click', () => this.setView(btn.dataset.view));
      });
    } catch (error) {
      console.error('Error binding calendar events:', error);
    }
  }
};

if (typeof window !== 'undefined') {
  window.Calendar = Calendar;
}
