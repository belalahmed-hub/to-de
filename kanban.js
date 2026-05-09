'use strict';

/**
 * نظام حياة المسلم — لوحة Kanban (Phase 4)
 * Drag & Drop بدون مكتبات خارجية
 */

const Kanban = {
  draggedTaskId: null,
  viewMode: 'board',
  selectedProject: 'all',
  draggedCard: null,

  columns: [
    { id: 'todo', title: 'للتنفيذ', icon: 'inbox', color: '#58a6ff' },
    { id: 'inProgress', title: 'جاري', icon: 'zap', color: '#d29922' },
    { id: 'review', title: 'مراجعة', icon: 'eye', color: '#a371f7' },
    { id: 'done', title: 'منجز', icon: 'check-circle', color: '#3fb950' }
  ],

  async init() {
    try {
      this.draggedTaskId = null;
      this.viewMode = 'board';
      this.selectedProject = 'all';
      this.render();
      this.bindEvents();
    } catch (error) {
      console.error('Error initializing Kanban:', error);
      showToast('خطأ في تحميل لوحة Kanban', 'error');
    }
  },

  render() {
    try {
      const container = document.getElementById('pageContent');
      if (!container) return;

      container.innerHTML = `
        <div class="page active">
          <!-- Header -->
          <div class="card" style="margin-bottom:var(--spacing-lg);">
            <div class="card-header">
              <h3 class="card-title">
                <i data-lucide="columns"></i>
                لوحة Kanban
              </h3>
              <div style="display:flex;gap:var(--spacing-sm);align-items:center;flex-wrap:wrap;">
                <select id="kanbanProjectFilter" class="form-select" style="width:150px;padding:4px 8px;font-size:0.75rem;">
                  <option value="all">كل المشاريع</option>
                </select>
                <button class="btn btn-sm btn-ghost" onclick="Kanban.addCustomColumn()">
                  <i data-lucide="plus" style="width:14px;height:14px;"></i> عمود جديد
                </button>
                <button class="btn btn-sm btn-outline" onclick="Kanban.syncTasks()">
                  <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> مزامنة
                </button>
                <div style="display:flex;gap:2px;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;">
                  <button class="btn btn-sm view-toggle ${this.viewMode === 'board' ? 'btn-primary' : 'btn-ghost'}" data-view="board" title="Board">
                    <i data-lucide="layout-grid" style="width:14px;height:14px;"></i>
                  </button>
                  <button class="btn btn-sm view-toggle ${this.viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}" data-view="list" title="List">
                    <i data-lucide="list" style="width:14px;height:14px;"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Board -->
          <div class="kanban-board-wrapper">
            ${this.renderBoard()}
          </div>
        </div>
      `;

      this.loadProjectFilter();
      this.bindDragDrop();

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error rendering Kanban:', error);
    }
  },

  renderBoard() {
    try {
      const columns = [...this.columns];
      const customCols = JSON.parse(localStorage.getItem('kanbanCustomCols') || '[]');
      customCols.forEach(c => columns.push(c));

      if (this.viewMode === 'list') {
        return this.renderListMode(columns);
      }

      return `
        <div class="kanban-board" id="kanbanBoard">
          ${columns.map(col => this.renderColumn(col)).join('')}
        </div>
      `;
    } catch (error) {
      console.error('Error rendering board:', error);
      return '<p>خطأ في تحميل اللوحة</p>';
    }
  },

  renderColumn(col) {
    return `
      <div class="kanban-column" data-column="${col.id}" id="col-${col.id}">
        <div class="kanban-header">
          <span class="kanban-title">
            <span class="kanban-dot" style="background:${col.color};"></span>
            <i data-lucide="${col.icon}" style="width:14px;height:14px;"></i>
            ${col.title}
          </span>
          <div style="display:flex;align-items:center;gap:4px;">
            <span class="kanban-count" id="count-${col.id}">0</span>
            <button class="btn btn-ghost btn-sm kanban-add-btn" data-column="${col.id}" title="إضافة مهمة">
              <i data-lucide="plus" style="width:14px;height:14px;"></i>
            </button>
            ${!['todo','inProgress','review','done'].includes(col.id) ? `
              <button class="btn btn-ghost btn-sm kanban-del-col" data-column="${col.id}" title="حذف العمود">
                <i data-lucide="x" style="width:12px;height:12px;color:var(--danger);"></i>
              </button>
            ` : ''}
          </div>
        </div>
        <div class="kanban-cards" id="cards-${col.id}" data-column="${col.id}"></div>
      </div>
    `;
  },

  renderListMode(columns) {
    try {
      return `
        <div class="kanban-list-view">
          ${columns.map(col => `
            <div class="card" style="margin-bottom:var(--spacing-lg);">
              <div class="card-header">
                <h3 class="card-title">
                  <span class="kanban-dot" style="background:${col.color};"></span>
                  <i data-lucide="${col.icon}" style="width:14px;height:14px;"></i>
                  ${col.title}
                  <span class="badge badge-info" id="list-count-${col.id}">0</span>
                </h3>
                <button class="btn btn-sm btn-primary kanban-add-btn" data-column="${col.id}">
                  <i data-lucide="plus" style="width:14px;height:14px;"></i> إضافة
                </button>
              </div>
              <div id="list-cards-${col.id}"></div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (error) {
      console.error('Error rendering list:', error);
      return '';
    }
  },

  async loadCards() {
    try {
      let tasks = await db.tasks.toArray();

      if (this.selectedProject !== 'all') {
        tasks = tasks.filter(t => t.project == this.selectedProject);
      }

      const columns = [...this.columns];
      const customCols = JSON.parse(localStorage.getItem('kanbanCustomCols') || '[]');
      customCols.forEach(c => columns.push(c));

      columns.forEach(col => {
        const colTasks = tasks.filter(t => t.status === col.id);
        const countEl = document.getElementById(this.viewMode === 'list' ? `list-count-${col.id}` : `count-${col.id}`);
        const cardsEl = document.getElementById(this.viewMode === 'list' ? `list-cards-${col.id}` : `cards-${col.id}`);

        if (countEl) countEl.textContent = colTasks.length;
        if (!cardsEl) return;

        if (colTasks.length === 0) {
          cardsEl.innerHTML = `
            <div class="kanban-empty">
              <i data-lucide="inbox" style="width:24px;height:24px;color:var(--border);"></i>
              <p style="font-size:0.75rem;color:var(--text-muted);">مفيش مهام</p>
            </div>
          `;
          return;
        }

        cardsEl.innerHTML = colTasks.map(t => this.renderCard(t, col.color)).join('');
      });

      if (typeof lucide !== 'undefined') lucide.createIcons();
      this.bindDragDrop();
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  },

  renderCard(task, colColor) {
    try {
      const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().split('T')[0] && task.status !== 'done';
      const prayerNames = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
      const prayerName = task.prayerLink ? prayerNames[task.prayerLink] : null;

      return `
        <div class="kanban-card" draggable="true" data-id="${task.id}" id="kcard-${task.id}">
          <div class="kanban-card-grip" title="اسحب للنقل">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/>
              <circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/>
              <circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/>
            </svg>
          </div>
          <div class="kanban-card-body">
            <div class="kanban-card-title">${sanitizeHTML(task.title)}</div>
            ${task.description ? `<p class="kanban-card-desc">${truncate(sanitizeHTML(task.description), 80)}</p>` : ''}
          </div>
          <div class="kanban-card-footer">
            <span class="task-priority ${getPriorityClass(task.priority)}">${getPriorityLabel(task.priority)}</span>
            <div class="kanban-card-meta">
              ${prayerName ? `<span class="kanban-prayer"><i data-lucide="moon" style="width:10px;height:10px;"></i> ${prayerName}</span>` : ''}
              ${task.dueDate ? `<span class="kanban-due ${isOverdue ? 'overdue' : ''}">${formatDateShort(task.dueDate)}</span>` : ''}
            </div>
          </div>
          <div class="kanban-card-actions">
            <button class="kanban-action-btn" onclick="Kanban.editTask(${task.id})" title="تعديل">
              <i data-lucide="pencil" style="width:12px;height:12px;"></i>
            </button>
            <button class="kanban-action-btn" onclick="Kanban.deleteTask(${task.id})" title="حذف">
              <i data-lucide="trash-2" style="width:12px;height:12px;color:var(--danger);"></i>
            </button>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error rendering card:', error);
      return '';
    }
  },

  /* ─────────────────────────────────────────────────────
     Drag & Drop — Native HTML5
     ───────────────────────────────────────────────────── */

  bindDragDrop() {
    try {
      const cards = document.querySelectorAll('.kanban-card[draggable="true"]');
      const zones = document.querySelectorAll('.kanban-cards');

      cards.forEach(card => {
        card.addEventListener('dragstart', (e) => this.handleDragStart(e, card));
        card.addEventListener('dragend', (e) => this.handleDragEnd(e, card));
      });

      zones.forEach(zone => {
        zone.addEventListener('dragover', (e) => this.handleDragOver(e, zone));
        zone.addEventListener('dragleave', (e) => this.handleDragLeave(e, zone));
        zone.addEventListener('drop', (e) => this.handleDrop(e, zone));
      });
    } catch (error) {
      console.error('Error binding drag/drop:', error);
    }
  },

  handleDragStart(e, card) {
    try {
      this.draggedTaskId = parseInt(card.dataset.id);
      this.draggedCard = card;
      card.classList.add('kanban-card-dragging');

      e.dataTransfer.setData('text/plain', this.draggedTaskId);
      e.dataTransfer.effectAllowed = 'move';

      requestAnimationFrame(() => {
        card.style.opacity = '0.5';
      });
    } catch (error) {
      console.error('Error on dragstart:', error);
    }
  },

  handleDragEnd(e, card) {
    try {
      card.style.opacity = '1';
      card.classList.remove('kanban-card-dragging');
      document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('kanban-column-drag-over'));
      document.querySelectorAll('.kanban-cards').forEach(z => z.classList.remove('kanban-zone-drag-over'));
      this.draggedTaskId = null;
      this.draggedCard = null;
    } catch (error) {
      console.error('Error on dragend:', error);
    }
  },

  handleDragOver(e, zone) {
    try {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const column = zone.closest('.kanban-column');
      if (column) {
        document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('kanban-column-drag-over'));
        column.classList.add('kanban-column-drag-over');
      }
      zone.classList.add('kanban-zone-drag-over');

      this.handleDragPosition(e, zone);
    } catch (error) {
      console.error('Error on dragover:', error);
    }
  },

  handleDragLeave(e, zone) {
    try {
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove('kanban-zone-drag-over');
        const column = zone.closest('.kanban-column');
        if (column) column.classList.remove('kanban-column-drag-over');
      }
    } catch (error) {
      console.error('Error on dragleave:', error);
    }
  },

  handleDragPosition(e, zone) {
    try {
      const cards = [...zone.querySelectorAll('.kanban-card:not(.kanban-card-dragging)')];
      const afterElement = cards.find(card => {
        const rect = card.getBoundingClientRect();
        return e.clientY < rect.top + rect.height / 2;
      });

      if (this.draggedCard) {
        if (afterElement) {
          zone.insertBefore(this.draggedCard, afterElement);
        } else {
          zone.appendChild(this.draggedCard);
        }
      }
    } catch (error) {
      console.error('Error on drag position:', error);
    }
  },

  async handleDrop(e, zone) {
    try {
      e.preventDefault();
      const column = zone.closest('.kanban-column');
      const newStatus = zone.dataset.column;
      const taskId = parseInt(e.dataTransfer.getData('text/plain'));

      document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('kanban-column-drag-over'));
      document.querySelectorAll('.kanban-cards').forEach(z => z.classList.remove('kanban-zone-drag-over'));

      if (isNaN(taskId) || !newStatus) return;

      const task = await getTask(taskId);
      if (!task || task.status === newStatus) {
        await this.loadCards();
        return;
      }

      await updateTask(taskId, { status: newStatus });

      if (newStatus === 'done') {
        showToast('🎉 مهمة منجزة!', 'success');
        if (this.draggedCard) {
          this.showDropConfetti(this.draggedCard);
        }
      }

      setTimeout(() => this.loadCards(), 300);
    } catch (error) {
      console.error('Error on drop:', error);
    }
  },

  showDropConfetti(card) {
    try {
      const rect = card.getBoundingClientRect();
      const colors = ['#d4ac0d', '#148f77', '#1a5276', '#3fb950'];

      for (let i = 0; i < 8; i++) {
        const dot = document.createElement('div');
        dot.style.cssText = `
          position:fixed;
          left:${rect.left + rect.width / 2}px;
          top:${rect.top + rect.height / 2}px;
          width:8px;height:8px;
          background:${colors[i % colors.length]};
          border-radius:50%;
          pointer-events:none;
          z-index:9999;
          transition:all ${0.5 + Math.random() * 0.3}s ease-out;
          opacity:1;
        `;
        document.body.appendChild(dot);

        requestAnimationFrame(() => {
          dot.style.left = `${rect.left + (Math.random() - 0.5) * 120}px`;
          dot.style.top = `${rect.top - 30 - Math.random() * 60}px`;
          dot.style.opacity = '0';
        });

        setTimeout(() => dot.remove(), 800);
      }
    } catch (error) {
      console.error('Error showing confetti:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     CRUD
     ───────────────────────────────────────────────────── */

  addTaskInColumn(status) {
    try {
      if (typeof Tasks !== 'undefined') {
        Tasks.openTaskModal({ status });
      } else {
        openModal('مهمة جديدة', `
          <form onsubmit="Kanban.saveQuickTask(event, '${status}')">
            <div class="form-group"><label class="form-label">العنوان *</label><input type="text" id="kqTitle" class="form-input" required></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">الأولوية</label><select id="kqPrio" class="form-select"><option value="low">منخفض</option><option value="medium" selected>متوسط</option><option value="high">عالي</option></select></div>
              <div class="form-group"><label class="form-label">تاريخ التسليم</label><input type="date" id="kqDue" class="form-input"></div>
            </div>
            <div style="display:flex;gap:var(--spacing-sm);justify-content:flex-end;">
              <button type="button" class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
              <button type="submit" class="btn btn-primary">إضافة</button>
            </div>
          </form>
        `);
      }
    } catch (error) {
      console.error('Error adding task in column:', error);
    }
  },

  async saveQuickTask(e, status) {
    try {
      e.preventDefault();
      const title = document.getElementById('kqTitle')?.value;
      if (!title) return;

      const today = new Date().toISOString().split('T')[0];
      await addTask({
        title,
        description: '',
        priority: document.getElementById('kqPrio')?.value || 'medium',
        status,
        dueDate: document.getElementById('kqDue')?.value || today,
        hijriDate: toHijri(new Date())?.full || null,
        prayerLink: null,
        tags: ['Kanban']
      });

      closeModal();
      showToast('تم إضافة المهمة', 'success');
      await this.loadCards();
    } catch (error) {
      console.error('Error saving quick task:', error);
    }
  },

  async editTask(id) {
    try {
      if (typeof Tasks !== 'undefined') {
        await Tasks.editTask(id);
        setTimeout(() => this.loadCards(), 500);
      }
    } catch (error) {
      console.error('Error editing task:', error);
    }
  },

  async deleteTask(id) {
    try {
      if (confirm('حذف المهمة؟')) {
        await deleteTask(id);
        showToast('تم الحذف', 'success');
        await this.loadCards();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  },

  async syncTasks() {
    try {
      showToast('جاري المزامنة...', 'info');
      await this.loadCards();
      showToast('تمت المزامنة', 'success');
    } catch (error) {
      console.error('Error syncing:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Custom Columns
     ───────────────────────────────────────────────────── */

  addCustomColumn() {
    try {
      openModal('عمود جديد', `
        <form onsubmit="Kanban.saveCustomColumn(event)">
          <div class="form-group"><label class="form-label">اسم العمود *</label><input type="text" id="kcName" class="form-input" required placeholder="مثال: مؤجل"></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">اللون</label><input type="color" id="kcColor" class="form-input" value="#8b949e" style="height:40px;padding:4px;"></div>
            <div class="form-group"><label class="form-label">الأيقونة</label>
              <select id="kcIcon" class="form-select">
                <option value="archive">أرشيف</option><option value="clock">وقت</option>
                <option value="alert-circle">تنبيه</option><option value="folder">مجلد</option>
                <option value="target">هدف</option><option value="lightbulb">فكرة</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:var(--spacing-sm);justify-content:flex-end;">
            <button type="button" class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
            <button type="submit" class="btn btn-primary">إضافة</button>
          </div>
        </form>
      `);
    } catch (error) {
      console.error('Error opening custom column modal:', error);
    }
  },

  async saveCustomColumn(e) {
    try {
      e.preventDefault();
      const name = document.getElementById('kcName')?.value;
      if (!name) return;

      const id = 'custom_' + Date.now();
      const color = document.getElementById('kcColor')?.value || '#8b949e';
      const icon = document.getElementById('kcIcon')?.value || 'folder';

      const customCols = JSON.parse(localStorage.getItem('kanbanCustomCols') || '[]');
      customCols.push({ id, title: name, icon, color });
      localStorage.setItem('kanbanCustomCols', JSON.stringify(customCols));

      closeModal();
      showToast('تم إضافة العمود', 'success');
      this.render();
      await this.loadCards();
    } catch (error) {
      console.error('Error saving custom column:', error);
    }
  },

  deleteCustomColumn(colId) {
    try {
      if (!confirm('حذف العمود؟')) return;

      let customCols = JSON.parse(localStorage.getItem('kanbanCustomCols') || '[]');
      customCols = customCols.filter(c => c.id !== colId);
      localStorage.setItem('kanbanCustomCols', JSON.stringify(customCols));

      showToast('تم حذف العمود', 'success');
      this.render();
      this.loadCards();
    } catch (error) {
      console.error('Error deleting custom column:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Project Filter
     ───────────────────────────────────────────────────── */

  async loadProjectFilter() {
    try {
      const select = document.getElementById('kanbanProjectFilter');
      if (!select) return;

      const projects = await getAllProjects();
      projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
      });
    } catch (error) {
      console.error('Error loading project filter:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Events
     ───────────────────────────────────────────────────── */

  bindEvents() {
    try {
      document.getElementById('kanbanProjectFilter')?.addEventListener('change', (e) => {
        this.selectedProject = e.target.value;
        this.loadCards();
      });

      document.querySelectorAll('.view-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          this.viewMode = btn.dataset.view;
          this.render();
          this.loadCards();
        });
      });

      document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.kanban-add-btn');
        if (addBtn) {
          this.addTaskInColumn(addBtn.dataset.column);
          return;
        }

        const delBtn = e.target.closest('.kanban-del-col');
        if (delBtn) {
          this.deleteCustomColumn(delBtn.dataset.column);
        }
      });
    } catch (error) {
      console.error('Error binding events:', error);
    }
  }
};

if (typeof window !== 'undefined') {
  window.Kanban = Kanban;
}
