'use strict';

/**
 * نظام حياة المسلم — نظام المهام الكامل (Phase 3)
 * Tasks Management — قلب النظام
 */

const Tasks = {
  currentFilter: 'all',
  currentPriority: 'all',
  currentProject: 'all',
  currentSort: 'date',
  searchQuery: '',
  selectedTasks: new Set(),
  projects: [],

  async init() {
    try {
      this.projects = await getAllProjects();
      this.selectedTasks = new Set();
      this.render();
      this.bindEvents();
    } catch (error) {
      console.error('Error initializing tasks:', error);
      showToast('خطأ في تحميل المهام', 'error');
    }
  },

  render() {
    try {
      const container = document.getElementById('pageContent');
      if (!container) return;

      container.innerHTML = `
        <div class="page active">
          <!-- Header -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <i data-lucide="check-square"></i>
                مهامي
                <span class="badge badge-accent" id="tasksCount">0</span>
              </h3>
              <div style="display:flex;gap:var(--spacing-sm);align-items:center;">
                <div class="search-box" style="position:relative;">
                  <i data-lucide="search" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--text-muted);"></i>
                  <input type="text" id="taskSearch" class="form-input" style="padding-right:36px;width:220px;" placeholder="بحث في المهام...">
                </div>
                <button class="btn btn-ghost btn-sm" onclick="Tasks.aiSortTasks()" title="رتب بالذكاء الاصطناعي" id="aiSortBtn">
                  <i data-lucide="sparkles" style="width:14px;height:14px;"></i> رتب
                </button>
                <button class="btn btn-primary" id="taskAddBtn">
                  <i data-lucide="plus"></i> مهمة جديدة
                </button>
              </div>
            </div>

            <!-- Filters -->
            <div class="filters-bar" style="display:flex;flex-wrap:wrap;gap:var(--spacing-sm);align-items:center;padding-top:var(--spacing-sm);">
              <div class="filter-group" style="display:flex;gap:var(--spacing-xs);">
                <button class="btn btn-sm filter-btn active" data-filter="all">الكل</button>
                <button class="btn btn-sm filter-btn" data-filter="today">اليوم</button>
                <button class="btn btn-sm filter-btn" data-filter="week">الأسبوع</button>
                <button class="btn btn-sm filter-btn" data-filter="done">منتهية</button>
                <button class="btn btn-sm filter-btn" data-filter="overdue">متأخرة</button>
              </div>
              <div class="divider" style="height:20px;"></div>
              <div class="filter-group" style="display:flex;gap:var(--spacing-xs);">
                <button class="btn btn-sm btn-outline filter-prio" data-prio="all">الأولوية</button>
                <button class="btn btn-sm btn-ghost filter-prio" data-prio="high">🔴 عالي</button>
                <button class="btn btn-sm btn-ghost filter-prio" data-prio="medium">🟡 متوسط</button>
                <button class="btn btn-sm btn-ghost filter-prio" data-prio="low">🟢 منخفض</button>
              </div>
              <div class="divider" style="height:20px;"></div>
              <select id="taskProjectFilter" class="form-select" style="width:140px;padding:4px 8px;font-size:0.75rem;">
                <option value="all">كل المشاريع</option>
                ${this.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
              </select>
              <select id="taskSortBy" class="form-select" style="width:120px;padding:4px 8px;font-size:0.75rem;">
                <option value="date">حسب التاريخ</option>
                <option value="priority">حسب الأولوية</option>
                <option value="name">حسب الاسم</option>
              </select>
            </div>

            <!-- Bulk Actions Bar -->
            <div id="bulkActions" style="display:none;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--spacing-sm);margin-top:var(--spacing-sm);">
              <div style="display:flex;align-items:center;gap:var(--spacing-sm);">
                <span style="font-size:0.875rem;color:var(--text-muted);">
                  <span id="selectedCount">0</span> محدد
                </span>
                <div class="divider" style="height:16px;"></div>
                <button class="btn btn-sm btn-success" onclick="Tasks.bulkComplete()"><i data-lucide="check" style="width:14px;height:14px;"></i> إنجاز</button>
                <button class="btn btn-sm btn-outline" onclick="Tasks.bulkPriority('high')">🔴 عالي</button>
                <button class="btn btn-sm btn-outline" onclick="Tasks.bulkPriority('medium')">🟡 متوسط</button>
                <button class="btn btn-sm btn-outline" onclick="Tasks.bulkPriority('low')">🟢 منخفض</button>
                <button class="btn btn-sm btn-danger" onclick="Tasks.bulkDelete()"><i data-lucide="trash-2" style="width:14px;height:14px;"></i> حذف</button>
              </div>
            </div>
          </div>

          <!-- Task List -->
          <div id="tasksList" style="margin-top:var(--spacing-lg);"></div>
        </div>
      `;

      this.renderTaskList();
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error rendering tasks:', error);
    }
  },

  async renderTaskList() {
    try {
      let tasks = await db.tasks.orderBy('createdAt').reverse().toArray();

      // Apply filter
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      switch (this.currentFilter) {
        case 'today':
          tasks = tasks.filter(t => t.dueDate === today);
          break;
        case 'week':
          tasks = tasks.filter(t => t.dueDate && t.dueDate <= weekEnd);
          break;
        case 'done':
          tasks = tasks.filter(t => t.status === 'done');
          break;
        case 'overdue':
          tasks = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done');
          break;
      }

      // Apply priority filter
      if (this.currentPriority !== 'all') {
        tasks = tasks.filter(t => t.priority === this.currentPriority);
      }

      // Apply project filter
      if (this.currentProject !== 'all') {
        tasks = tasks.filter(t => t.project == this.currentProject);
      }

      // Apply search
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        tasks = tasks.filter(t =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags?.some(tag => tag.toLowerCase().includes(q))
        );
      }

      // Sort
      const prioOrder = { high: 0, medium: 1, low: 2 };
      switch (this.currentSort) {
        case 'priority':
          tasks.sort((a, b) => (prioOrder[a.priority] || 1) - (prioOrder[b.priority] || 1));
          break;
        case 'name':
          tasks.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ar'));
          break;
        case 'date':
        default:
          tasks.sort((a, b) => {
            if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
          break;
      }

      // Update count
      const countEl = document.getElementById('tasksCount');
      if (countEl) countEl.textContent = tasks.length;

      // Render
      const container = document.getElementById('tasksList');
      if (!container) return;

      if (tasks.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i data-lucide="inbox" class="empty-state-icon"></i>
            <h3>مفيش مهام</h3>
            <p>اضغط "مهمة جديدة" لإضافة أول مهمة</p>
          </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
      }

      // Select-all checkbox
      const anyPending = tasks.some(t => t.status !== 'done');
      const allSelected = tasks.length > 0 && tasks.every(t => this.selectedTasks.has(t.id));

      let html = `
        <div class="card" style="margin-bottom:var(--spacing-md);">
          <div style="display:flex;align-items:center;gap:var(--spacing-sm);">
            <div class="task-checkbox" onclick="Tasks.toggleSelectAll()">
              ${allSelected ? '<i data-lucide="check" style="width:14px;height:14px;"></i>' : ''}
            </div>
            <span style="font-size:0.875rem;color:var(--text-muted);">تحديد الكل</span>
          </div>
        </div>
      `;

      tasks.forEach(task => {
        const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'done';
        const isDone = task.status === 'done';
        const isSelected = this.selectedTasks.has(task.id);
        const hijri = task.dueDate ? toHijri(new Date(task.dueDate)) : null;
        const project = this.projects.find(p => p.id == task.project);
        const prayerNames = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
        const prayerName = task.prayerLink ? prayerNames[task.prayerLink] : null;

        html += `
          <div class="task-card ${isOverdue ? 'task-overdue' : ''} ${isDone ? 'task-done' : ''} ${isSelected ? 'task-selected' : ''}" id="task-${task.id}">
            <div class="task-card-header">
              <div class="task-card-right" style="display:flex;align-items:center;gap:var(--spacing-sm);">
                <div class="task-checkbox ${isDone ? 'checked' : ''}" onclick="Tasks.toggleTask(${task.id})">
                  ${isDone ? '<i data-lucide="check" style="width:14px;height:14px;"></i>' : ''}
                </div>
                <div class="task-checkbox" onclick="Tasks.toggleSelect(${task.id})" style="border-color:var(--border-light);width:16px;height:16px;">
                  ${isSelected ? '<i data-lucide="check" style="width:12px;height:12px;"></i>' : ''}
                </div>
                <h4 class="task-title ${isDone ? 'done' : ''}">${sanitizeHTML(task.title)}</h4>
              </div>
              <div class="task-card-left" style="display:flex;align-items:center;gap:var(--spacing-sm);">
                <span class="task-priority ${getPriorityClass(task.priority)}">${getPriorityLabel(task.priority)}</span>
                ${project ? `<span class="badge" style="background:${project.color};color:var(--text);">${sanitizeHTML(project.name)}</span>` : ''}
                ${prayerName ? `<span class="badge badge-info"><i data-lucide="clock" style="width:10px;height:10px;"></i> ${prayerName}</span>` : ''}
              </div>
            </div>
            ${task.description ? `<p class="task-desc">${truncate(sanitizeHTML(task.description), 100)}</p>` : ''}
            <div class="task-card-footer">
              <div class="task-meta">
                ${task.dueDate ? `
                  <span class="task-date ${isOverdue ? 'overdue' : ''}">
                    <i data-lucide="calendar" style="width:12px;height:12px;"></i>
                    ${formatDateShort(task.dueDate)}
                    ${hijri ? `<span style="color:var(--accent);">(${hijri.day} ${hijri.monthName})</span>` : ''}
                  </span>
                ` : ''}
                ${task.niyyah ? `<span class="task-niyyah"><i data-lucide="heart" style="width:12px;height:12px;"></i> نية</span>` : ''}
              </div>
              <div class="task-tags" style="display:flex;gap:4px;flex-wrap:wrap;">
                ${(task.tags || []).map(tag => `<span class="badge badge-info">${sanitizeHTML(tag)}</span>`).join('')}
              </div>
              <div class="task-actions" style="display:flex;gap:4px;">
                <button class="btn btn-ghost btn-sm" onclick="Tasks.editTask(${task.id})" title="تعديل">
                  <i data-lucide="pencil" style="width:14px;height:14px;"></i>
                </button>
                <button class="btn btn-ghost btn-sm" onclick="Tasks.aiBreakDownTask(${task.id})" title="قسّم بالذكاء الاصطناعي">
                  <i data-lucide="sparkles" style="width:14px;height:14px;color:var(--accent);"></i>
                </button>
                <button class="btn btn-ghost btn-sm" onclick="Tasks.moveToKanban(${task.id})" title="نقل للـ Kanban">
                  <i data-lucide="columns" style="width:14px;height:14px;"></i>
                </button>
                <button class="btn btn-ghost btn-sm" onclick="Tasks.deleteTask(${task.id})" title="حذف">
                  <i data-lucide="trash-2" style="width:14px;height:14px;color:var(--danger);"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
      if (typeof lucide !== 'undefined') lucide.createIcons();

      // Update bulk actions bar
      this.updateBulkBar();
    } catch (error) {
      console.error('Error rendering task list:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Task CRUD
     ───────────────────────────────────────────────────── */

  async toggleTask(id) {
    try {
      const task = await getTask(id);
      if (!task) return;

      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await updateTask(id, { status: newStatus });

      if (newStatus === 'done') {
        const points = task.priority === 'high' ? 30 : task.priority === 'medium' ? 20 : 10;
        showToast(`أحسنت! مهمة منجزة ✓ +${points} نقطة`, 'success');
        this.showConfetti(id);
      }

      await this.renderTaskList();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  },

  async deleteTask(id) {
    try {
      if (confirm('هل أنت متأكد من حذف المهمة؟')) {
        await deleteTask(id);
        this.selectedTasks.delete(id);
        showToast('تم حذف المهمة', 'success');
        await this.renderTaskList();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  },

  openAddModal() {
    try {
      this.openTaskModal();
    } catch (error) {
      console.error('Error opening add modal:', error);
    }
  },

  async editTask(id) {
    try {
      const task = await getTask(id);
      if (!task) return;
      this.openTaskModal(task);
    } catch (error) {
      console.error('Error opening edit modal:', error);
    }
  },

  openTaskModal(task = null) {
    try {
      const isEdit = !!task;
      const hijriNow = toHijri(new Date());

      const projectsOptions = this.projects.map(p =>
        `<option value="${p.id}" ${task?.project == p.id ? 'selected' : ''}>${sanitizeHTML(p.name)}</option>`
      ).join('');

      const content = `
        <form onsubmit="Tasks.saveTask(event, ${task?.id || 'null'})" id="taskForm">
          <div class="form-group">
            <label class="form-label">عنوان المهمة *</label>
            <input type="text" id="tfTitle" class="form-input" value="${task ? sanitizeHTML(task.title) : ''}" required placeholder="اكتب عنوان المهمة...">
          </div>
          <div class="form-group">
            <label class="form-label">الوصف</label>
            <textarea id="tfDesc" class="form-textarea" placeholder="تفاصيل المهمة...">${task ? sanitizeHTML(task.description || '') : ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">النية (اختياري)</label>
            <div style="display:flex;gap:var(--spacing-sm);align-items:flex-start;">
              <textarea id="tfNiyyah" class="form-textarea" style="min-height:60px;flex:1;" placeholder="مثال: أعمل ده لوجه الله عشان أساعد أهلي">${task ? sanitizeHTML(task.niyyah || '') : ''}</textarea>
              <button type="button" class="btn btn-ghost btn-sm" id="niyyahSuggestBtn" onclick="Tasks.aiSuggestNiyyah()" style="white-space:nowrap;margin-top:0;">
                <i data-lucide="sparkles" style="width:12px;height:12px;"></i> اقترح نية
              </button>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">الأولوية</label>
              <div style="display:flex;gap:var(--spacing-sm);">
                <button type="button" class="btn btn-sm prio-btn ${task?.priority === 'high' ? 'btn-danger' : 'btn-outline'}" data-prio="high" onclick="Tasks.setModalPrio('high',this)">🔴 عالي</button>
                <button type="button" class="btn btn-sm prio-btn ${!task || task?.priority === 'medium' ? 'btn-accent' : 'btn-outline'}" data-prio="medium" onclick="Tasks.setModalPrio('medium',this)">🟡 متوسط</button>
                <button type="button" class="btn btn-sm prio-btn ${task?.priority === 'low' ? 'btn-success' : 'btn-outline'}" data-prio="low" onclick="Tasks.setModalPrio('low',this)">🟢 منخفض</button>
              </div>
              <input type="hidden" id="tfPriority" value="${task?.priority || 'medium'}">
            </div>
            <div class="form-group">
              <label class="form-label">الحالة</label>
              <select id="tfStatus" class="form-select">
                <option value="todo" ${task?.status === 'todo' ? 'selected' : ''}>للقيام</option>
                <option value="inProgress" ${task?.status === 'inProgress' ? 'selected' : ''}>قيد التنفيذ</option>
                <option value="done" ${task?.status === 'done' ? 'selected' : ''}>منجزة</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">تاريخ التسليم</label>
              <input type="date" id="tfDueDate" class="form-input" value="${task?.dueDate || ''}" oninput="Tasks.updateHijriPreview()">
              <div id="hijriPreview" style="margin-top:4px;font-size:0.75rem;color:var(--accent);">
                ${task?.dueDate ? (() => { const h = toHijri(new Date(task.dueDate)); return h ? `${h.day} ${h.monthName} ${h.year} هـ` : ''; })() : hijriNow ? `اليوم: ${hijriNow.day} ${hijriNow.monthName} ${hijriNow.year} هـ` : ''}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">ربط بصلاة</label>
              <select id="tfPrayerLink" class="form-select">
                <option value="">بدون</option>
                <option value="Fajr" ${task?.prayerLink === 'Fajr' ? 'selected' : ''}>قبل الفجر</option>
                <option value="Dhuhr" ${task?.prayerLink === 'Dhuhr' ? 'selected' : ''}>قبل الظهر</option>
                <option value="Asr" ${task?.prayerLink === 'Asr' ? 'selected' : ''}>قبل العصر</option>
                <option value="Maghrib" ${task?.prayerLink === 'Maghrib' ? 'selected' : ''}>قبل المغرب</option>
                <option value="Isha" ${task?.prayerLink === 'Isha' ? 'selected' : ''}>قبل العشاء</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">المشروع</label>
              <select id="tfProject" class="form-select">
                <option value="">بدون مشروع</option>
                ${projectsOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">تعيين إلى</label>
              <select id="tfAssignee" class="form-select">
                <option value="">بدون تعيين</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">الوسوم (Tags)</label>
              <input type="text" id="tfTags" class="form-input" value="${task ? (task.tags || []).join(', ') : ''}" placeholder="عبادة, عمل, مهم">
            </div>
          </div>
          <div style="display:flex;gap:var(--spacing-sm);justify-content:flex-end;margin-top:var(--spacing-lg);">
            <button type="button" class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ المهمة'}</button>
          </div>
        </form>
      `;

      openModal(isEdit ? 'تعديل المهمة' : 'مهمة جديدة', content);
    } catch (error) {
      console.error('Error opening task modal:', error);
    }
  },

  setModalPrio(prio, btn) {
    document.querySelectorAll('.prio-btn').forEach(b => {
      b.className = 'btn btn-sm prio-btn btn-outline';
    });
    const classMap = { high: 'btn-danger', medium: 'btn-accent', low: 'btn-success' };
    btn.className = `btn btn-sm prio-btn ${classMap[prio]}`;
    document.getElementById('tfPriority').value = prio;
  },

  updateHijriPreview() {
    try {
      const el = document.getElementById('hijriPreview');
      if (!el) return;
      const date = document.getElementById('tfDueDate')?.value;
      if (date) {
        const h = toHijri(new Date(date));
        el.textContent = h ? `${h.day} ${h.monthName} ${h.year} هـ` : '';
      } else {
        const now = toHijri(new Date());
        el.textContent = now ? `اليوم: ${now.day} ${now.monthName} ${now.year} هـ` : '';
      }
    } catch (error) {
      console.error('Error updating hijri preview:', error);
    }
  },

  async saveTask(e, id) {
    try {
      e.preventDefault();
      const title = document.getElementById('tfTitle')?.value?.trim();
      if (!title) { showToast('أدخل عنوان المهمة', 'warning'); return; }

      const tagsStr = document.getElementById('tfTags')?.value || '';
      const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
      const project = document.getElementById('tfProject')?.value || null;
      const projectNum = project ? parseInt(project) : null;

      const data = {
        title,
        description: document.getElementById('tfDesc')?.value || '',
        niyyah: document.getElementById('tfNiyyah')?.value || '',
        priority: document.getElementById('tfPriority')?.value || 'medium',
        status: document.getElementById('tfStatus')?.value || 'todo',
        dueDate: document.getElementById('tfDueDate')?.value || null,
        prayerLink: document.getElementById('tfPrayerLink')?.value || null,
        project: projectNum,
        tags,
        hijriDate: null
      };

      if (data.dueDate) {
        const h = toHijri(new Date(data.dueDate));
        if (h) data.hijriDate = h.full;
      }

      if (id) {
        await updateTask(id, data);
        showToast('تم تحديث المهمة', 'success');
      } else {
        data.createdAt = new Date().toISOString();
        data.updatedAt = new Date().toISOString();
        await db.tasks.add(data);
        showToast('تم إضافة المهمة', 'success');
      }

      closeModal();
      await this.renderTaskList();
    } catch (error) {
      console.error('Error saving task:', error);
      showToast('خطأ في الحفظ', 'error');
    }
  },

  async moveToKanban(id) {
    try {
      const task = await getTask(id);
      if (task) {
        await updateTask(id, { status: task.status === 'todo' ? 'inProgress' : 'todo' });
        showToast('تم نقل المهمة للـ Kanban', 'success');
        await this.renderTaskList();
      }
    } catch (error) {
      console.error('Error moving to Kanban:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Selection & Bulk Actions
     ───────────────────────────────────────────────────── */

  toggleSelect(id) {
    if (this.selectedTasks.has(id)) {
      this.selectedTasks.delete(id);
    } else {
      this.selectedTasks.add(id);
    }
    this.updateBulkBar();
    this.updateTaskSelection(id);
  },

  toggleSelectAll() {
    try {
      let tasks = this.getFilteredTasks();
      const allSelected = tasks.length > 0 && tasks.every(t => this.selectedTasks.has(t.id));

      if (allSelected) {
        tasks.forEach(t => this.selectedTasks.delete(t.id));
      } else {
        tasks.forEach(t => this.selectedTasks.add(t.id));
      }

      this.updateBulkBar();
      this.renderTaskList();
    } catch (error) {
      console.error('Error toggling select all:', error);
    }
  },

  async getFilteredTasks() {
    let tasks = await db.tasks.orderBy('createdAt').reverse().toArray();
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    switch (this.currentFilter) {
      case 'today': tasks = tasks.filter(t => t.dueDate === today); break;
      case 'week': tasks = tasks.filter(t => t.dueDate && t.dueDate <= weekEnd); break;
      case 'done': tasks = tasks.filter(t => t.status === 'done'); break;
      case 'overdue': tasks = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done'); break;
    }
    if (this.currentPriority !== 'all') tasks = tasks.filter(t => t.priority === this.currentPriority);
    if (this.currentProject !== 'all') tasks = tasks.filter(t => t.project == this.currentProject);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      tasks = tasks.filter(t => t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.tags?.some(tag => tag.toLowerCase().includes(q)));
    }
    return tasks;
  },

  updateBulkBar() {
    try {
      const bar = document.getElementById('bulkActions');
      const count = document.getElementById('selectedCount');
      if (bar) bar.style.display = this.selectedTasks.size > 0 ? 'block' : 'none';
      if (count) count.textContent = this.selectedTasks.size;
    } catch (error) {
      console.error('Error updating bulk bar:', error);
    }
  },

  updateTaskSelection(id) {
    try {
      const el = document.getElementById(`task-${id}`);
      if (el) el.classList.toggle('task-selected', this.selectedTasks.has(id));
    } catch (error) {
      console.error('Error updating task selection:', error);
    }
  },

  async bulkComplete() {
    try {
      if (this.selectedTasks.size === 0) return;
      for (const id of this.selectedTasks) {
        await updateTask(id, { status: 'done' });
      }
      showToast(`تم إنجاز ${this.selectedTasks.size} مهمة ✓`, 'success');
      this.selectedTasks.clear();
      await this.renderTaskList();
    } catch (error) {
      console.error('Error bulk complete:', error);
    }
  },

  async bulkDelete() {
    try {
      if (this.selectedTasks.size === 0) return;
      if (!confirm(`حذف ${this.selectedTasks.size} مهمة؟`)) return;
      for (const id of this.selectedTasks) {
        await deleteTask(id);
      }
      showToast(`تم حذف ${this.selectedTasks.size} مهمة`, 'success');
      this.selectedTasks.clear();
      await this.renderTaskList();
    } catch (error) {
      console.error('Error bulk delete:', error);
    }
  },

  async bulkPriority(prio) {
    try {
      if (this.selectedTasks.size === 0) return;
      for (const id of this.selectedTasks) {
        await updateTask(id, { priority: prio });
      }
      const labels = { high: 'عالي', medium: 'متوسط', low: 'منخفض' };
      showToast(`تم تغيير أولوية ${this.selectedTasks.size} مهمة إلى ${labels[prio]}`, 'success');
      this.selectedTasks.clear();
      await this.renderTaskList();
    } catch (error) {
      console.error('Error bulk priority:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Confetti Effect
     ───────────────────────────────────────────────────── */

  showConfetti(taskId) {
    try {
      const el = document.getElementById(`task-${taskId}`);
      if (!el) return;

      const colors = ['#d4ac0d', '#148f77', '#1a5276', '#3fb950', '#f4d03f'];
      const rect = el.getBoundingClientRect();

      for (let i = 0; i < 12; i++) {
        const star = document.createElement('div');
        star.textContent = '⭐';
        star.style.cssText = `
          position:fixed;
          left:${rect.left + rect.width / 2}px;
          top:${rect.top + rect.height / 2}px;
          font-size:${12 + Math.random() * 8}px;
          pointer-events:none;
          z-index:9999;
          transition:all ${0.6 + Math.random() * 0.4}s ease-out;
          opacity:1;
        `;
        document.body.appendChild(star);

        requestAnimationFrame(() => {
          star.style.left = `${rect.left + (Math.random() - 0.5) * rect.width * 2}px`;
          star.style.top = `${rect.top - 50 - Math.random() * 80}px`;
          star.style.opacity = '0';
          star.style.transform = `rotate(${Math.random() * 360}deg) scale(0)`;
        });

        setTimeout(() => star.remove(), 1200);
      }
    } catch (error) {
      console.error('Error showing confetti:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Events
     ───────────────────────────────────────────────────── */

  bindEvents() {
    try {
      // Add button
      document.getElementById('taskAddBtn')?.addEventListener('click', () => this.openAddModal());

      // Search
      document.getElementById('taskSearch')?.addEventListener('input', debounce((e) => {
        this.searchQuery = e.target.value;
        this.renderTaskList();
      }, 200));

      // Filter buttons
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentFilter = btn.dataset.filter;
          this.selectedTasks.clear();
          this.renderTaskList();
        });
      });

      // Priority filter
      document.querySelectorAll('.filter-prio').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.filter-prio').forEach(b => {
            b.classList.remove('active');
            b.className = b.className.includes('btn-outline') ? 'btn btn-sm btn-outline filter-prio' : 'btn btn-sm btn-ghost filter-prio';
          });
          btn.classList.add('active');
          this.currentPriority = btn.dataset.prio;
          this.selectedTasks.clear();
          this.renderTaskList();
        });
      });

      // Project filter
      document.getElementById('taskProjectFilter')?.addEventListener('change', (e) => {
        this.currentProject = e.target.value;
        this.selectedTasks.clear();
        this.renderTaskList();
      });

      // Sort
      document.getElementById('taskSortBy')?.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.renderTaskList();
      });

      // Keyboard shortcut: Ctrl+N
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
          e.preventDefault();
          this.openAddModal();
        }
      });
    } catch (error) {
      console.error('Error binding events:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     AI Features
     ───────────────────────────────────────────────────── */

  async aiSortTasks() {
    try {
      if (typeof App === 'undefined') return;

      const btn = document.getElementById('aiSortBtn');
      if (btn) btn.disabled = true;

      showToast('جاري ترتيب المهام بالذكاء الاصطناعي...', 'info');

      const tasks = await db.tasks.toArray();
      const response = await App.sortTasksWithAI(tasks);

      if (btn) btn.disabled = false;

      if (response.success) {
        openModal('🤖 ترتيب المهام المقترح', `
          <div style="white-space:pre-wrap;line-height:1.8;font-size:0.875rem;">${sanitizeHTML(response.message)}</div>
          <div style="margin-top:var(--spacing-md);display:flex;justify-content:flex-end;">
            <button class="btn btn-primary" onclick="closeModal()">تمام</button>
          </div>
        `);
      } else {
        showToast(response.message, 'warning');
      }
    } catch (error) {
      console.error('Error AI sorting tasks:', error);
      showToast('خطأ في ترتيب المهام', 'error');
    }
  },

  async aiBreakDownTask(id) {
    try {
      if (typeof splitTask === 'undefined') return;
      await splitTask(id);
      this.renderTaskList();
    } catch (error) {
      console.error('Error AI breaking down task:', error);
      showToast('خطأ في تقسيم المهمة', 'error');
    }
  },

  async aiSuggestNiyyah() {
    try {
      const titleEl = document.getElementById('taskTitle');
      if (!titleEl) return;

      const title = titleEl.value;
      if (!title) {
        showToast('اكتب عنوان المهمة الأول', 'warning');
        return;
      }

      if (typeof suggestNiyah === 'undefined') return;
      await suggestNiyah(title, 'tfNiyyah');
    } catch (error) {
      console.error('Error suggesting niyyah:', error);
    }
  }
};

if (typeof window !== 'undefined') {
  window.Tasks = Tasks;
}
