'use strict';

const HABIT_ICONS = ['📖','🕌','💪','🏃','💧','🥗','😴','📝','🎯','🧘','💊','🌱','📚','🎨','🎵','👨‍👩‍👧','💰','🔧','🌍','⭐','☕','🥦','🏋️','🧠','🌿'];
const HABIT_COLORS = ['#148f77','#d4ac0d','#3498db','#e74c3c','#9b59b6','#2ecc71','#e67e22','#1abc9c'];
const CATEGORY_NAMES = { spiritual: 'روحاني', health: 'صحة', learning: 'تعلم', social: 'اجتماعي', other: 'أخرى' };
const MILESTONES = { 7: '🔥 أسبوع كامل! أنت رائع', 30: '⭐ شهر كامل! إنجاز عظيم', 100: '🏆 100 يوم! أسطورة!' };

function getCompletionRate(completedDates, days = 30) {
  try {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (completedDates.includes(d.toISOString().split('T')[0])) count++;
    }
    return Math.round((count / days) * 100);
  } catch (error) {
    console.error('Error calculating completion rate:', error);
    return 0;
  }
}

function isHabitDoneToday(completedDates) {
  const today = new Date().toISOString().split('T')[0];
  return completedDates.includes(today);
}

function getTodayCount(completedDates) {
  const today = new Date().toISOString().split('T')[0];
  return (completedDates || []).filter(d => d === today).length;
}

const Habits = {
  habits: [],
  todayStr: '',
  expandedHabit: null,
  currentMonth: new Date(),

  async init() {
    this.todayStr = new Date().toISOString().split('T')[0];
    await this.loadData();
    this.render();
    this.bindEvents();
  },

  async loadData() {
    try {
      this.habits = await getAllHabits();
      for (const h of this.habits) {
        h._streak = calculateStreak(h.completedDates || []);
        h._doneToday = (h.completedDates || []).includes(this.todayStr);
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        let c30 = 0;
        for (const d of (h.completedDates || [])) {
          const dd = new Date(d);
          if (dd >= thirtyDaysAgo && dd <= now) c30++;
        }
        h._rate30 = Math.round((c30 / 30) * 100);
        h._totalDays = (h.completedDates || []).length;
      }
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  },

  render() {
    const container = document.getElementById('pageContent');
    if (!container) return;

    const total = this.habits.length;
    const done = this.habits.filter(h => h._doneToday).length;
    const pct = calculateProgress(done, total);
    const msg = this.getMotivationMessage(pct);

    container.innerHTML = `
      <div class="page active">
        <!-- Header -->
        <div class="habits-header">
          <div class="habits-header-content">
            <div>
              <h2 class="habits-title">🌱 عاداتي اليوم</h2>
              <p class="habits-date">${new Date().toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
            </div>
            <button class="btn btn-primary" id="habitsAddBtn"><i data-lucide="plus"></i> عادة جديدة</button>
          </div>
          <div class="habits-progress">
            <div class="habits-progress-info">
              <span>${done}/${total} عادة</span>
              <span class="habits-motivation" id="habitsMotivation">${msg}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill accent" style="width:${pct}%"></div></div>
          </div>
        </div>

        <!-- Today's Habits -->
        <div class="habits-section">
          <h3 class="habits-section-title">اليوم</h3>
          <div class="habits-today-grid" id="habitsTodayGrid">
            ${this.renderTodayHabits()}
          </div>
        </div>

        <!-- Heatmap -->
        <div class="card habits-heatmap-card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="calendar-heart"></i> سجل العادات</h3>
            <div class="heatmap-nav">
              <button class="btn btn-ghost btn-sm" id="heatmapPrev"><i data-lucide="chevron-right"></i></button>
              <span id="heatmapLabel">${this.getHeatmapLabel()}</span>
              <button class="btn btn-ghost btn-sm" id="heatmapNext"><i data-lucide="chevron-left"></i></button>
            </div>
          </div>
          <div id="heatmapContainer">${this.renderHeatmap()}</div>
        </div>

        <!-- All Habits -->
        <div class="habits-section">
          <h3 class="habits-section-title">كل العادات</h3>
          <div id="habitsAllList">${this.renderAllHabits()}</div>
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderTodayHabits() {
    if (this.habits.length === 0) {
      return '<div class="empty-state"><i data-lucide="sprout" class="empty-state-icon"></i><p>لا توجد عادات — أضف عادة جديدة!</p></div>';
    }

    return this.habits.map(h => {
      const done = h._doneToday;
      const todayCount = getTodayCount(h.completedDates);
      const targetPct = h.target ? Math.min(100, Math.round((todayCount / h.target) * 100)) : (done ? 100 : 0);
      return `
        <div class="habit-card ${done ? 'done' : ''}" style="--habit-color:${h.color || '#3498db'}" data-id="${h.id}">
          <div class="habit-card-top">
            <div class="habit-icon-large">${h.icon || '📖'}</div>
            <button class="habit-check-btn ${done ? 'done' : ''}" data-id="${h.id}" ${done ? `style="background:${h.color || '#3498db'};border-color:${h.color || '#3498db'}"` : `style="border-color:${h.color || '#3498db'}44"`}>
              ${done ? '✓' : '○'}
            </button>
          </div>
          <div class="habit-card-info">
            <div class="habit-card-name">${sanitizeHTML(h.name)}</div>
            <div class="habit-card-meta">
              <span class="streak-badge">🔥 ${h._streak} يوم</span>
              <span class="habit-category-badge" style="background:${h.color || '#3498db'}22;color:${h.color || '#3498db'}">${CATEGORY_NAMES[h.category] || 'أخرى'}</span>
            </div>
            ${h.target ? `
            <div class="habit-target-row" data-id="${h.id}">
              <button class="habit-target-btn minus" data-id="${h.id}" data-action="decrement">−</button>
              <div class="habit-target-progress">
                <div class="progress-bar" style="height:6px;">
                  <div class="progress-fill habit-target-fill" style="width:${targetPct}%;background:${h.color};"></div>
                </div>
                <span class="habit-target-text">${todayCount}/${h.target} ${h.unit || ''}</span>
              </div>
              <button class="habit-target-btn plus" data-id="${h.id}" data-action="increment">+</button>
            </div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  renderHeatmap() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const totalCells = firstDay + daysInMonth;
    const rows = Math.ceil(totalCells / 7);
    const months = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const days = ['ح','ن','ث','ر','خ','ج','س'];

    let html = '<div class="heatmap-wrapper"><div class="heatmap-days">';
    for (const d of days) html += `<div class="heatmap-day-label">${d}</div>`;
    html += '</div><div class="heatmap-grid">';

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < 7; j++) {
        const cellIdx = i * 7 + j;
        const dayNum = cellIdx - firstDay + 1;
        if (cellIdx < firstDay || dayNum > daysInMonth) {
          html += '<div class="heatmap-cell empty"></div>';
        } else {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          let count = 0;
          for (const h of this.habits) {
            if ((h.completedDates || []).includes(dateStr)) count++;
          }
          const total = this.habits.length;
          const intensity = total > 0 ? Math.min(4, Math.floor((count / total) * 5)) : 0;
          html += `<div class="heatmap-cell level-${intensity}" title="${dateStr}: ${count}/${total} عادات"></div>`;
        }
      }
    }

    html += '</div></div>';
    return html;
  },

  renderAllHabits() {
    if (this.habits.length === 0) {
      return '<div class="empty-state"><i data-lucide="list" class="empty-state-icon"></i><p>لا توجد عادات</p></div>';
    }

    return this.habits.map(h => {
      const expanded = this.expandedHabit === h.id;
      const last14 = this.getLast14Days(h.completedDates || []);
      return `
        <div class="habit-all-card ${expanded ? 'expanded' : ''}" data-id="${h.id}">
          <div class="habit-all-header" data-toggle="${h.id}">
            <div class="habit-all-icon" style="background:${h.color || '#3498db'}22;">${h.icon || '📖'}</div>
            <div class="habit-all-info">
              <div class="habit-all-name">${sanitizeHTML(h.name)}</div>
              <div class="habit-all-meta">
                <span class="streak-badge">🔥 ${h._streak} يوم</span>
                <span>${h._rate30}% في 30 يوم</span>
              </div>
            </div>
            <div class="habit-all-actions">
              <button class="btn btn-ghost btn-sm habit-edit-btn" data-id="${h.id}"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
              <button class="btn btn-ghost btn-sm habit-del-btn" data-id="${h.id}" style="color:var(--danger);"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
              <i data-lucide="chevron-down" class="habit-expand-icon" style="width:16px;height:16px;color:var(--text-muted);"></i>
            </div>
          </div>
          <div class="habit-all-body" ${expanded ? '' : 'style="display:none;"'}>
            <div class="habit-stats-row">
              <div class="habit-stat"><span class="habit-stat-value">${h._streak}</span><span class="habit-stat-label">السلاسل الحالية</span></div>
              <div class="habit-stat"><span class="habit-stat-value">${h.bestStreak || h._streak}</span><span class="habit-stat-label">أفضل سلسلة</span></div>
              <div class="habit-stat"><span class="habit-stat-value">${h._rate30}%</span><span class="habit-stat-label">معدل 30 يوم</span></div>
              <div class="habit-stat"><span class="habit-stat-value">${h._totalDays}</span><span class="habit-stat-label">إجمالي الأيام</span></div>
            </div>
            <div class="habit-mini-chart">
              ${last14.map(d => `<div class="mini-cell ${d ? 'filled' : ''}" title="${d.date}"></div>`).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  getLast14Days(completedDates) {
    const result = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      result.push({ date: ds, done: completedDates.includes(ds) });
    }
    return result;
  },

  getMotivationMessage(pct) {
    if (pct === 0) return 'ابدأ يومك بسم الله 🌅';
    if (pct < 50) return 'ممتاز! استمر 💪';
    if (pct < 100) return 'رائع! اكمل 🔥';
    return 'أحسنت! يوم مكتمل ⭐';
  },

  getHeatmapLabel() {
    const months = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return `${months[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
  },

  async incrementHabit(id) {
    try {
      const habit = this.habits.find(h => h.id === id);
      if (!habit) return;
      const todayStr = this.todayStr;
      habit.completedDates = [...(habit.completedDates || []), todayStr];
      habit._doneToday = true;
      const newStreak = calculateStreak(habit.completedDates || []);
      if (newStreak > (habit.bestStreak || 0)) {
        await updateHabit(id, { completedDates: habit.completedDates, bestStreak: newStreak, streak: newStreak });
        habit.bestStreak = newStreak;
      } else {
        await updateHabit(id, { completedDates: habit.completedDates, streak: newStreak });
      }
      habit._streak = newStreak;
      this.checkStreakMilestones(habit, newStreak);
      this.render();
    } catch (error) {
      console.error('Error incrementing habit:', error);
    }
  },

  async decrementHabit(id) {
    try {
      const habit = this.habits.find(h => h.id === id);
      if (!habit) return;
      const todayStr = this.todayStr;
      const idx = (habit.completedDates || []).lastIndexOf(todayStr);
      if (idx >= 0) {
        habit.completedDates.splice(idx, 1);
      }
      habit._doneToday = (habit.completedDates || []).includes(todayStr);
      const newStreak = calculateStreak(habit.completedDates || []);
      await updateHabit(id, { completedDates: habit.completedDates, streak: newStreak });
      habit._streak = newStreak;
      this.render();
    } catch (error) {
      console.error('Error decrementing habit:', error);
    }
  },

  async toggleHabit(id) {
    try {
      const habit = this.habits.find(h => h.id === id);
      if (!habit) return;

      if ((habit.completedDates || []).includes(this.todayStr)) {
        habit.completedDates = (habit.completedDates || []).filter(d => d !== this.todayStr);
      } else {
        habit.completedDates = [...(habit.completedDates || []), this.todayStr];
      }

      habit._doneToday = !habit._doneToday;
      const newStreak = calculateStreak(habit.completedDates || []);
      habit._streak = newStreak;
      if (newStreak > (habit.bestStreak || 0)) {
        await updateHabit(id, { completedDates: habit.completedDates, bestStreak: newStreak, streak: newStreak });
        habit.bestStreak = newStreak;
      } else {
        await updateHabit(id, { completedDates: habit.completedDates, streak: newStreak });
      }

      this.checkStreakMilestones(habit, newStreak);
      this.render();
    } catch (error) {
      console.error('Error toggling habit:', error);
      showToast('حدث خطأ', 'error');
    }
  },

  checkStreakMilestones(habit, newStreak) {
    for (const [days, msg] of Object.entries(MILESTONES)) {
      if (newStreak === parseInt(days)) {
        showToast(`🎉 ${habit.icon || '📖'} "${habit.name}": ${msg}`, 'success', 4000);
        break;
      }
    }
  },

  openAddModal() {
    openModal('🌱 عادة جديدة', this.getHabitForm());
    setTimeout(() => {
      document.getElementById('habitFormElement')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveHabit();
      });
      document.querySelectorAll('.icon-option').forEach(el => {
        el.addEventListener('click', () => {
          document.querySelectorAll('.icon-option').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          document.getElementById('habitIconInput').value = el.dataset.icon;
        });
      });
      document.querySelectorAll('.color-option').forEach(el => {
        el.addEventListener('click', () => {
          document.querySelectorAll('.color-option').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          document.getElementById('habitColorInput').value = el.dataset.color;
        });
      });
      document.getElementById('habitHasTarget')?.addEventListener('change', (e) => {
        document.getElementById('habitTargetGroup').style.display = e.target.checked ? 'flex' : 'none';
      });
    }, 50);
  },

  openEditModal(id) {
    const habit = this.habits.find(h => h.id === id);
    if (!habit) return;
    openModal('✏️ تعديل العادة', this.getHabitForm(habit));
    setTimeout(() => {
      document.getElementById('habitFormElement')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.updateHabit(id);
      });
      document.querySelectorAll('.icon-option').forEach(el => {
        el.addEventListener('click', () => {
          document.querySelectorAll('.icon-option').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          document.getElementById('habitIconInput').value = el.dataset.icon;
        });
      });
      document.querySelectorAll('.color-option').forEach(el => {
        el.addEventListener('click', () => {
          document.querySelectorAll('.color-option').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          document.getElementById('habitColorInput').value = el.dataset.color;
        });
      });
      document.getElementById('habitHasTarget')?.addEventListener('change', (e) => {
        document.getElementById('habitTargetGroup').style.display = e.target.checked ? 'flex' : 'none';
      });
    }, 50);
  },

  getHabitForm(habit = null) {
    const selectedIcon = habit?.icon || '📖';
    const selectedColor = habit?.color || '#148f77';
    const hasTarget = !!(habit?.target);

    return `
      <form id="habitFormElement">
        <div class="form-group">
          <label class="form-label">اسم العادة *</label>
          <input type="text" id="habitNameInput" class="form-input" value="${habit ? sanitizeHTML(habit.name) : ''}" placeholder="مثال: قراءة القرآن" required autofocus>
        </div>

        <div class="form-group">
          <label class="form-label">الأيقونة</label>
          <input type="hidden" id="habitIconInput" value="${selectedIcon}">
          <div class="icon-grid">
            ${HABIT_ICONS.map(ic => `<div class="icon-option ${ic === selectedIcon ? 'selected' : ''}" data-icon="${ic}">${ic}</div>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">اللون</label>
          <input type="hidden" id="habitColorInput" value="${selectedColor}">
          <div class="color-grid">
            ${HABIT_COLORS.map(c => `<div class="color-option ${c === selectedColor ? 'selected' : ''}" data-color="${c}" style="background:${c};${c === selectedColor ? 'border-color:var(--text);transform:scale(1.15);' : ''}"></div>`).join('')}
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">التكرار</label>
            <select id="habitFreqInput" class="form-select">
              <option value="daily" ${habit?.frequency === 'daily' ? 'selected' : ''}>يومي</option>
              <option value="weekly" ${habit?.frequency === 'weekly' ? 'selected' : ''}>أسبوعي</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">الفئة</label>
            <select id="habitCategoryInput" class="form-select">
              <option value="spiritual" ${habit?.category === 'spiritual' ? 'selected' : ''}>روحاني</option>
              <option value="health" ${habit?.category === 'health' ? 'selected' : ''}>صحة</option>
              <option value="learning" ${habit?.category === 'learning' ? 'selected' : ''}>تعلم</option>
              <option value="social" ${habit?.category === 'social' ? 'selected' : ''}>اجتماعي</option>
              <option value="other" ${(!habit?.category || habit?.category === 'other') ? 'selected' : ''}>أخرى</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="checkbox-label" style="display:flex;align-items:center;gap:var(--spacing-sm);cursor:pointer;">
            <input type="checkbox" id="habitHasTarget" ${hasTarget ? 'checked' : ''} style="accent-color:var(--primary);">
            <span style="font-size:0.875rem;">هل فيه عدد مستهدف؟ (مثل 8 أكواب ماء)</span>
          </label>
        </div>

        <div class="form-row" id="habitTargetGroup" style="${hasTarget ? 'display:flex' : 'display:none'}">
          <div class="form-group">
            <label class="form-label">العدد المستهدف</label>
            <input type="number" id="habitTargetInput" class="form-input" value="${habit?.target || ''}" min="1" placeholder="مثال: 8">
          </div>
          <div class="form-group">
            <label class="form-label">الوحدة</label>
            <input type="text" id="habitUnitInput" class="form-input" value="${habit?.unit || 'مرة'}" placeholder="مثال: كوب">
          </div>
        </div>

        <div style="display:flex;gap:var(--spacing-sm);justify-content:flex-end;margin-top:var(--spacing-lg);">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
          <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> ${habit ? 'تحديث' : 'إضافة'}</button>
        </div>
      </form>
    `;
  },

  async saveHabit() {
    try {
      const name = document.getElementById('habitNameInput')?.value?.trim();
      if (!name) { showToast('أدخل اسم العادة', 'warning'); return; }

      const icon = document.getElementById('habitIconInput')?.value || '📖';
      const color = document.getElementById('habitColorInput')?.value || '#148f77';
      const frequency = document.getElementById('habitFreqInput')?.value || 'daily';
      const category = document.getElementById('habitCategoryInput')?.value || 'other';
      const hasTarget = document.getElementById('habitHasTarget')?.checked;
      const target = hasTarget ? parseInt(document.getElementById('habitTargetInput')?.value) || null : null;
      const unit = hasTarget ? (document.getElementById('habitUnitInput')?.value?.trim() || 'مرة') : 'مرة';

      await addHabit({ name, icon, color, frequency, target, unit, category });
      closeModal();
      showToast('تم إضافة العادة 🌱', 'success');
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Error saving habit:', error);
      showToast('خطأ في الحفظ', 'error');
    }
  },

  async updateHabit(id) {
    try {
      const name = document.getElementById('habitNameInput')?.value?.trim();
      if (!name) { showToast('أدخل اسم العادة', 'warning'); return; }

      const icon = document.getElementById('habitIconInput')?.value || '📖';
      const color = document.getElementById('habitColorInput')?.value || '#148f77';
      const frequency = document.getElementById('habitFreqInput')?.value || 'daily';
      const category = document.getElementById('habitCategoryInput')?.value || 'other';
      const hasTarget = document.getElementById('habitHasTarget')?.checked;
      const target = hasTarget ? parseInt(document.getElementById('habitTargetInput')?.value) || null : null;
      const unit = hasTarget ? (document.getElementById('habitUnitInput')?.value?.trim() || 'مرة') : 'مرة';

      await updateHabit(id, { name, icon, color, frequency, target, unit, category });
      closeModal();
      showToast('تم التحديث', 'success');
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Error updating habit:', error);
      showToast('خطأ في التحديث', 'error');
    }
  },

  async deleteHabit(id) {
    try {
      if (!confirm('⚠️ حذف العادة؟ لا يمكن التراجع.')) return;
      await deleteHabit(id);
      showToast('تم حذف العادة', 'success');
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Error deleting habit:', error);
      showToast('خطأ في الحذف', 'error');
    }
  },

  bindEvents() {
    document.getElementById('habitsAddBtn')?.addEventListener('click', () => this.openAddModal());

    document.getElementById('habitsTodayGrid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.habit-check-btn');
      if (btn) this.toggleHabit(parseInt(btn.dataset.id));
      const targetBtn = e.target.closest('.habit-target-btn');
      if (targetBtn) {
        const id = parseInt(targetBtn.dataset.id);
        if (targetBtn.dataset.action === 'increment') this.incrementHabit(id);
        else if (targetBtn.dataset.action === 'decrement') this.decrementHabit(id);
      }
    });

    document.getElementById('habitsAllList')?.addEventListener('click', (e) => {
      const header = e.target.closest('.habit-all-header');
      if (header && e.target.closest('.habit-all-actions')) return;
      if (header) {
        const id = parseInt(header.dataset.toggle);
        this.expandedHabit = this.expandedHabit === id ? null : id;
        this.render();
        return;
      }
      const editBtn = e.target.closest('.habit-edit-btn');
      if (editBtn) {
        e.stopPropagation();
        this.openEditModal(parseInt(editBtn.dataset.id));
        return;
      }
      const delBtn = e.target.closest('.habit-del-btn');
      if (delBtn) {
        e.stopPropagation();
        this.deleteHabit(parseInt(delBtn.dataset.id));
      }
    });

    document.getElementById('heatmapPrev')?.addEventListener('click', () => {
      this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
      const container = document.getElementById('heatmapContainer');
      const label = document.getElementById('heatmapLabel');
      if (container) container.innerHTML = this.renderHeatmap();
      if (label) label.textContent = this.getHeatmapLabel();
    });

    document.getElementById('heatmapNext')?.addEventListener('click', () => {
      this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
      const container = document.getElementById('heatmapContainer');
      const label = document.getElementById('heatmapLabel');
      if (container) container.innerHTML = this.renderHeatmap();
      if (label) label.textContent = this.getHeatmapLabel();
    });
  }
};

if (typeof window !== 'undefined') {
  window.Habits = Habits;
  window.getCompletionRate = getCompletionRate;
  window.isHabitDoneToday = isHabitDoneToday;
  window.getTodayCount = getTodayCount;
}
