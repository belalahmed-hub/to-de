'use strict';

const Notes = {
  notes: [],
  searchQuery: '',
  editingId: null,

  async init() {
    this.notes = await getAllNotes();
    this.render();
    this.bindEvents();
  },

  render() {
    const container = document.getElementById('pageContent');
    if (!container) return;
    container.innerHTML = `
      <div class="page active">
        <div class="notes-header">
          <h2 class="notes-title"><i data-lucide="sticky-note"></i> الملاحظات</h2>
          <div class="notes-actions">
            <div class="notes-search">
              <i data-lucide="search" style="width:16px;height:16px;position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);"></i>
              <input type="text" id="notesSearch" class="form-input notes-search-input" placeholder="بحث في الملاحظات...">
            </div>
            <button class="btn btn-primary" onclick="Notes.add()"><i data-lucide="plus"></i> إضافة</button>
          </div>
        </div>

        <!-- Quick Note Widget -->
        <div class="quick-note-card">
          <textarea id="quickNoteInput" class="quick-note-input" placeholder="اكتب فكرة سريعة..." maxlength="500"></textarea>
          <div class="quick-note-footer">
            <span class="quick-note-hint">Enter للحفظ · Shift+Enter للسطر الجديد</span>
            <button class="btn btn-sm btn-primary" onclick="Notes.saveQuickNote()">حفظ</button>
          </div>
        </div>

        <div class="notes-grid" id="notesGrid">
          ${this.renderNotes()}
        </div>
      </div>
    `;
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 0);
  },

  renderNotes() {
    const filtered = this.searchQuery
      ? this.notes.filter(n =>
          n.title?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          n.content?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          n.tags?.some(t => t.toLowerCase().includes(this.searchQuery.toLowerCase()))
        )
      : this.notes;
    if (filtered.length === 0) {
      return '<div class="empty-state"><i data-lucide="sticky-note" class="empty-state-icon"></i><p>لا توجد ملاحظات</p><button class="btn btn-primary" onclick="Notes.add()">أضف ملاحظة</button></div>';
    }
    return filtered.map(n => `
      <div class="note-card" style="${n.color ? `background:${n.color};border-color:${n.color};` : ''}" onclick="Notes.edit(${n.id})">
        <div class="note-card-header">
          <h3 class="note-card-title">${sanitizeHTML(n.title || 'بدون عنوان')}</h3>
          <button class="note-card-delete" onclick="event.stopPropagation();Notes.delete(${n.id})">
            <i data-lucide="x" style="width:14px;height:14px;"></i>
          </button>
        </div>
        <p class="note-card-content">${sanitizeHTML(truncate(n.content, 150))}</p>
        ${n.tags?.length ? `<div class="note-card-tags">${n.tags.map(t => `<span class="badge badge-info">${sanitizeHTML(t)}</span>`).join('')}</div>` : ''}
        <div class="note-card-footer">
          <span class="note-card-date">${formatRelativeTime(n.updatedAt || n.createdAt)}</span>
          <div class="note-colors">
            ${['#161b22','#1a5276','#148f77','#d4ac0d','#8e44ad','#e74c3c'].map(c =>
              `<span class="note-color-dot ${n.color === c ? 'selected' : ''}" style="background:${c};" onclick="event.stopPropagation();Notes.setColor(${n.id},'${c}')"></span>`
            ).join('')}
          </div>
        </div>
      </div>
    `).join('');
  },

  bindEvents() {
    setTimeout(() => {
      const searchEl = document.getElementById('notesSearch');
      if (searchEl) {
        searchEl.addEventListener('input', debounce((e) => {
          this.searchQuery = e.target.value;
          const grid = document.getElementById('notesGrid');
          if (grid) grid.innerHTML = this.renderNotes();
          setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 0);
        }, 300));
      }
      const quickInput = document.getElementById('quickNoteInput');
      if (quickInput) {
        quickInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.saveQuickNote();
          }
        });
      }
    }, 50);
  },

  async add() {
    openModal('ملاحظة جديدة', `
      <form onsubmit="Notes.save(event, null)">
        <div class="form-group">
          <label class="form-label">العنوان</label>
          <input type="text" id="noteEditTitle" class="form-input" autofocus>
        </div>
        <div class="form-group">
          <label class="form-label">المحتوى</label>
          <textarea id="noteEditContent" class="form-textarea" style="min-height:150px;"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">الوسوم (مفصولة بفواصل)</label>
          <input type="text" id="noteEditTags" class="form-input" placeholder="دين, تعلم">
        </div>
        <div class="form-group">
          <label class="form-label">اللون</label>
          <div class="note-color-picker">
            ${['#161b22','#1a5276','#148f77','#d4ac0d','#8e44ad','#e74c3c'].map(c =>
              `<span class="note-color-dot selected" style="background:${c};" onclick="document.querySelectorAll('.note-color-picker .note-color-dot').forEach(d=>d.classList.remove('selected'));this.classList.add('selected');window._noteColor='${c}';"></span>`
            ).join('')}
          </div>
        </div>
        <div style="display:flex;gap:var(--spacing-sm);justify-content:flex-end;margin-top:var(--spacing-md);">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
          <button type="submit" class="btn btn-primary">حفظ</button>
        </div>
      </form>
    `);
    window._noteColor = '#161b22';
    setTimeout(() => document.getElementById('noteEditTitle')?.focus(), 100);
  },

  async save(e, id) {
    e.preventDefault();
    const title = document.getElementById('noteEditTitle')?.value?.trim() || 'بدون عنوان';
    const content = document.getElementById('noteEditContent')?.value || '';
    const tagsStr = document.getElementById('noteEditTags')?.value || '';
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
    const color = window._noteColor || '#161b22';
    if (id) {
      await updateNote(id, { title, content, tags, color });
    } else {
      await addNote({ title, content, tags, color });
    }
    closeModal();
    showToast(id ? 'تم التحديث' : 'تم الإضافة', 'success');
    this.notes = await getAllNotes();
    const grid = document.getElementById('notesGrid');
    if (grid) grid.innerHTML = this.renderNotes();
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 0);
  },

  async edit(id) {
    const note = await getNote(id);
    if (!note) return;
    openModal('تعديل الملاحظة', `
      <form onsubmit="Notes.save(event, ${id})">
        <div class="form-group">
          <label class="form-label">العنوان</label>
          <input type="text" id="noteEditTitle" class="form-input" value="${sanitizeHTML(note.title)}" autofocus>
        </div>
        <div class="form-group">
          <label class="form-label">المحتوى</label>
          <textarea id="noteEditContent" class="form-textarea" style="min-height:150px;">${sanitizeHTML(note.content)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">الوسوم</label>
          <input type="text" id="noteEditTags" class="form-input" value="${(note.tags||[]).join(', ')}">
        </div>
        <div class="form-group">
          <label class="form-label">اللون</label>
          <div class="note-color-picker">
            ${['#161b22','#1a5276','#148f77','#d4ac0d','#8e44ad','#e74c3c'].map(c =>
              `<span class="note-color-dot ${note.color === c ? 'selected' : ''}" style="background:${c};" onclick="document.querySelectorAll('.note-color-picker .note-color-dot').forEach(d=>d.classList.remove('selected'));this.classList.add('selected');window._noteColor='${c}';"></span>`
            ).join('')}
          </div>
        </div>
        <div style="display:flex;gap:var(--spacing-sm);justify-content:flex-end;margin-top:var(--spacing-md);">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
          <button type="submit" class="btn btn-primary">تحديث</button>
        </div>
      </form>
    `);
    window._noteColor = note.color || '#161b22';
    setTimeout(() => document.getElementById('noteEditTitle')?.focus(), 100);
  },

  async setColor(id, color) {
    await updateNote(id, { color });
    this.notes = await getAllNotes();
    const grid = document.getElementById('notesGrid');
    if (grid) grid.innerHTML = this.renderNotes();
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 0);
  },

  async delete(id) {
    if (confirm('حذف الملاحظة؟')) {
      await deleteNote(id);
      showToast('تم الحذف', 'success');
      this.notes = await getAllNotes();
      const grid = document.getElementById('notesGrid');
      if (grid) grid.innerHTML = this.renderNotes();
      setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 0);
    }
  },

  async saveQuickNote() {
    const input = document.getElementById('quickNoteInput');
    if (!input || !input.value.trim()) return;
    const content = input.value.trim();
    await addNote({ title: 'فكرة سريعة', content, color: '#d4ac0d' });
    input.value = '';
    showToast('تم حفظ الملاحظة', 'success');
    this.notes = await getAllNotes();
    const grid = document.getElementById('notesGrid');
    if (grid) grid.innerHTML = this.renderNotes();
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 0);
  }
};

window.Notes = Notes;
