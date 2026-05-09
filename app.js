'use strict';

/**
 * نظام حياة المسلم — الملف الرئيسي (Phase 10 Final Integration)
 * Router + التهيئة + Global Timers + Keyboard Shortcuts + Onboarding
 */

/* ═══════════════════════════════════════════════
   Simple State Management
   ═══════════════════════════════════════════════ */

const AppState = {
  _data: {},
  _listeners: {},

  set(key, value) {
    this._data[key] = value;
    (this._listeners[key] || []).forEach(fn => fn(value));
  },

  get(key) {
    return this._data[key];
  },

  watch(key, fn) {
    if (!this._listeners[key]) this._listeners[key] = [];
    this._listeners[key].push(fn);
  },

  unwatch(key, fn) {
    if (!this._listeners[key]) return;
    this._listeners[key] = this._listeners[key].filter(f => f !== fn);
  }
};

/* ═══════════════════════════════════════════════
   Lazy Render Tracker
   ═══════════════════════════════════════════════ */

const renderedPages = new Set();

function shouldRefresh(page) {
  const lastRender = AppState.get(`lastRender_${page}`);
  return !lastRender || (Date.now() - lastRender) > 30000;
}

const App = {
  currentPage: 'dashboard',
  prayerData: null,
  sidebarCollapsed: false,
  deferredPrompt: null,
  timers: [],
  prayerDataLoaded: false,

  async init() {
    try {
      await initDB();

      await this.loadSettings();

      this.setupNavigation();
      this.setupModal();
      this.setupSidebar();
      this.setupMobile();
      this.setupLucide();
      this.setupKeyboardShortcuts();
      this.setupPWA();
      this.setupConnectionStatus();

      await this.loadPrayerData();
      await this.showOnboardingIfNeeded();

      const hash = window.location.hash.replace('#', '') || 'dashboard';
      this.showPage(hash);

      this.startGlobalTimers();

      this.updateConnectionDisplay();

      console.log('[Hayah] تطبيق جاهز ✓');
    } catch (error) {
      console.error('[Hayah] خطأ في التهيئة:', error);
    }
  },

  /* ═══════════════════════════════════════════════
     الإعدادات وتطبيقها
     ═══════════════════════════════════════════════ */

  async loadSettings() {
    try {
      const settings = await getAllSettings();

      if (settings.profileName) {
        const name = settings.profileName;
        const avatarEl = document.getElementById('userAvatar');
        const nameEl = document.getElementById('userName');
        if (avatarEl) avatarEl.textContent = getInitials(name);
        if (nameEl) nameEl.textContent = name.split(' ')[0];
      }

      if (typeof Settings !== 'undefined') {
        Settings.settings = settings;
        Settings.applyTheme();
        Settings.applyAccent();
        Settings.applyFontSize();
        Settings.applyDensity();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },

  /* ═══════════════════════════════════════════════
     بيانات الصلاة
     ═══════════════════════════════════════════════ */

  async loadPrayerData() {
    try {
      this.prayerData = await getPrayerSettings();
      if (this.prayerData) {
        const city = await getSetting('city') || 'Cairo';
        const method = await getSetting('prayerMethod') || 'Egypt';
        this.prayerData.city = city;
        this.prayerData.method = method;
      }

      const hijri = await getHijriDate();
      if (hijri) updateDateDisplay(hijri);
    } catch (error) {
      console.error('Error loading prayer data:', error);
    }
  },

  /* ═══════════════════════════════════════════════
     التنقل — SPA Router
     ═══════════════════════════════════════════════ */

  setupNavigation() {
    try {
      document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const page = link.dataset.page;
          this.navigate(page);
          if (window.innerWidth <= 768) {
            document.getElementById('sidebar')?.classList.remove('open');
          }
        });
      });

      window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        if (hash !== this.currentPage) {
          this.navigate(hash);
        }
      });

      const initialHash = window.location.hash.replace('#', '');
      if (initialHash) {
        this.currentPage = initialHash;
      }
    } catch (error) {
      console.error('Error setting up navigation:', error);
    }
  },

  navigate(page) {
    if (this.currentPage === page) return;
    this.currentPage = page;
    window.location.hash = page;
    this.showPage(page);
  },

  async showPage(pageName) {
    try {
      document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.dataset.page === pageName);
      });

      this.currentPage = pageName;

      const container = document.getElementById('pageContent');
      if (!container) return;

      const pages = {
        dashboard: { html: '', init: () => Dashboard?.init() },
        tasks: { html: '', init: () => Tasks?.init() },
        kanban: { html: '', init: () => Kanban?.init() },
        calendar: { html: '', init: () => Calendar?.init() },
        prayer: { html: this.renderPrayer(), init: () => this.loadFullPrayerTimes() },
        notes: { html: '', init: () => Notes?.init() },
        habits: { html: '', init: () => Habits?.init() },
        focus: { html: '<div id="focusPageContent" class="page active" style="min-height:50vh;"><div class="loading"><div class="spinner"></div><span>جاري التحميل...</span></div></div>', init: () => Focus?.init() },
        ai: { html: '', init: () => renderAIPage() },
        analytics: { html: '', init: () => Analytics?.init() },
        team: { html: '', init: () => Team?.init() },
        settings: { html: '', init: () => Settings?.init() }
      };

      const page = pages[pageName];
      if (!page) return;

      // Lazy render: only render if never rendered or data is stale
      if (!renderedPages.has(pageName) || shouldRefresh(pageName)) {
        container.innerHTML = page.html;

        if (page.init) {
          await page.init();
        }

        renderedPages.add(pageName);
        AppState.set(`lastRender_${pageName}`, Date.now());
      } else {
        // Page already rendered, just show it
        // init still called for data refresh
        if (page.init) {
          await page.init();
        }
        AppState.set(`lastRender_${pageName}`, Date.now());
      }

      setTimeout(() => this.setupLucide(), 0);
    } catch (error) {
      console.error(`Error showing page "${pageName}":`, error);
    }
  },

  /* ═══════════════════════════════════════════════
     الـ Modal
     ═══════════════════════════════════════════════ */

  setupModal() {
    try {
      document.getElementById('closeModal')?.addEventListener('click', closeModal);
      document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
      });
    } catch (error) {
      console.error('Error setting up modal:', error);
    }
  },

  /* ═══════════════════════════════════════════════
     الـ Sidebar
     ═══════════════════════════════════════════════ */

  setupSidebar() {
    try {
      const toggle = document.getElementById('sidebarToggle');
      const sidebar = document.getElementById('sidebar');
      if (!toggle || !sidebar) return;

      toggle.addEventListener('click', () => {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
        setSetting('sidebarCollapsed', this.sidebarCollapsed);
      });

      getSetting('sidebarCollapsed').then(val => {
        if (val) {
          this.sidebarCollapsed = true;
          sidebar.classList.add('collapsed');
        }
      });
    } catch (error) {
      console.error('Error setting up sidebar:', error);
    }
  },

  setupMobile() {
    try {
      const toggle = document.getElementById('mobileToggle');
      const sidebar = document.getElementById('sidebar');
      if (!toggle || !sidebar) return;
      toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    } catch (error) {
      console.error('Error setting up mobile:', error);
    }
  },

  /* ═══════════════════════════════════════════════
     Lucide Icons
     ═══════════════════════════════════════════════ */

  setupLucide() {
    try {
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error setting up Lucide:', error);
    }
  },

  /* ═══════════════════════════════════════════════
     حالة الاتصال
     ═══════════════════════════════════════════════ */

  setupConnectionStatus() {
    window.addEventListener('online', () => this.updateConnectionDisplay());
    window.addEventListener('offline', () => this.updateConnectionDisplay());
  },

  updateConnectionDisplay() {
    try {
      const el = document.getElementById('connectionStatus');
      const offlineBanner = document.getElementById('offlineBanner');

      if (el) {
        if (navigator.onLine) {
          el.innerHTML = '<i data-lucide="wifi" style="width:12px;height:12px;color:var(--success);"></i><span style="font-size:0.6875rem;">متصل</span>';
        } else {
          el.innerHTML = '<i data-lucide="wifi-off" style="width:12px;height:12px;color:var(--danger);"></i><span style="font-size:0.6875rem;">غير متصل</span>';
        }
        this.setupLucide();
      }

      if (offlineBanner) {
        offlineBanner.style.display = navigator.onLine ? 'none' : 'flex';
      }
    } catch (error) {
      console.error('Error updating connection display:', error);
    }
  },

  /* ═══════════════════════════════════════════════
     PWA
     ═══════════════════════════════════════════════ */

  setupPWA() {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('[PWA] SW registered:', reg.scope);
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showToast('تحديث جديد متاح! أعد تحميل الصفحة.', 'info');
                }
              });
            });
          })
          .catch((err) => console.warn('[PWA] SW registration failed:', err));

        navigator.serviceWorker.addEventListener('message', (e) => {
          if (e.data && e.data.type === 'SYNC_COMPLETE') {
            console.log('[PWA] SW sync completed');
          }
        });
      }

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e;
        const dismissed = sessionStorage.getItem('installDismissed');
        if (!dismissed) {
          const banner = document.getElementById('installBanner');
          if (banner) banner.style.display = 'flex';
        }
      });

      window.addEventListener('appinstalled', () => {
        showToast('تم تثبيت التطبيق!', 'success');
        this.deferredPrompt = null;
        const banner = document.getElementById('installBanner');
        if (banner) banner.style.display = 'none';
      });

      const installBtn = document.getElementById('installBtn');
      if (installBtn) {
        installBtn.addEventListener('click', () => {
          if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((result) => {
              if (result.outcome === 'accepted') showToast('تم تثبيت التطبيق!', 'success');
              this.deferredPrompt = null;
              const banner = document.getElementById('installBanner');
              if (banner) banner.style.display = 'none';
            });
          }
        });
      }

      const dismissInstall = document.getElementById('dismissInstall');
      if (dismissInstall) {
        dismissInstall.addEventListener('click', () => {
          document.getElementById('installBanner').style.display = 'none';
          sessionStorage.setItem('installDismissed', 'true');
        });
      }
    } catch (error) {
      console.error('Error setting up PWA:', error);
    }
  },

  /* ═══════════════════════════════════════════════
     Global Timers
     ═══════════════════════════════════════════════ */

  startGlobalTimers() {
    this.addTimer(setInterval(() => this.updateHeaderTime(), 1000));
    this.addTimer(setInterval(() => this.updateNextPrayer(), 60000));
    this.addTimer(setInterval(() => this.checkOverdueTasks(), 600000));
    this.addTimer(setInterval(() => this.syncPrayerData(), 3600000));
    this.addTimer(setInterval(() => this.checkWeeklyReview(), 3600000));
    setTimeout(() => this.checkWeeklyReview(), 5000);
  },

  addTimer(id) {
    this.timers.push(id);
    return id;
  },

  clearTimers() {
    this.timers.forEach(id => clearInterval(id));
    this.timers = [];
  },

  updateHeaderTime() {
    try {
      const el = document.getElementById('headerTime');
      if (el) {
        el.textContent = new Date().toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      }
    } catch (error) {}
  },

  updateNextPrayer() {
    try {
      if (typeof PrayerManager !== 'undefined') {
        PrayerManager.startCountdown();
      }
      const el = document.getElementById('nextPrayerTime');
      if (el && this.prayerData?.timings) {
        const next = getNextPrayer(this.prayerData.timings);
        el.textContent = next ? `${next.name} — ${next.timeRemaining}` : '--:--';
      }
    } catch (error) {}
  },

  async checkOverdueTasks() {
    try {
      const settings = await getAllSettings();
      if (settings.notifOverdue === false) return;
      const overdue = await db.tasks.where('status').notEqual('done').filter(t => t.dueDate && isOverdue(t.dueDate)).toArray();
      if (overdue.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('حياة — مهام متأخرة', {
          body: `لديك ${overdue.length} مهمة(م) متأخرة`,
          tag: 'overdue-tasks'
        });
      }
    } catch (error) {}
  },

  async syncPrayerData() {
    try {
      this.prayerData = await refreshPrayerTimes();
      this.updateNextPrayer();
    } catch (error) {}
  },

  /* ═══════════════════════════════════════════════
     Weekly Review — كل يوم جمعة
     ═══════════════════════════════════════════════ */

  async checkWeeklyReview() {
    try {
      const settings = await getAllSettings();
      if (settings.weeklyReviewDisabled === true) return;

      const today = new Date();
      const dayOfWeek = today.getDay();

      if (dayOfWeek !== 5) return;

      const lastReview = await getLastWeeklyReview();
      if (lastReview) {
        const lastDate = new Date(lastReview.createdAt);
        const daysSince = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
        if (daysSince < 7) return;
      }

      const tasks = await db.tasks.toArray();
      const habits = await getAllHabits();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weekTasks = tasks.filter(t => t.updatedAt && new Date(t.updatedAt) >= weekAgo);
      const completed = weekTasks.filter(t => t.status === 'done').length;
      const overdue = weekTasks.filter(t => t.dueDate && isOverdue(t.dueDate)).length;
      const totalHabits = habits.length;
      const doneHabits = habits.filter(h => h.completedDates?.includes(today.toISOString().split('T')[0])).length;
      const habitsPct = totalHabits > 0 ? Math.round((doneHabits / totalHabits) * 100) : 0;
      const bestStreak = Math.max(...habits.map(h => h.bestStreak || 0), 0);

      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];

      openModal('📊 مراجعة الأسبوع', `
        <div style="text-align:center;">
          <div style="font-size:2rem;margin-bottom:var(--spacing-md);">📊</div>
          <h3 style="margin-bottom:var(--spacing-lg);">مراجعة الأسبوع</h3>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--spacing-md);margin-bottom:var(--spacing-xl);">
            <div style="background:var(--surface-2);border-radius:var(--radius-md);padding:var(--spacing-md);text-align:center;">
              <div style="font-size:1.5rem;font-weight:700;color:var(--success);">${completed}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">✅ المهام المنجزة</div>
            </div>
            <div style="background:var(--surface-2);border-radius:var(--radius-md);padding:var(--spacing-md);text-align:center;">
              <div style="font-size:1.5rem;font-weight:700;color:var(--danger);">${overdue}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">⏳ المهام المتأخرة</div>
            </div>
            <div style="background:var(--surface-2);border-radius:var(--radius-md);padding:var(--spacing-md);text-align:center;">
              <div style="font-size:1.5rem;font-weight:700;color:var(--accent);">${habitsPct}%</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">🌱 العادات المنجزة</div>
            </div>
            <div style="background:var(--surface-2);border-radius:var(--radius-md);padding:var(--spacing-md);text-align:center;">
              <div style="font-size:1.5rem;font-weight:700;color:var(--warning);">${bestStreak}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">🔥 أطول streak</div>
            </div>
          </div>
          <form onsubmit="App.saveWeeklyReview(event, '${weekStartStr}')">
            <div class="form-group" style="text-align:right;">
              <label class="form-label">١. ما أفضل إنجاز هذا الأسبوع؟</label>
              <input type="text" id="wrAccomplishments" class="form-input" placeholder="أفضل إنجاز..." required>
            </div>
            <div class="form-group" style="text-align:right;">
              <label class="form-label">٢. ما التحدي الأكبر؟</label>
              <input type="text" id="wrChallenges" class="form-input" placeholder="التحدي الأكبر..." required>
            </div>
            <div class="form-group" style="text-align:right;">
              <label class="form-label">٣. ما هدفك للأسبوع القادم؟</label>
              <input type="text" id="wrGoals" class="form-input" placeholder="هدف الأسبوع القادم..." required>
            </div>
            <div style="display:flex;gap:var(--spacing-sm);justify-content:flex-end;margin-top:var(--spacing-lg);">
              <button type="button" class="btn btn-ghost" onclick="closeModal();setSetting('weeklyReviewDisabled',true);showToast('تم إخفاء المراجعة الأسبوعية','info');">تخطى</button>
              <button type="submit" class="btn btn-primary">حفظ المراجعة</button>
            </div>
          </form>
        </div>
      `);
    } catch (error) {
      console.error('Error checking weekly review:', error);
    }
  },

  async saveWeeklyReview(e, weekStart) {
    try {
      e.preventDefault();
      const accomplishments = document.getElementById('wrAccomplishments').value;
      const challenges = document.getElementById('wrChallenges').value;
      const goals = document.getElementById('wrGoals').value;
      await addWeeklyReview({ weekStart, accomplishments, challenges, goals });
      closeModal();
      showToast('تم حفظ المراجعة الأسبوعية 🎉', 'success');
    } catch (error) {
      console.error('Error saving weekly review:', error);
    }
  },

  /* ═══════════════════════════════════════════════
     Onboarding — أول مرة
     ═══════════════════════════════════════════════ */

  async showOnboardingIfNeeded() {
    try {
      const tasksCount = await db.tasks.count();
      const settings = await getAllSettings();

      if (tasksCount === 0 && !settings.onboardingDone) {
        await this.showOnboarding();
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
    }
  },

  async showOnboarding() {
    return new Promise((resolve) => {
      let step = 1;

      const steps = {
        1: `
          <div style="text-align:center;padding:var(--spacing-xl) 0;">
            <div style="width:80px;height:80px;background:var(--primary);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:var(--spacing-md);">
              <span style="font-size:2.5rem;font-weight:800;color:#fff;">ح</span>
            </div>
            <h3 style="margin:0 0 var(--spacing-xs);">أهلاً بيك في حياة! 🌙</h3>
            <p style="color:var(--text-muted);margin:0 0 var(--spacing-lg);">نظام إدارة حياتك مبني على القيم الإسلامية</p>
          </div>
          <div class="form-group">
            <label class="form-label">ما اسمك؟</label>
            <input type="text" id="onboardName" class="form-input" placeholder="اسمك" autofocus>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:var(--spacing-lg);">
            <button class="btn btn-primary" onclick="window._onboardNext()">التالي ←</button>
          </div>
        `,
        2: `
          <div style="text-align:center;padding:var(--spacing-xl) 0;">
            <div style="width:60px;height:60px;background:var(--accent);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:var(--spacing-md);">
              <i data-lucide="map-pin" style="width:28px;height:28px;color:var(--text-inverse);"></i>
            </div>
            <h3 style="margin:0 0 var(--spacing-xs);">مدينتك؟</h3>
            <p style="color:var(--text-muted);margin:0 0 var(--spacing-lg);">عشان نجيب أوقات الصلاة الصح</p>
          </div>
          <div class="form-group">
            <label class="form-label">المدينة</label>
            <select id="onboardCity" class="form-select">
              <option value="Cairo">القاهرة</option>
              <option value="Alexandria">الإسكندرية</option>
              <option value="Giza">الجيزة</option>
              <option value="Mecca">مكة المكرمة</option>
              <option value="Medina">المدينة المنورة</option>
              <option value="Riyadh">الرياض</option>
              <option value="Jeddah">جدة</option>
              <option value="Amman">عمّان</option>
              <option value="Dubai">دبي</option>
              <option value="London">لندن</option>
              <option value="Istanbul">اسطنبول</option>
              <option value="Other">أخرى</option>
            </select>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:var(--spacing-lg);">
            <button class="btn btn-ghost" onclick="window._onboardPrev()">→ رجوع</button>
            <button class="btn btn-primary" onclick="window._onboardNext()">التالي ←</button>
          </div>
        `,
        3: `
          <div style="text-align:center;padding:var(--spacing-xl) 0;">
            <div style="width:60px;height:60px;background:var(--info);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:var(--spacing-md);">
              <i data-lucide="bot" style="width:28px;height:28px;color:var(--text-inverse);"></i>
            </div>
            <h3 style="margin:0 0 var(--spacing-xs);">المساعد الذكي</h3>
            <p style="color:var(--text-muted);margin:0 0 var(--spacing-lg);">هل عندك Groq API Key؟ (اختياري)</p>
          </div>
          <div class="form-group">
            <label class="form-label">Groq API Key</label>
            <input type="password" id="onboardApiKey" class="form-input" placeholder="gsk_xxxxxxxxxxxxxxxx" style="font-family:var(--font-mono);">
            <small class="form-hint" style="margin-top:var(--spacing-xs);display:block;">
              <a href="https://console.groq.com/keys" target="_blank" style="color:var(--info);">احصل على مفتاح مجاني</a>
            </small>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:var(--spacing-lg);">
            <button class="btn btn-ghost" onclick="window._onboardPrev()">→ رجوع</button>
            <button class="btn btn-accent" onclick="window._onboardFinish()">ابدأ استخدام حياة 🚀</button>
          </div>
        `
      };

      window._onboardNext = () => {
        if (step === 1) {
          const name = document.getElementById('onboardName')?.value?.trim();
          if (!name) { showToast('أدخل اسمك', 'warning'); return; }
          window._onboardData = window._onboardData || {};
          window._onboardData.name = name;
        }
        if (step < 3) {
          step++;
          openModal('إعداد سريع', steps[step]);
          if (typeof lucide !== 'undefined') lucide.createIcons();
        }
      };

      window._onboardPrev = () => {
        if (step > 1) {
          step--;
          openModal('إعداد سريع', steps[step]);
          if (typeof lucide !== 'undefined') lucide.createIcons();
        }
      };

      window._onboardFinish = async () => {
        const data = window._onboardData || {};
        const city = document.getElementById('onboardCity')?.value || 'Cairo';
        const apiKey = document.getElementById('onboardApiKey')?.value?.trim() || '';

        await Promise.all([
          setSetting('profileName', data.name || 'مستخدم'),
          setSetting('city', city),
          setSetting('prayerMethod', 'Egypt'),
          setSetting('onboardingDone', true),
          setSetting('groqApiKey', apiKey)
        ]);

        if (data.name) {
          const avatarEl = document.getElementById('userAvatar');
          const nameEl = document.getElementById('userName');
          if (avatarEl) avatarEl.textContent = getInitials(data.name);
          if (nameEl) nameEl.textContent = data.name.split(' ')[0];
        }

        closeModal();
        showToast('أهلاً! حياة جاهزة 🌟', 'success');

        delete window._onboardNext;
        delete window._onboardPrev;
        delete window._onboardFinish;
        delete window._onboardData;

        resolve();
      };

      openModal('إعداد سريع', steps[1]);
      if (typeof lucide !== 'undefined') lucide.createIcons();

      setTimeout(() => {
        const nameInput = document.getElementById('onboardName');
        if (nameInput) nameInput.focus();
      }, 100);
    });
  },

  /* ═══════════════════════════════════════════════
     Keyboard Shortcuts
     ═══════════════════════════════════════════════ */

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrl = isMac ? e.metaKey : e.ctrlKey;

      if ((e.key === 'k' && ctrl) || (e.key === 'p' && ctrl)) {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      if (e.key === '/' && !ctrl && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        this.showShortcutsHelp();
        return;
      }

      if (!ctrl) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          if (typeof Tasks !== 'undefined') Tasks.openTaskModal();
          break;
        case '1':
          e.preventDefault();
          this.navigate('dashboard');
          break;
        case '2':
          e.preventDefault();
          this.navigate('tasks');
          break;
        case '3':
          e.preventDefault();
          this.navigate('kanban');
          break;
        case '4':
          e.preventDefault();
          this.navigate('calendar');
          break;
        case '5':
          e.preventDefault();
          this.navigate('ai');
          break;
        case '6':
          e.preventDefault();
          this.navigate('analytics');
          break;
        case '7':
          e.preventDefault();
          this.navigate('settings');
          break;
        case '8':
          e.preventDefault();
          this.navigate('focus');
          break;
        case '9':
          e.preventDefault();
          this.navigate('notes');
          break;
        case '?':
          e.preventDefault();
          this.showShortcutsHelp();
          break;
      }
    });
  },

  showShortcutsHelp() {
    try {
      openModal('⌨️ اختصارات لوحة المفاتيح', `
        <div style="display:grid;gap:var(--spacing-sm);">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-xs) 0;border-bottom:1px solid var(--border);">
            <span>مهمة جديدة</span><kbd style="background:var(--surface-2);padding:2px 8px;border-radius:4px;font-size:0.75rem;">Ctrl+N</kbd>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-xs) 0;border-bottom:1px solid var(--border);">
            <span>لوحة التحكم</span><kbd style="background:var(--surface-2);padding:2px 8px;border-radius:4px;font-size:0.75rem;">Ctrl+1</kbd>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-xs) 0;border-bottom:1px solid var(--border);">
            <span>المهام</span><kbd style="background:var(--surface-2);padding:2px 8px;border-radius:4px;font-size:0.75rem;">Ctrl+2</kbd>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-xs) 0;border-bottom:1px solid var(--border);">
            <span>Kanban</span><kbd style="background:var(--surface-2);padding:2px 8px;border-radius:4px;font-size:0.75rem;">Ctrl+3</kbd>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-xs) 0;border-bottom:1px solid var(--border);">
            <span>التقويم</span><kbd style="background:var(--surface-2);padding:2px 8px;border-radius:4px;font-size:0.75rem;">Ctrl+4</kbd>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-xs) 0;border-bottom:1px solid var(--border);">
            <span>المساعد الذكي</span><kbd style="background:var(--surface-2);padding:2px 8px;border-radius:4px;font-size:0.75rem;">Ctrl+5</kbd>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-xs) 0;border-bottom:1px solid var(--border);">
            <span>التحليلات</span><kbd style="background:var(--surface-2);padding:2px 8px;border-radius:4px;font-size:0.75rem;">Ctrl+6</kbd>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-xs) 0;border-bottom:1px solid var(--border);">
            <span>الإعدادات</span><kbd style="background:var(--surface-2);padding:2px 8px;border-radius:4px;font-size:0.75rem;">Ctrl+7</kbd>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-xs) 0;border-bottom:1px solid var(--border);">
            <span>وضع التركيز</span><kbd style="background:var(--surface-2);padding:2px 8px;border-radius:4px;font-size:0.75rem;">Ctrl+8</kbd>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-xs) 0;border-bottom:1px solid var(--border);">
            <span>الملاحظات</span><kbd style="background:var(--surface-2);padding:2px 8px;border-radius:4px;font-size:0.75rem;">Ctrl+9</kbd>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-xs) 0;border-bottom:1px solid var(--border);">
            <span>قائمة الأوامر</span><kbd style="background:var(--surface-2);padding:2px 8px;border-radius:4px;font-size:0.75rem;">Ctrl+K</kbd>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-xs) 0;">
            <span>قائمة الاختصارات</span><kbd style="background:var(--surface-2);padding:2px 8px;border-radius:4px;font-size:0.75rem;">/</kbd>
          </div>
        </div>
      `);
    } catch (error) {
      console.error('Error showing shortcuts help:', error);
    }
  },

  /* ═══════════════════════════════════════════════
     صفحات محفوظة من app.js القديم
     ═══════════════════════════════════════════════ */

  renderPrayer() {
    return `
      <div class="page active">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="clock"></i> أوقات الصلاة</h3>
            <button class="btn btn-primary" onclick="App.refreshPrayer()"><i data-lucide="refresh-cw"></i> تحديث</button>
          </div>
          <div class="prayer-grid" id="fullPrayers"><div class="loading"><div class="spinner"></div></div></div>
        </div>
        <div class="card" style="margin-top:var(--spacing-xl);">
          <div class="card-header"><h3 class="card-title"><i data-lucide="map-pin"></i> إعدادات الموقع</h3></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">المدينة</label>
              <select id="prayerCity" class="form-select">
                <option value="Cairo">القاهرة</option><option value="Alexandria">الإسكندرية</option>
                <option value="Giza">الجيزة</option><option value="Mansoura">المنصورة</option>
                <option value="Tanta">طنطا</option><option value="Asyut">أسيوط</option>
                <option value="Ismailia">الإسماعيلية</option><option value="Luxor">الأقصر</option>
                <option value="Aswan">أسوان</option><option value="Mecca">مكة المكرمة</option>
                <option value="Medina">المدينة المنورة</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">طريقة الحساب</label>
              <select id="prayerMethod" class="form-select">
                <option value="Egypt">الهيئة المصرية</option><option value="Makkah">أم القرى</option>
                <option value="MWL">رابطة العالم الإسلامي</option><option value="ISNA">أمريكا الشمالية</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary" onclick="App.savePrayerSettings()"><i data-lucide="save"></i> حفظ</button>
        </div>
      </div>
    `;
  },

  async loadFullPrayerTimes() {
    try {
      const el = document.getElementById('fullPrayers');
      if (!el) return;

      const cached = await getSetting('cachedPrayerTimes');
      const timings = cached?.timings || this.prayerData?.timings || {};
      const current = getCurrentPrayer(timings);
      const prayers = [
        { name: 'الإمساك', key: 'Imsak', icon: 'moon' },
        { name: 'الفجر', key: 'Fajr', icon: 'cloud-sun' },
        { name: 'الشروق', key: 'Sunrise', icon: 'sunrise' },
        { name: 'الظهر', key: 'Dhuhr', icon: 'sun' },
        { name: 'العصر', key: 'Asr', icon: 'sun-dim' },
        { name: 'المغرب', key: 'Maghrib', icon: 'sunset' },
        { name: 'العشاء', key: 'Isha', icon: 'moon' },
        { name: 'منتصف الليل', key: 'Midnight', icon: 'star' }
      ];
      const next = getNextPrayer(timings);

      el.innerHTML = prayers.map(p => `
        <div class="prayer-card ${current.key === p.key ? 'current' : ''}">
          <i data-lucide="${p.icon}" class="prayer-card-icon"></i>
          <div class="prayer-card-name">${p.name}</div>
          <div class="prayer-card-time">${timings[p.key] || '--:--'}</div>
          ${next.name === p.name ? `<div class="prayer-card-remaining">بعد ${next.timeRemaining}</div>` : ''}
        </div>
      `).join('');
      this.setupLucide();

      const cityEl = document.getElementById('prayerCity');
      const methodEl = document.getElementById('prayerMethod');
      if (cityEl) cityEl.value = await getSetting('city') || 'Cairo';
      if (methodEl) methodEl.value = await getSetting('prayerMethod') || 'Egypt';
    } catch (error) {
      console.error('Error loading prayers:', error);
    }
  },

  async refreshPrayer() {
    showToast('جاري التحديث...', 'info');
    this.prayerData = await refreshPrayerTimes();
    this.updateNextPrayer();
    this.loadFullPrayerTimes();
    showToast('تم التحديث', 'success');
  },

  async savePrayerSettings() {
    try {
      const city = document.getElementById('prayerCity')?.value;
      const method = document.getElementById('prayerMethod')?.value;
      await updatePrayerSettings({ city, method });
      showToast('تم الحفظ', 'success');
      this.refreshPrayer();
    } catch (error) {
      console.error('Error saving prayer settings:', error);
    }
  },



  /* ═══════════════════════════════════════════════
     Theme Toggle
     ═══════════════════════════════════════════════ */

  async toggleTheme() {
    try {
      const settings = await getAllSettings();
      const newTheme = settings.theme === 'light' ? 'dark' : 'light';
      await setSetting('theme', newTheme);
      if (typeof Settings !== 'undefined') {
        Settings.settings = await getAllSettings();
        Settings.applyTheme();
      }
      showToast(newTheme === 'light' ? '☀️ السمة الفاتحة' : '🌙 السمة الداكنة', 'info');
    } catch (error) {
      console.error('Error toggling theme:', error);
    }
  },

  /* ═══════════════════════════════════════════════
     Export / Import
     ═══════════════════════════════════════════════ */

  async exportData() {
    try {
      const data = await exportAllData();
      if (data) downloadJSON(data, `hayah-backup-${new Date().toISOString().split('T')[0]}.json`);
    } catch (error) {
      console.error('Error exporting:', error);
      showToast('خطأ في التصدير', 'error');
    }
  },

  importData() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const data = await readJSONFile(file);
          const ok = await importAllData(data);
          if (ok) {
            showToast('تم الاستيراد بنجاح', 'success');
            this.showPage(this.currentPage);
          } else {
            showToast('خطأ في الاستيراد', 'error');
          }
        } catch (err) {
          console.error('Error importing:', err);
          showToast('ملف غير صالح', 'error');
        }
      };
      input.click();
    } catch (error) {
      console.error('Error importing:', error);
    }
  },

  async clearAllData() {
    try {
      if (confirm('هل أنت متأكد من مسح كل البيانات؟ لا يمكن التراجع.')) {
        await clearAllData();
        showToast('تم مسح البيانات', 'success');
        this.showPage('dashboard');
      }
    } catch (error) {
      console.error('Error clearing:', error);
      showToast('خطأ في المسح', 'error');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

window.App = App;
window.AppState = AppState;
