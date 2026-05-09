'use strict';

/**
 * نظام حياة المسلم — إدارة الفريق (Phase 8)
 * Team Members, Workload, Activity Log, Shared Projects
 */

const Team = {
  viewMode: 'grid',
  selectedMemberId: null,
  selectedProjectId: null,

  avatarColors: [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
    '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
  ],

  roles: [
    { value: 'مدير', label: 'مدير 👑' },
    { value: 'مطوّر', label: 'مطوّر 💻' },
    { value: 'مصمم', label: 'مصمم 🎨' },
    { value: 'محلل', label: 'محلل 📊' },
    { value: 'إداري', label: 'إداري 📋' },
    { value: 'عضو', label: 'عضو 👤' }
  ],

  async init() {
    try {
      this.viewMode = 'grid';
      this.selectedMemberId = null;
      this.selectedProjectId = null;
      this.render();
      this.load();
      this.bindEvents();
    } catch (error) {
      console.error('Error initializing Team:', error);
      showToast('خطأ في تحميل صفحة الفريق', 'error');
    }
  },

  render() {
    try {
      const container = document.getElementById('pageContent');
      if (!container) return;

      container.innerHTML = `
        <div class="page active">
          <!-- Tabs -->
          <div class="team-tabs" style="margin-bottom:var(--spacing-lg);">
            <button class="btn btn-sm team-tab active" data-tab="members">
              <i data-lucide="users" style="width:14px;height:14px;"></i> الأعضاء
            </button>
            <button class="btn btn-sm team-tab" data-tab="workload">
              <i data-lucide="bar-chart-2" style="width:14px;height:14px;"></i> توزيع العمل
            </button>
            <button class="btn btn-sm team-tab" data-tab="projects">
              <i data-lucide="folder-kanban" style="width:14px;height:14px;"></i> المشاريع
            </button>
            <button class="btn btn-sm team-tab" data-tab="activity">
              <i data-lucide="activity" style="width:14px;height:14px;"></i> النشاط
            </button>
          </div>

          <!-- Members Section -->
          <div class="team-section active" id="teamMembersSection">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--spacing-lg);flex-wrap:wrap;gap:var(--spacing-sm);">
              <h3 style="margin:0;font-size:1.125rem;">
                <i data-lucide="users" style="width:16px;height:16px;display:inline;vertical-align:middle;"></i>
                فريقي
                <span class="badge badge-accent" id="memberCount">0</span>
              </h3>
              <div style="display:flex;gap:var(--spacing-sm);align-items:center;">
                <div style="display:flex;gap:2px;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;">
                  <button class="btn btn-sm view-toggle-btn active" data-view="grid" title="Grid">
                    <i data-lucide="grid-3x3" style="width:14px;height:14px;"></i>
                  </button>
                  <button class="btn btn-sm view-toggle-btn" data-view="list" title="List">
                    <i data-lucide="list" style="width:14px;height:14px;"></i>
                  </button>
                </div>
                <button class="btn btn-primary btn-sm" onclick="Team.openMemberModal()">
                  <i data-lucide="user-plus" style="width:14px;height:14px;"></i> إضافة عضو
                </button>
              </div>
            </div>
            <div id="membersList"></div>
          </div>

          <!-- Workload Section -->
          <div class="team-section" id="teamWorkloadSection">
            <h3 style="margin-bottom:var(--spacing-lg);font-size:1.125rem;">
              <i data-lucide="bar-chart-2" style="width:16px;height:16px;display:inline;vertical-align:middle;"></i>
              توزيع أعباء العمل
            </h3>
            <div class="grid grid-2" style="margin-bottom:var(--spacing-xl);">
              <div class="chart-container">
                <canvas id="workloadChart"></canvas>
              </div>
              <div id="workloadSummary"></div>
            </div>
          </div>

          <!-- Projects Section -->
          <div class="team-section" id="teamProjectsSection">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--spacing-lg);flex-wrap:wrap;gap:var(--spacing-sm);">
              <h3 style="margin:0;font-size:1.125rem;">
                <i data-lucide="folder-kanban" style="width:16px;height:16px;display:inline;vertical-align:middle;"></i>
                المشاريع المشتركة
              </h3>
              <button class="btn btn-primary btn-sm" onclick="Team.openProjectModal()">
                <i data-lucide="plus" style="width:14px;height:14px;"></i> مشروع جديد
              </button>
            </div>
            <div id="projectsList"></div>
          </div>

          <!-- Activity Section -->
          <div class="team-section" id="teamActivitySection">
            <h3 style="margin-bottom:var(--spacing-lg);font-size:1.125rem;">
              <i data-lucide="activity" style="width:16px;height:16px;display:inline;vertical-align:middle;"></i>
              سجل النشاط
            </h3>
            <div id="activityList"></div>
          </div>
        </div>
      `;

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error rendering Team:', error);
    }
  },

  async load() {
    try {
      await this.loadMembers();
      this.loadWorkload();
      this.loadProjects();
      this.loadActivity();
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  },

  async loadMembers() {
    try {
      const members = await getAllTeamMembers();
      const countEl = document.getElementById('memberCount');
      if (countEl) countEl.textContent = members.length;

      const container = document.getElementById('membersList');
      if (!container) return;

      if (members.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i data-lucide="users" class="empty-state-icon"></i>
            <p>لم يتم إضافة أعضاء بعد</p>
            <button class="btn btn-primary" onclick="Team.openMemberModal()" style="margin-top:var(--spacing-md);">
              <i data-lucide="user-plus" style="width:14px;height:14px;"></i> أضف أول عضو
            </button>
          </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
      }

      const tasks = await db.tasks.toArray();

      if (this.viewMode === 'grid') {
        container.innerHTML = `
          <div class="team-grid">
            ${members.map(m => {
              const memberTasks = tasks.filter(t => t.assignee === m.id);
              const doneTasks = memberTasks.filter(t => t.status === 'done');
              const total = memberTasks.length;
              const pct = total > 0 ? Math.round((doneTasks.length / total) * 100) : 0;

              return `
                <div class="team-card" onclick="Team.showMemberDetail(${m.id})">
                  <div class="team-card-header">
                    <div class="team-avatar" style="background:${m.color || '#3498db'};">
                      ${this.getInitials(m.name)}
                    </div>
                    <div class="team-card-info">
                      <h4 class="team-card-name">${sanitizeHTML(m.name)}</h4>
                      <span class="team-card-role">${m.role || 'عضو'}</span>
                    </div>
                  </div>
                  ${m.email ? `<p class="team-card-email">${sanitizeHTML(m.email)}</p>` : ''}
                  <div class="team-card-stats">
                    <span class="team-stat">${total} مهمة</span>
                    <span class="team-stat">${doneTasks.length} منجزة</span>
                  </div>
                  <div class="progress-bar" style="margin-top:var(--spacing-sm);">
                    <div class="progress-fill" style="width:${pct}%;background:${pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'};"></div>
                  </div>
                  <div class="team-card-actions">
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Team.openMemberModal(${m.id})">
                      <i data-lucide="pencil" style="width:12px;height:12px;"></i>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Team.logActivity(${m.id},'view')">
                      <i data-lucide="eye" style="width:12px;height:12px;"></i>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Team.deleteMember(${m.id})">
                      <i data-lucide="trash-2" style="width:12px;height:12px;color:var(--danger);"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="team-list">
            ${members.map(m => {
              const memberTasks = tasks.filter(t => t.assignee === m.id);
              const doneTasks = memberTasks.filter(t => t.status === 'done');

              return `
                <div class="team-list-item" onclick="Team.showMemberDetail(${m.id})">
                  <div class="team-avatar" style="background:${m.color || '#3498db'};width:40px;height:40px;font-size:0.875rem;">
                    ${this.getInitials(m.name)}
                  </div>
                  <div style="flex:1;min-width:0;">
                    <strong>${sanitizeHTML(m.name)}</strong>
                    <span class="team-card-role" style="margin-right:var(--spacing-xs);">${m.role || 'عضو'}</span>
                    ${m.email ? `<br><small style="color:var(--text-muted);">${sanitizeHTML(m.email)}</small>` : ''}
                  </div>
                  <div style="display:flex;gap:var(--spacing-sm);align-items:center;">
                    <span class="badge badge-info">${memberTasks.length} مهمة</span>
                    <span class="badge badge-success">${doneTasks.length} منجزة</span>
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Team.openMemberModal(${m.id})">
                      <i data-lucide="pencil" style="width:12px;height:12px;"></i>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Team.deleteMember(${m.id})">
                      <i data-lucide="trash-2" style="width:12px;height:12px;color:var(--danger);"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error loading members:', error);
    }
  },

  async loadWorkload() {
    try {
      const members = await getAllTeamMembers();
      const tasks = await db.tasks.toArray();

      const summary = document.getElementById('workloadSummary');
      const chartCanvas = document.getElementById('workloadChart');

      if (!summary || !chartCanvas) return;

      const data = members.map(m => {
        const memberTasks = tasks.filter(t => t.assignee === m.id);
        const pending = memberTasks.filter(t => t.status !== 'done').length;
        return {
          name: m.name,
          color: m.color || '#3498db',
          total: memberTasks.length,
          pending,
          done: memberTasks.filter(t => t.status === 'done').length
        };
      });

      let summaryHtml = '<div style="display:flex;flex-direction:column;gap:var(--spacing-sm);">';
      data.forEach(d => {
        const level = d.total < 5 ? 'منخفض' : d.total <= 8 ? 'متوسط' : 'مرتفع ⚠️';
        const color = d.total < 5 ? 'var(--success)' : d.total <= 8 ? 'var(--warning)' : 'var(--danger)';

        summaryHtml += `
          <div style="display:flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-sm);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);">
            <div style="width:32px;height:32px;border-radius:50%;background:${d.color};display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:600;color:#fff;flex-shrink:0;">
              ${this.getInitials(d.name)}
            </div>
            <div style="flex:1;min-width:0;">
              <strong style="font-size:0.875rem;">${sanitizeHTML(d.name)}</strong>
              <div style="display:flex;gap:var(--spacing-sm);font-size:0.75rem;color:var(--text-muted);">
                <span>${d.total} مهمة</span>
                <span>${d.pending} معلقة</span>
              </div>
            </div>
            <span style="font-size:0.6875rem;color:${color};font-weight:500;">${level}</span>
          </div>
        `;
      });
      summaryHtml += '</div>';
      summary.innerHTML = summaryHtml;

      if (data.length === 0) {
        summary.innerHTML = '<div class="empty-state"><i data-lucide="bar-chart-2" class="empty-state-icon"></i><p>أضف أعضاء أولاً لرؤية توزيع العمل</p></div>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }

      this.renderWorkloadChart(data);
    } catch (error) {
      console.error('Error loading workload:', error);
    }
  },

  renderWorkloadChart(data) {
    try {
      const ctx = document.getElementById('workloadChart');
      if (!ctx || data.length === 0) return;

      if (Team._workloadChart) {
        Team._workloadChart.destroy();
      }

      Team._workloadChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: data.map(d => d.name),
          datasets: [
            {
              label: 'مهام منجزة',
              data: data.map(d => d.done),
              backgroundColor: '#3fb950',
              borderRadius: 4
            },
            {
              label: 'مهام معلقة',
              data: data.map(d => d.pending),
              backgroundColor: '#d29922',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          indexAxis: 'y',
          plugins: {
            legend: {
              position: 'top',
              labels: { color: '#8b949e', usePointStyle: true }
            },
            annotation: {
              annotations: {
                limitLine: {
                  type: 'line',
                  xMin: 10,
                  xMax: 10,
                  borderColor: '#f85149',
                  borderWidth: 2,
                  borderDash: [5, 5],
                  label: { content: 'الحد الأقصى: 10', display: true, color: '#f85149' }
                }
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { stepSize: 1, color: '#8b949e' },
              grid: { color: 'rgba(48, 54, 61, 0.5)' }
            },
            y: {
              ticks: { color: '#8b949e' },
              grid: { display: false }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error rendering workload chart:', error);
    }
  },

  async loadProjects() {
    try {
      const projects = await getAllProjects();
      const members = await getAllTeamMembers();
      const tasks = await db.tasks.toArray();

      const container = document.getElementById('projectsList');
      if (!container) return;

      if (projects.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i data-lucide="folder-kanban" class="empty-state-icon"></i>
            <p>مفيش مشاريع لسه</p>
          </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
      }

      container.innerHTML = `
        <div class="team-projects-grid">
          ${projects.map(p => {
            const projTasks = tasks.filter(t => t.project === p.id || t.tags?.includes(p.name));
            const doneTasks = projTasks.filter(t => t.status === 'done');
            const pct = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0;
            const remaining = projTasks.length - doneTasks.length;

            const projectMembers = p.members || [];
            const avatars = projectMembers.slice(0, 4).map(mid => {
              const m = members.find(mem => mem.id === mid);
              return m ? `<div class="project-avatar" style="background:${m.color};margin-left:-4px;">${this.getInitials(m.name)}</div>` : '';
            }).join('');

            return `
              <div class="project-card" style="border-top:3px solid ${p.color || '#1a5276'};">
                <div class="project-card-header">
                  <div>
                    <h4 class="project-card-name">${sanitizeHTML(p.name)}</h4>
                    ${p.description ? `<p class="project-card-desc">${truncate(sanitizeHTML(p.description), 80)}</p>` : ''}
                  </div>
                  <div class="project-avatars">${avatars}</div>
                </div>
                <div class="progress-bar" style="margin:var(--spacing-md) 0;">
                  <div class="progress-fill" style="width:${pct}%;background:${p.color || '#1a5276'};"></div>
                </div>
                <div class="project-card-stats">
                  <span class="project-stat">${projTasks.length} مهمة</span>
                  <span class="project-stat">${remaining} متبقية</span>
                  <span class="project-stat">${pct}%</span>
                  ${p.dueDate ? `<span class="project-stat">📅 ${formatDateShort(p.dueDate)}</span>` : ''}
                </div>
                <div class="project-card-actions">
                  <button class="btn btn-ghost btn-sm" onclick="Team.openProjectModal(${p.id})">
                    <i data-lucide="pencil" style="width:12px;height:12px;"></i>
                  </button>
                  <button class="btn btn-ghost btn-sm" onclick="Team.openKanbanForProject(${p.id}, '${sanitizeHTML(p.name)}')">
                    <i data-lucide="columns" style="width:12px;height:12px;"></i> Kanban
                  </button>
                  <button class="btn btn-ghost btn-sm" onclick="Team.deleteProject(${p.id})">
                    <i data-lucide="trash-2" style="width:12px;height:12px;color:var(--danger);"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  },

  async loadActivity() {
    try {
      const activities = await db.activityLog
        .orderBy('timestamp')
        .reverse()
        .limit(50)
        .toArray();

      const container = document.getElementById('activityList');
      if (!container) return;

      if (activities.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i data-lucide="activity" class="empty-state-icon"></i>
            <p>مفيش نشاط لسه</p>
          </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
      }

      const members = await getAllTeamMembers();

      container.innerHTML = `
        <div class="activity-feed">
          ${activities.map(a => {
            const member = members.find(m => m.id === a.memberId);
            const timeAgo = this.getTimeAgo(a.timestamp);

            return `
              <div class="activity-item">
                <div class="activity-icon" style="background:${member?.color || '#8b949e'};">
                  ${member ? this.getInitials(member.name) : '?'}
                </div>
                <div class="activity-content">
                  <p class="activity-text">
                    ${member ? `<strong>${sanitizeHTML(member.name)}</strong>` : 'مستخدم محذوف'}
                    ${this.getActionText(a)}
                  </p>
                  <span class="activity-time">${timeAgo}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  },

  getActionText(activity) {
    const texts = {
      'add-task': `أضاف مهمة جديدة: "${activity.taskTitle || ''}"`,
      'complete-task': `أنجز مهمة: "${activity.taskTitle || ''}"`,
      'view': 'عرض الملف الشخصي',
      'add-member': 'تمت إضافته للفريق',
      'add-project': `أضاف مشروع: "${activity.taskTitle || ''}"`
    };
    return texts[activity.action] || activity.action;
  },

  getTimeAgo(timestamp) {
    try {
      const now = new Date();
      const then = new Date(timestamp);
      const seconds = Math.floor((now - then) / 1000);

      if (seconds < 60) return 'الآن';
      if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
      if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
      if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
      return formatDateShort(timestamp);
    } catch {
      return '';
    }
  },

  getInitials(name) {
    try {
      if (!name) return '?';
      const parts = name.trim().split(' ').filter(Boolean);
      if (parts.length === 1) return parts[0].charAt(0);
      return (parts[0].charAt(0) + parts[1].charAt(0));
    } catch {
      return '?';
    }
  },

  /* ─────────────────────────────────────────────────────
     Member CRUD
     ───────────────────────────────────────────────────── */

  openMemberModal(memberId = null) {
    try {
      const member = memberId ? null : null;
      const isEdit = memberId !== null;

      let memberData = null;
      if (isEdit) {
        getTeamMember(memberId).then(m => {
          if (m) this._fillMemberModal(m);
        });
      }

      openModal(isEdit ? 'تعديل عضو' : 'إضافة عضو', `
        <form onsubmit="Team.saveMember(event, ${memberId})" id="memberForm">
          <div class="form-group">
            <label class="form-label">الاسم *</label>
            <input type="text" id="tfMemberName" class="form-input" required placeholder="الاسم الكامل" ${isEdit ? '' : 'autofocus'}>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">الدور</label>
              <select id="tfMemberRole" class="form-select">
                ${this.roles.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">البريد الإلكتروني</label>
              <input type="email" id="tfMemberEmail" class="form-input" placeholder="email@example.com">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">رقم الهاتف</label>
              <input type="tel" id="tfMemberPhone" class="form-input" placeholder="+20 123 456 7890">
            </div>
            <div class="form-group">
              <label class="form-label">لون الـ Avatar</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
                ${this.avatarColors.map(c => `<div class="color-swatch ${isEdit && memberData?.color === c ? 'selected' : ''}" data-color="${c}" style="background:${c};width:28px;height:28px;border-radius:50%;cursor:pointer;border:2px solid transparent;" onclick="Team.selectAvatarColor(this, '${c}')"></div>`).join('')}
              </div>
              <input type="hidden" id="tfMemberColor" value="${memberData?.color || '#3498db'}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">ملاحظات</label>
            <textarea id="tfMemberNotes" class="form-textarea" placeholder="أي ملاحظات إضافية..." style="min-height:60px;"></textarea>
          </div>
          <div style="display:flex;gap:var(--spacing-sm);justify-content:flex-end;">
            <button type="button" class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'إضافة'}</button>
          </div>
        </form>
      `);

      setTimeout(() => {
        if (isEdit && memberId) {
          getTeamMember(memberId).then(m => {
            if (m) this._fillMemberModal(m);
          });
        }
      }, 100);
    } catch (error) {
      console.error('Error opening member modal:', error);
    }
  },

  _fillMemberModal(m) {
    try {
      const nameEl = document.getElementById('tfMemberName');
      const roleEl = document.getElementById('tfMemberRole');
      const emailEl = document.getElementById('tfMemberEmail');
      const phoneEl = document.getElementById('tfMemberPhone');
      const colorEl = document.getElementById('tfMemberColor');
      const notesEl = document.getElementById('tfMemberNotes');

      if (nameEl) nameEl.value = m.name || '';
      if (roleEl) roleEl.value = m.role || 'عضو';
      if (emailEl) emailEl.value = m.email || '';
      if (phoneEl) phoneEl.value = m.phone || '';
      if (colorEl) colorEl.value = m.color || '#3498db';
      if (notesEl) notesEl.value = m.notes || '';

      document.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.toggle('selected', s.dataset.color === m.color);
      });
    } catch (error) {
      console.error('Error filling member modal:', error);
    }
  },

  selectAvatarColor(el, color) {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    const colorInput = document.getElementById('tfMemberColor');
    if (colorInput) colorInput.value = color;
  },

  async saveMember(e, memberId) {
    try {
      e.preventDefault();

      const name = document.getElementById('tfMemberName')?.value;
      if (!name) return;

      const data = {
        name,
        role: document.getElementById('tfMemberRole')?.value || 'عضو',
        email: document.getElementById('tfMemberEmail')?.value || '',
        phone: document.getElementById('tfMemberPhone')?.value || '',
        color: document.getElementById('tfMemberColor')?.value || '#3498db',
        notes: document.getElementById('tfMemberNotes')?.value || ''
      };

      if (memberId) {
        await updateTeamMember(memberId, data);
        showToast('تم تحديث العضو', 'success');
      } else {
        data.createdAt = new Date().toISOString();
        const id = await addTeamMember(data);
        await this.logActivity(id, 'add-member');
        showToast('تم إضافة العضو', 'success');
      }

      closeModal();
      this.loadMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      showToast('خطأ في حفظ العضو', 'error');
    }
  },

  async deleteMember(id) {
    try {
      if (!confirm('حذف هذا العضو؟ سيتم إلغاء تعيين المهام له.')) return;

      const tasks = await db.tasks.where('assignee').equals(id).toArray();
      for (const t of tasks) {
        await updateTask(t.id, { assignee: null });
      }

      await deleteTeamMember(id);
      showToast('تم حذف العضو', 'success');
      this.loadMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      showToast('خطأ في حذف العضو', 'error');
    }
  },

  async showMemberDetail(id) {
    try {
      const member = await getTeamMember(id);
      if (!member) return;

      const tasks = await db.tasks.where('assignee').equals(id).toArray();
      const pending = tasks.filter(t => t.status !== 'done').sort((a, b) => {
        const prioOrder = { high: 0, medium: 1, low: 2 };
        return (prioOrder[a.priority] || 1) - (prioOrder[b.priority] || 1);
      });
      const done = tasks.filter(t => t.status === 'done');

      openModal(`${this.getInitials(member.name)} ${member.name}`, `
        <div style="text-align:center;margin-bottom:var(--spacing-lg);">
          <div class="team-avatar" style="background:${member.color || '#3498db'};width:64px;height:64px;font-size:1.5rem;margin:0 auto var(--spacing-sm);">
            ${this.getInitials(member.name)}
          </div>
          <h4 style="margin:0;">${sanitizeHTML(member.name)}</h4>
          <span class="team-card-role">${member.role || 'عضو'}</span>
        </div>

        <div class="grid grid-3" style="margin-bottom:var(--spacing-lg);">
          <div class="stat-card accent" style="padding:var(--spacing-sm);">
            <div class="stat-value" style="font-size:1.25rem;">${tasks.length}</div>
            <div class="stat-label">إجمالي</div>
          </div>
          <div class="stat-card success" style="padding:var(--spacing-sm);">
            <div class="stat-value" style="font-size:1.25rem;">${done.length}</div>
            <div class="stat-label">منجزة</div>
          </div>
          <div class="stat-card warning" style="padding:var(--spacing-sm);">
            <div class="stat-value" style="font-size:1.25rem;">${pending.length}</div>
            <div class="stat-label">معلقة</div>
          </div>
        </div>

        ${pending.length > 0 ? `
          <h4 style="margin-bottom:var(--spacing-sm);font-size:0.875rem;">المهام المعلقة</h4>
          <div style="max-height:200px;overflow-y:auto;">
            ${pending.map(t => `
              <div style="padding:var(--spacing-xs) var(--spacing-sm);background:var(--surface-2);border-radius:var(--radius-sm);margin-bottom:var(--spacing-xs);display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:0.8125rem;">${sanitizeHTML(t.title)}</span>
                <span class="task-priority ${getPriorityClass(t.priority)}" style="font-size:0.625rem;">${getPriorityLabel(t.priority)}</span>
              </div>
            `).join('')}
          </div>
        ` : '<p style="color:var(--text-muted);font-size:0.8125rem;">مفيش مهام معلقة 🎉</p>'}
      `);
    } catch (error) {
      console.error('Error showing member detail:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Project CRUD
     ───────────────────────────────────────────────────── */

  async openProjectModal(projectId = null) {
    try {
      const isEdit = projectId !== null;
      let project = null;

      if (isEdit) {
        project = await getProject(projectId);
      }

      const members = await getAllTeamMembers();
      const memberOptions = members.map(m =>
        `<label style="display:flex;align-items:center;gap:var(--spacing-xs);padding:var(--spacing-xs);cursor:pointer;">
          <input type="checkbox" class="project-member-check" value="${m.id}" ${project?.members?.includes(m.id) ? 'checked' : ''}>
          <div style="width:24px;height:24px;border-radius:50%;background:${m.color};display:flex;align-items:center;justify-content:center;font-size:0.625rem;color:#fff;flex-shrink:0;">
            ${this.getInitials(m.name)}
          </div>
          <span style="font-size:0.8125rem;">${sanitizeHTML(m.name)}</span>
        </label>`
      ).join('');

      openModal(isEdit ? 'تعديل المشروع' : 'مشروع جديد', `
        <form onsubmit="Team.saveProject(event, ${projectId})">
          <div class="form-group">
            <label class="form-label">اسم المشروع *</label>
            <input type="text" id="tfProjName" class="form-input" required value="${project?.name || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">الوصف</label>
            <textarea id="tfProjDesc" class="form-textarea" style="min-height:60px;">${project?.description || ''}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">اللون</label>
              <input type="color" id="tfProjColor" class="form-input" value="${project?.color || '#1a5276'}" style="height:40px;padding:4px;">
            </div>
            <div class="form-group">
              <label class="form-label">تاريخ الانتهاء</label>
              <input type="date" id="tfProjDue" class="form-input" value="${project?.dueDate || ''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">الأعضاء المشاركين</label>
            <div style="max-height:150px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--spacing-sm);">
              ${memberOptions || '<p style="color:var(--text-muted);font-size:0.8125rem;">مفيش أعضاء — أضف أعضاء أولاً من تبويب الأعضاء</p>'}
            </div>
          </div>
          <div style="display:flex;gap:var(--spacing-sm);justify-content:flex-end;">
            <button type="button" class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'إنشاء'}</button>
          </div>
        </form>
      `);
    } catch (error) {
      console.error('Error opening project modal:', error);
    }
  },

  async saveProject(e, projectId) {
    try {
      e.preventDefault();

      const name = document.getElementById('tfProjName')?.value;
      if (!name) return;

      const selectedMembers = [];
      document.querySelectorAll('.project-member-check:checked').forEach(cb => {
        selectedMembers.push(parseInt(cb.value));
      });

      const data = {
        name,
        description: document.getElementById('tfProjDesc')?.value || '',
        color: document.getElementById('tfProjColor')?.value || '#1a5276',
        dueDate: document.getElementById('tfProjDue')?.value || null,
        members: selectedMembers
      };

      if (projectId) {
        await updateProject(projectId, data);
        showToast('تم تحديث المشروع', 'success');
      } else {
        data.createdAt = new Date().toISOString();
        const id = await addProject(data);
        const activeMember = selectedMembers[0] || null;
        if (activeMember) {
          await this.logActivity(activeMember, 'add-project', null, name);
        }
        showToast('تم إنشاء المشروع', 'success');
      }

      closeModal();
      this.loadProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      showToast('خطأ في حفظ المشروع', 'error');
    }
  },

  async deleteProject(id) {
    try {
      if (!confirm('حذف هذا المشروع؟')) return;

      await deleteProject(id);
      showToast('تم حذف المشروع', 'success');
      this.loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      showToast('خطأ في حذف المشروع', 'error');
    }
  },

  openKanbanForProject(projectId, projectName) {
    try {
      if (typeof Kanban !== 'undefined') {
        document.querySelector('[data-page="kanban"]')?.click();
        setTimeout(() => {
          Kanban.selectedProject = projectId;
          Kanban.loadCards();
        }, 200);
      }
    } catch (error) {
      console.error('Error opening Kanban for project:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Activity Logging
     ───────────────────────────────────────────────────── */

  async logActivity(memberId, action, taskId = null, taskTitle = null) {
    try {
      // TODO: SYNC_POINT — هنا هيتضاف WebSocket connection لإرسال النشاط للسيرفر
      await db.activityLog.add({
        memberId,
        action,
        taskId: taskId || null,
        taskTitle: taskTitle || null,
        timestamp: new Date().toISOString()
      });

      // Clean old activity logs (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      await db.activityLog.where('timestamp').below(thirtyDaysAgo.toISOString()).delete();
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Events
     ───────────────────────────────────────────────────── */

  bindEvents() {
    try {
      document.querySelectorAll('.team-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.team-tab').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.team-section').forEach(s => s.classList.remove('active'));
          btn.classList.add('active');

          const tab = btn.dataset.tab;
          const sectionMap = {
            members: 'teamMembersSection',
            workload: 'teamWorkloadSection',
            projects: 'teamProjectsSection',
            activity: 'teamActivitySection'
          };
          const section = document.getElementById(sectionMap[tab]);
          if (section) section.classList.add('active');
        });
      });

      document.querySelectorAll('.view-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.viewMode = btn.dataset.view;
          this.loadMembers();
        });
      });
    } catch (error) {
      console.error('Error binding team events:', error);
    }
  }
};

if (typeof window !== 'undefined') {
  window.Team = Team;
}
