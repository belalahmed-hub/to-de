'use strict';

/**
 * نظام حياة المسلم - دوال مشتركة
 */

function formatDate(date, locale = 'ar-EG') {
  try {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return date;
  }
}

function formatDateShort(date, locale = 'ar-EG') {
  try {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting short date:', error);
    return date;
  }
}

function formatTime(date) {
  try {
    const d = new Date(date);
    return d.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
}

function toHijri(date) {
  try {
    const d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime())) return null;

    const months = [
      'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
      'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
      'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
    ];

    const jd = gregorianToJulian(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const hijri = julianToHijri(jd);

    return {
      day: hijri.day,
      month: hijri.month,
      monthName: months[hijri.month - 1] || '',
      year: hijri.year,
      full: `${hijri.day} ${months[hijri.month - 1] || ''} ${hijri.year} هـ`
    };
  } catch (error) {
    console.error('Error converting to Hijri:', error);
    return null;
  }
}

function gregorianToJulian(year, month, day) {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

function julianToHijri(jd) {
  jd = Math.floor(jd) + 0.5;
  const epoch = 1948439.5;
  const days = jd - epoch;
  const cycles = Math.floor(days / 10631);
  const remainder = days % 10631;
  const year = 30 * cycles + Math.floor((remainder - 1) / 354.366) + 1;
  const dayOfYear = Math.floor(remainder - Math.floor((year - 1) / 30) * 11);

  let month = 1;
  let dayInMonth = dayOfYear;
  const monthDays = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];

  for (let i = 0; i < 12; i++) {
    if (dayInMonth <= monthDays[i]) {
      month = i + 1;
      break;
    }
    dayInMonth -= monthDays[i];
  }

  return { day: Math.ceil(dayInMonth), month, year };
}

function formatRelativeTime(date) {
  try {
    if (!date) return '';
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    const arabicUnits = (value, singular, plural, pluralOf2) => {
      if (value === 1) return singular;
      if (value === 2) return pluralOf2;
      if (value >= 3 && value <= 10) return `${value} ${plural}`;
      return `${value} ${plural}`;
    };

    if (seconds < 60) return 'الآن';
    if (minutes < 60) return arabicUnits(minutes, 'دقيقة', 'دقائق', 'دقيقتان') + ' مضت';
    if (hours < 24) return arabicUnits(hours, 'ساعة', 'ساعات', 'ساعتان') + ' مضت';
    if (days < 7) return arabicUnits(days, 'يوم', 'أيام', 'يومان') + ' مضت';
    if (weeks < 4) return arabicUnits(weeks, 'أسبوع', 'أسابيع', 'أسبوعان') + ' مضى';
    if (months < 12) return arabicUnits(months, 'شهر', 'أشهر', 'شهران') + ' مضى';
    return arabicUnits(years, 'سنة', 'سنوات', 'سنتان') + ' مضت';
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return date;
  }
}

function showToast(message, type = 'info', duration = 3000) {
  try {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i data-lucide="${getToastIcon(type)}" class="toast-icon"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  } catch (error) {
    console.error('Error showing toast:', error);
  }
}

function getToastIcon(type) {
  const icons = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    info: 'info'
  };
  return icons[type] || icons.info;
}

function openModal(title, content) {
  try {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');

    if (overlay && titleEl && bodyEl) {
      titleEl.textContent = title;
      bodyEl.innerHTML = content;
      overlay.classList.add('active');
    }
  } catch (error) {
    console.error('Error opening modal:', error);
  }
}

function closeModal() {
  try {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  } catch (error) {
    console.error('Error closing modal:', error);
  }
}

function getPriorityColor(priority) {
  const colors = {
    high: '#f85149',
    medium: '#d29922',
    low: '#3fb950'
  };
  return colors[priority] || colors.medium;
}

function getPriorityClass(priority) {
  const classes = {
    high: 'priority-high',
    medium: 'priority-medium',
    low: 'priority-low'
  };
  return classes[priority] || classes.medium;
}

function getPriorityLabel(priority) {
  const labels = {
    high: 'عالي',
    medium: 'متوسط',
    low: 'منخفض'
  };
  return labels[priority] || 'متوسط';
}

function getStatusLabel(status) {
  const labels = {
    todo: 'للقيام',
    inProgress: 'قيد التنفيذ',
    done: 'مكتمل',
    archived: 'مؤرشف'
  };
  return labels[status] || status;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function sanitizeHTML(str) {
  try {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  } catch (error) {
    console.error('Error sanitizing HTML:', error);
    return '';
  }
}

function escapeHtml(text) {
  return sanitizeHTML(text);
}

function debounce(fn, delay = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      fn(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, delay);
  };
}

function throttle(func, limit = 500) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

function truncate(str, length = 100) {
  try {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
  } catch (error) {
    console.error('Error truncating string:', error);
    return str;
  }
}

function isToday(date) {
  try {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  } catch (error) {
    console.error('Error checking if today:', error);
    return false;
  }
}

function isThisWeek(date) {
  try {
    const d = new Date(date);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return d >= now && d <= weekFromNow;
  } catch (error) {
    console.error('Error checking if this week:', error);
    return false;
  }
}

function isOverdue(date) {
  try {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  } catch (error) {
    console.error('Error checking if overdue:', error);
    return false;
  }
}

function calculateProgress(completed, total) {
  try {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  } catch (error) {
    console.error('Error calculating progress:', error);
    return 0;
  }
}

function groupBy(array, key) {
  try {
    return array.reduce((result, item) => {
      const group = item[key];
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {});
  } catch (error) {
    console.error('Error grouping by:', error);
    return {};
  }
}

function sortByDate(array, dateKey = 'date', order = 'desc') {
  try {
    return [...array].sort((a, b) => {
      const dateA = new Date(a[dateKey]);
      const dateB = new Date(b[dateKey]);
      return order === 'desc' ? dateB - dateA : dateA - dateB;
    });
  } catch (error) {
    console.error('Error sorting by date:', error);
    return array;
  }
}

function filterBySearch(array, searchTerm, fields) {
  try {
    if (!searchTerm) return array;
    const term = searchTerm.toLowerCase();
    return array.filter(item => {
      return fields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(term);
      });
    });
  } catch (error) {
    console.error('Error filtering by search:', error);
    return array;
  }
}

function copyToClipboard(text) {
  try {
    navigator.clipboard.writeText(text).then(() => {
      showToast('تم النسخ بنجاح', 'success');
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('تم النسخ بنجاح', 'success');
    });
  } catch (error) {
    console.error('Error copying to clipboard:', error);
  }
}

function downloadJSON(data, filename = 'export.json') {
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('تم التحميل بنجاح', 'success');
  } catch (error) {
    console.error('Error downloading JSON:', error);
    showToast('خطأ في التحميل', 'error');
  }
}

function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    } catch (error) {
      reject(error);
    }
  });
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function getDateObject(date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    dayOfWeek: date.getDay()
  };
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getWeekDays() {
  return ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
}

function getArabicMonth(monthIndex) {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return months[monthIndex] || '';
}

function capitalizeFirst(str) {
  try {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  } catch (error) {
    console.error('Error capitalizing:', error);
    return str;
  }
}

function getAvatarColor(name) {
  const colors = [
    '#1a5276', '#148f77', '#d4ac0d', '#8e44ad',
    '#e74c3c', '#2ecc71', '#3498db', '#e67e22',
    '#1abc9c', '#9b59b6', '#f39c12', '#c0392b'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name) {
  try {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0);
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  } catch (error) {
    console.error('Error getting initials:', error);
    return '?';
  }
}

/* ═══════════════════════════════════════════════
   Command Palette
   ═══════════════════════════════════════════════ */

const COMMANDS = [
  { id:'new-task',       icon:'✅', label:'مهمة جديدة',        action: () => { closeCommandPalette(); if (typeof Tasks !== 'undefined') Tasks.openTaskModal(); } },
  { id:'new-habit',      icon:'🌱', label:'عادة جديدة',         action: () => { closeCommandPalette(); if (typeof Habits !== 'undefined') Habits.openModal(); } },
  { id:'new-note',       icon:'📝', label:'ملاحظة جديدة',       action: () => { closeCommandPalette(); if (typeof Notes !== 'undefined') Notes.add(); } },
  { id:'dashboard',      icon:'🏠', label:'الصفحة الرئيسية',    action: () => { closeCommandPalette(); App.navigate('dashboard'); } },
  { id:'kanban',         icon:'📋', label:'Kanban',             action: () => { closeCommandPalette(); App.navigate('kanban'); } },
  { id:'calendar',       icon:'📅', label:'التقويم',            action: () => { closeCommandPalette(); App.navigate('calendar'); } },
  { id:'ai',             icon:'🤖', label:'المساعد الذكي',      action: () => { closeCommandPalette(); App.navigate('ai'); } },
  { id:'analytics',      icon:'📈', label:'التحليلات',          action: () => { closeCommandPalette(); App.navigate('analytics'); } },
  { id:'focus',          icon:'🎯', label:'وضع التركيز',        action: () => { closeCommandPalette(); App.navigate('tasks'); setTimeout(() => Focus.init(), 500); } },
  { id:'export',         icon:'📤', label:'تصدير البيانات',     action: () => { closeCommandPalette(); App.exportData(); } },
  { id:'search-tasks',   icon:'🔍', label:'بحث في المهام...',   action: () => { closeCommandPalette(); App.navigate('tasks'); setTimeout(() => document.getElementById('taskSearch')?.focus(), 300); } },
  { id:'settings',       icon:'⚙️', label:'الإعدادات',          action: () => { closeCommandPalette(); App.navigate('settings'); } },
  { id:'notes',          icon:'📝', label:'الملاحظات',          action: () => { closeCommandPalette(); App.navigate('notes'); } },
  { id:'prayer',         icon:'🕌', label:'أوقات الصلاة',       action: () => { closeCommandPalette(); App.navigate('prayer'); } },
  { id:'team',           icon:'👥', label:'الفريق',             action: () => { closeCommandPalette(); App.navigate('team'); } },
  { id:'habits',         icon:'🌙', label:'العادات',            action: () => { closeCommandPalette(); App.navigate('habits'); } },
  { id:'shortcuts',      icon:'⌨️', label:'الاختصارات',         action: () => { closeCommandPalette(); App.showShortcutsHelp(); } },
];

let commandPaletteEl = null;
let commandSelectedIndex = -1;

function openCommandPalette() {
  if (commandPaletteEl) return;
  commandPaletteEl = document.createElement('div');
  commandPaletteEl.className = 'command-palette-overlay';
  commandPaletteEl.innerHTML = `
    <div class="command-palette">
      <div class="command-palette-input-wrapper">
        <i data-lucide="search" style="width:18px;height:18px;color:var(--text-muted);flex-shrink:0;"></i>
        <input type="text" id="commandPaletteInput" class="command-palette-input" placeholder="ابحث عن أمر..." autofocus>
      </div>
      <div class="command-palette-commands" id="commandPaletteCommands">
        ${renderCommands(COMMANDS, '')}
      </div>
      <div class="command-palette-footer">
        <span>↑↓ للتنقل · Enter للتنفيذ · Esc للإغلاق</span>
      </div>
    </div>
  `;
  document.body.appendChild(commandPaletteEl);
  setTimeout(() => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    const input = document.getElementById('commandPaletteInput');
    if (input) input.focus();
  }, 50);

  const input = commandPaletteEl.querySelector('#commandPaletteInput');
  if (input) {
    input.addEventListener('input', debounce(function() {
      const query = this.value;
      const container = document.getElementById('commandPaletteCommands');
      if (container) {
        container.innerHTML = renderCommands(COMMANDS, query);
      }
      commandSelectedIndex = -1;
    }, 150));
    input.addEventListener('keydown', (e) => {
      const items = commandPaletteEl.querySelectorAll('.command-palette-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        commandSelectedIndex = Math.min(commandSelectedIndex + 1, items.length - 1);
        updateSelected(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        commandSelectedIndex = Math.max(commandSelectedIndex - 1, 0);
        updateSelected(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeCommand(commandSelectedIndex);
      } else if (e.key === 'Escape') {
        closeCommandPalette();
      }
    });
  }

  commandPaletteEl.addEventListener('click', (e) => {
    const item = e.target.closest('.command-palette-item');
    if (item) {
      const idx = parseInt(item.dataset.index);
      executeCommand(idx);
    } else if (e.target === commandPaletteEl) {
      closeCommandPalette();
    }
  });
}

function executeCommand(idx) {
  const container = document.getElementById('commandPaletteCommands');
  if (!container) return;
  const items = container.querySelectorAll('.command-palette-item');
  const item = items[idx];
  if (!item) return;
  const cmdId = item.dataset.id;
  const cmd = COMMANDS.find(c => c.id === cmdId);
  if (cmd) cmd.action();
}

function renderCommands(commands, query) {
  const filtered = query
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;
  if (filtered.length === 0) {
    return '<div class="command-palette-empty">لا توجد نتائج</div>';
  }
  return filtered.map((cmd, i) => `
    <div class="command-palette-item" data-index="${i}" data-id="${cmd.id}">
      <span class="command-palette-item-icon">${cmd.icon}</span>
      <span class="command-palette-item-label">${cmd.label}</span>
    </div>
  `).join('');
}

function updateSelected(items) {
  items.forEach((item, i) => {
    item.classList.toggle('selected', i === commandSelectedIndex);
  });
  if (commandSelectedIndex >= 0 && items[commandSelectedIndex]) {
    items[commandSelectedIndex].scrollIntoView({ block: 'nearest' });
  }
}

function closeCommandPalette() {
  if (commandPaletteEl) {
    commandPaletteEl.remove();
    commandPaletteEl = null;
  }
  commandSelectedIndex = -1;
}

if (typeof window !== 'undefined') {
  window.formatDate = formatDate;
  window.formatDateShort = formatDateShort;
  window.formatTime = formatTime;
  window.toHijri = toHijri;
  window.formatRelativeTime = formatRelativeTime;
  window.showToast = showToast;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.getPriorityColor = getPriorityColor;
  window.getPriorityClass = getPriorityClass;
  window.getPriorityLabel = getPriorityLabel;
  window.getStatusLabel = getStatusLabel;
  window.generateId = generateId;
  window.sanitizeHTML = sanitizeHTML;
  window.escapeHtml = escapeHtml;
  window.debounce = debounce;
  window.throttle = throttle;
  window.truncate = truncate;
  window.isToday = isToday;
  window.isThisWeek = isThisWeek;
  window.isOverdue = isOverdue;
  window.calculateProgress = calculateProgress;
  window.groupBy = groupBy;
  window.sortByDate = sortByDate;
  window.filterBySearch = filterBySearch;
  window.copyToClipboard = copyToClipboard;
  window.downloadJSON = downloadJSON;
  window.readJSONFile = readJSONFile;
  window.getDaysInMonth = getDaysInMonth;
  window.getFirstDayOfMonth = getFirstDayOfMonth;
  window.getDateObject = getDateObject;
  window.addDays = addDays;
  window.getWeekDays = getWeekDays;
  window.getArabicMonth = getArabicMonth;
  window.capitalizeFirst = capitalizeFirst;
  window.getAvatarColor = getAvatarColor;
  window.getInitials = getInitials;
  window.openCommandPalette = openCommandPalette;
  window.closeCommandPalette = closeCommandPalette;
}
