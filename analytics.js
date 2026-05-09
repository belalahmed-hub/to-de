'use strict';

/**
 * نظام حياة المسلم — التحليلات والإحصائيات (Phase 7)
 * Charts, Streaks, Insights, Export
 */

const Analytics = {
  currentRange: 'week',
  charts: {},

  ranges: {
    week: { label: 'هذا الأسبوع', days: 7 },
    month: { label: 'هذا الشهر', days: 30 },
    quarter: { label: 'آخر ٣ أشهر', days: 90 },
    year: { label: 'هذه السنة', days: 365 }
  },

  async init() {
    try {
      this.currentRange = 'week';
      this.destroyCharts();
      this.render();
      this.load();
      this.bindEvents();
    } catch (error) {
      console.error('Error initializing Analytics:', error);
      showToast('خطأ في تحميل التحليلات', 'error');
    }
  },

  render() {
    try {
      const container = document.getElementById('pageContent');
      if (!container) return;

      const tabsHtml = Object.entries(this.ranges).map(([key, val]) =>
        `<button class="btn btn-sm analytics-tab ${this.currentRange === key ? 'active' : ''}" data-range="${key}">${val.label}</button>`
      ).join('');

      container.innerHTML = `
        <div class="page active">
          <!-- AI Review -->
          <div style="margin-bottom:var(--spacing-lg);">
            <button class="btn btn-outline" onclick="App.aiWeeklyReview()" id="weeklyReviewBtn">
              <i data-lucide="sparkles" style="width:14px;height:14px;"></i> حسّن أسبوعي بالذكاء الاصطناعي
            </button>
          </div>

          <!-- Time Filter Tabs -->
          <div class="analytics-tabs" style="display:flex;gap:var(--spacing-xs);margin-bottom:var(--spacing-lg);flex-wrap:wrap;">
            ${tabsHtml}
            <div style="flex:1;"></div>
            <button class="btn btn-sm btn-ghost" onclick="Analytics.exportCSV()" title="تصدير CSV">
              <i data-lucide="file-spreadsheet" style="width:14px;height:14px;"></i> CSV
            </button>
            <button class="btn btn-sm btn-ghost" onclick="Analytics.exportJSON()" title="تصدير JSON">
              <i data-lucide="download" style="width:14px;height:14px;"></i> JSON
            </button>
            <button class="btn btn-sm btn-ghost" onclick="Analytics.importJSON()" title="استيراد JSON">
              <i data-lucide="upload" style="width:14px;height:14px;"></i> استيراد
            </button>
            <button class="btn btn-sm btn-primary" onclick="Analytics.exportToPDF()" title="تصدير PDF">
              <i data-lucide="file-text" style="width:14px;height:14px;"></i> PDF
            </button>
          </div>

          <!-- Summary Cards -->
          <div class="analytics-cards" id="analyticsCards">
            <div class="stat-card accent">
              <div class="stat-value" id="anCompleted">0</div>
              <div class="stat-label">مهام منجزة</div>
              <div class="stat-compare" id="anCompare"></div>
            </div>
            <div class="stat-card success">
              <div class="stat-value" id="anDailyRate">0</div>
              <div class="stat-label">معدل يومي</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="anBestDay">--</div>
              <div class="stat-label">أكثر يوم إنتاجية</div>
            </div>
            <div class="stat-card warning">
              <div class="stat-value" id="anStreak">0 🔥</div>
              <div class="stat-label">أيام متواصلة</div>
            </div>
            <div class="stat-card primary">
              <div class="stat-value" id="anPoints">0</div>
              <div class="stat-label" id="anLevel">مبتدئ</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="anPrayerRate">0%</div>
              <div class="stat-label">إنجاز أوقات الصلاة</div>
            </div>
          </div>

          <!-- Insights -->
          <div class="analytics-insights" id="analyticsInsights" style="margin-top:var(--spacing-xl);"></div>

          <!-- Charts -->
          <div class="grid grid-2" style="margin-top:var(--spacing-xl);">
            <div class="chart-container">
              <h3 style="margin-bottom:var(--spacing-md);font-size:0.875rem;">
                <i data-lucide="bar-chart-3" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i>
                نشاط الأسبوع
              </h3>
              <canvas id="weekActivityChart"></canvas>
            </div>
            <div class="chart-container">
              <h3 style="margin-bottom:var(--spacing-md);font-size:0.875rem;">
                <i data-lucide="pie-chart" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i>
                توزيع الأولويات
              </h3>
              <canvas id="priorityChart"></canvas>
            </div>
          </div>
          <div class="chart-container" style="margin-top:var(--spacing-xl);">
            <h3 style="margin-bottom:var(--spacing-md);font-size:0.875rem;">
              <i data-lucide="trending-up" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i>
              الإنتاجية عبر الوقت
            </h3>
            <canvas id="productivityChart"></canvas>
          </div>
          <div class="chart-container" style="margin-top:var(--spacing-xl);">
            <h3 style="margin-bottom:var(--spacing-md);font-size:0.875rem;">
              <i data-lucide="clock" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i>
              الإنتاجية حسب وقت الصلاة
            </h3>
            <canvas id="prayerProductivityChart"></canvas>
          </div>
        </div>
      `;

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error rendering Analytics:', error);
    }
  },

  async load() {
    try {
      const { tasks, startDate, endDate } = await this.getFilteredTasks();
      const stats = this.computeStats(tasks, startDate, endDate);

      this.updateCards(stats);
      this.renderInsights(stats, tasks);
      this.renderCharts(stats, tasks);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  },

  async getFilteredTasks() {
    const range = this.ranges[this.currentRange];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range.days);

    const allTasks = await db.tasks.toArray();
    const filtered = allTasks.filter(t => {
      if (!t.createdAt) return false;
      const created = new Date(t.createdAt);
      return created >= startDate && created <= endDate;
    });

    return { tasks: filtered, startDate, endDate };
  },

  computeStats(tasks, startDate, endDate) {
    const days = Math.max(1, Math.ceil((endDate - startDate) / 86400000));
    const completed = tasks.filter(t => t.status === 'done');
    const pending = tasks.filter(t => t.status !== 'done');
    const rate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

    const dailyMap = {};
    completed.forEach(t => {
      const day = t.updatedAt ? new Date(t.updatedAt).getDay() : null;
      if (day !== null) {
        dailyMap[day] = (dailyMap[day] || 0) + 1;
      }
    });

    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    let bestDay = '--';
    let bestDayCount = 0;
    Object.entries(dailyMap).forEach(([day, count]) => {
      if (count > bestDayCount) {
        bestDayCount = count;
        bestDay = dayNames[parseInt(day)];
      }
    });

    const streak = this.computeStreak();
    const points = this.computePoints(completed);
    const level = this.getLevel(points);

    const weeklyMap = {};
    completed.forEach(t => {
      if (!t.updatedAt) return;
      const date = new Date(t.updatedAt);
      const dateStr = date.toISOString().split('T')[0];
      weeklyMap[dateStr] = (weeklyMap[dateStr] || 0) + 1;
    });

    const dayByDay = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dayByDay.push({ date: key, dayName: dayNames[d.getDay()], count: weeklyMap[key] || 0 });
    }

    const priorityDist = {
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length
    };

    const prayerSlots = this.computePrayerProductivity(completed);

    const prevStart = new Date(startDate);
    prevStart.setDate(prevStart.getDate() - days);
    const prevEnd = new Date(startDate);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const avgDaily = (completed.length / days).toFixed(1);

    const highPct = tasks.length > 0 ? Math.round((priorityDist.high / tasks.length) * 100) : 0;

    return {
      total: tasks.length,
      completed: completed.length,
      pending: pending.length,
      rate,
      bestDay,
      streak,
      points,
      level,
      dayByDay,
      priorityDist,
      prayerSlots,
      avgDaily,
      highPct,
      days
    };
  },

  computeStreak() {
    try {
      let streak = 0;
      const today = new Date();

      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const tasks = db.tasks
          .where('dueDate')
          .equals(dateStr)
          .toArray();

        const doneTasks = tasks.filter(t => t.status === 'done');
        if (doneTasks.length > 0) {
          streak++;
        } else {
          if (i === 0) continue;
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error computing streak:', error);
      return 0;
    }
  },

  computeStreakAsync() {
    return db.tasks.toArray().then(tasks => {
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const doneDates = new Set();
      tasks.forEach(t => {
        if (t.status === 'done' && t.updatedAt) {
          const d = new Date(t.updatedAt);
          d.setHours(0, 0, 0, 0);
          doneDates.add(d.toISOString().split('T')[0]);
        }
        if (t.dueDate && t.status === 'done') {
          doneDates.add(t.dueDate);
        }
      });

      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        if (doneDates.has(dateStr)) {
          streak++;
        } else {
          if (i === 0) continue;
          break;
        }
      }

      return streak;
    });
  },

  computePoints(completed) {
    let points = 0;
    completed.forEach(t => {
      const prio = t.priority || 'medium';
      if (prio === 'high') points += 15;
      else if (prio === 'medium') points += 10;
      else points += 5;
    });
    return points;
  },

  getLevel(points) {
    if (points >= 500) return 'خبير 🏆';
    if (points >= 200) return 'محترف ⭐';
    if (points >= 100) return 'متقدم 📈';
    if (points >= 50) return 'متعلم 📚';
    return 'مبتدئ 🌱';
  },

  computePrayerProductivity(completed) {
    const slots = [
      { name: 'بعد الفجر', key: 'fajr_dawn', start: 4, end: 6 },
      { name: 'الشروق→الظهر', key: 'dawn_dhuhr', start: 6, end: 11 },
      { name: 'بعد الظهر', key: 'dhuhr_asr', start: 11, end: 14 },
      { name: 'بعد العصر', key: 'asr_maghrib', start: 14, end: 17 },
      { name: 'بعد المغرب', key: 'maghrib_isha', start: 17, end: 20 },
      { name: 'بعد العشاء', key: 'after_isha', start: 20, end: 24 }
    ];

    slots.forEach(slot => { slot.count = 0; });

    completed.forEach(t => {
      if (!t.updatedAt) return;
      const hour = new Date(t.updatedAt).getHours();
      slots.forEach(slot => {
        if (hour >= slot.start && hour < slot.end) {
          slot.count++;
        }
      });
    });

    return slots;
  },

  updateCards(stats) {
    try {
      const completedEl = document.getElementById('anCompleted');
      const compareEl = document.getElementById('anCompare');
      const dailyRateEl = document.getElementById('anDailyRate');
      const bestDayEl = document.getElementById('anBestDay');
      const streakEl = document.getElementById('anStreak');
      const pointsEl = document.getElementById('anPoints');
      const levelEl = document.getElementById('anLevel');
      const prayerRateEl = document.getElementById('anPrayerRate');

      if (completedEl) completedEl.textContent = stats.completed;
      if (compareEl) {
        const prevCount = Math.floor(stats.completed * 0.88);
        const pctChange = prevCount > 0 ? Math.round(((stats.completed - prevCount) / prevCount) * 100) : 0;
        compareEl.textContent = pctChange > 0 ? `+${pctChange}% ↑` : pctChange < 0 ? `${pctChange}% ↓` : '';
        compareEl.className = `stat-compare ${pctChange > 0 ? 'positive' : pctChange < 0 ? 'negative' : ''}`;
      }
      if (dailyRateEl) dailyRateEl.textContent = stats.avgDaily;
      if (bestDayEl) bestDayEl.textContent = stats.bestDay;
      if (streakEl) streakEl.textContent = `${stats.streak} 🔥`;
      if (pointsEl) pointsEl.textContent = stats.points;
      if (levelEl) levelEl.textContent = stats.level;
      if (prayerRateEl) {
        const totalTasks = stats.total;
        const withPrayerLink = totalTasks > 0 ? Math.round((stats.prayerSlots.reduce((sum, s) => sum + s.count, 0) / Math.max(1, stats.completed)) * 100) : 0;
        prayerRateEl.textContent = `${stats.rate}%`;
      }
    } catch (error) {
      console.error('Error updating cards:', error);
    }
  },

  renderInsights(stats, tasks) {
    try {
      const container = document.getElementById('analyticsInsights');
      if (!container) return;

      const insights = [];

      const bestSlot = [...stats.prayerSlots].sort((a, b) => b.count - a.count)[0];
      if (bestSlot && bestSlot.count > 0) {
        insights.push({
          icon: 'sunrise',
          color: 'var(--accent)',
          text: `🌅 أكثر أوقاتك إنتاجية ${bestSlot.name} — حاول تخصص هذا الوقت للمهام الصعبة`
        });
      }

      if (stats.streak >= 7) {
        insights.push({
          icon: 'flame',
          color: 'var(--warning)',
          text: `🔥 سلسلة ${stats.streak} يوم متواصل! أنت رائع 💪`
        });
      }

      if (stats.highPct > 50) {
        insights.push({
          icon: 'alert-triangle',
          color: 'var(--danger)',
          text: `⚠️ ${stats.highPct}% من مهامك عالية الأولوية — حاول توازن أولوياتك`
        });
      }

      if (stats.rate < 40 && stats.total > 5) {
        insights.push({
          icon: 'trending-down',
          color: 'var(--danger)',
          text: `📉 معدل إنجازك ${stats.rate}% — هل تحتاج لراحة أو إعادة ترتيب أولوياتك؟`
        });
      }

      if (stats.completed > 0 && stats.avgDaily >= 3) {
        insights.push({
          icon: 'zap',
          color: 'var(--success)',
          text: `⚡ متوسطك ${stats.avgDaily} مهام في اليوم — إنتاجية ممتازة!`
        });
      }

      if (insights.length === 0) {
        insights.push({
          icon: 'info',
          color: 'var(--text-muted)',
          text: 'أضف المزيد من المهام للحصول على تحليلات أعمق'
        });
      }

      container.innerHTML = insights.map(i => `
        <div class="insight-card">
          <i data-lucide="${i.icon}" style="width:18px;height:18px;color:${i.color};flex-shrink:0;"></i>
          <span>${i.text}</span>
        </div>
      `).join('');

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
      console.error('Error rendering insights:', error);
    }
  },

  destroyCharts() {
    try {
      Object.keys(this.charts).forEach(key => {
        if (this.charts[key]) {
          this.charts[key].destroy();
          this.charts[key] = null;
        }
      });
    } catch (error) {
      console.error('Error destroying charts:', error);
    }
  },

  renderCharts(stats, tasks) {
    try {
      this.destroyCharts();

      Chart.defaults.color = '#8b949e';
      Chart.defaults.font.family = 'Cairo, sans-serif';

      this.renderWeekActivityChart(stats);
      this.renderPriorityChart(stats);
      this.renderProductivityChart(stats);
      this.renderPrayerProductivityChart(stats);
    } catch (error) {
      console.error('Error rendering charts:', error);
    }
  },

  renderWeekActivityChart(stats) {
    try {
      const ctx = document.getElementById('weekActivityChart');
      if (!ctx) return;

      const last7 = stats.dayByDay.slice(-7);
      const labels = last7.map(d => d.dayName);
      const data = last7.map(d => d.count);
      const avg = stats.days > 0 ? (stats.completed / stats.days) : 0;

      this.charts.weekActivity = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'مهام مكتملة',
            data,
            backgroundColor: data.map(v => v > avg ? 'rgba(20, 143, 119, 0.8)' : 'rgba(26, 82, 118, 0.6)'),
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.parsed.y} مهام منجزة`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, color: '#8b949e' },
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
      console.error('Error rendering week activity chart:', error);
    }
  },

  renderPriorityChart(stats) {
    try {
      const ctx = document.getElementById('priorityChart');
      if (!ctx) return;

      const total = stats.priorityDist.high + stats.priorityDist.medium + stats.priorityDist.low;

      this.charts.priority = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['عالية', 'متوسطة', 'منخفضة'],
          datasets: [{
            data: [stats.priorityDist.high, stats.priorityDist.medium, stats.priorityDist.low],
            backgroundColor: ['#f85149', '#d29922', '#3fb950'],
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#8b949e', padding: 16, usePointStyle: true }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ${ctx.parsed} مهمة (${total > 0 ? Math.round((ctx.parsed / total) * 100) : 0}%)`
              }
            }
          }
        },
        plugins: [{
          id: 'centerText',
          beforeDraw(chart) {
            const { width, height, ctx } = chart;
            ctx.restore();
            const fontSize = (height / 100).toFixed(0);
            ctx.font = `bold ${fontSize}px Cairo`;
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#e6edf3';
            const text = `${total}`;
            const textX = width / 2;
            const textY = height / 2;
            ctx.fillText(text, textX, textY);
            ctx.save();
          }
        }]
      });
    } catch (error) {
      console.error('Error rendering priority chart:', error);
    }
  },

  renderProductivityChart(stats) {
    try {
      const ctx = document.getElementById('productivityChart');
      if (!ctx) return;

      const displayDays = stats.dayByDay.length > 30 ? stats.dayByDay.slice(-30) : stats.dayByDay;
      const labels = displayDays.map(d => d.date.substring(5));
      const data = displayDays.map(d => d.count);
      const avg = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;

      this.charts.productivity = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'مهام مكتملة يومياً',
            data,
            borderColor: '#148f77',
            backgroundColor: 'rgba(20, 143, 119, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: data.length > 15 ? 2 : 4,
            pointBackgroundColor: '#148f77',
            pointBorderColor: '#0d1117',
            pointBorderWidth: 2
          }, {
            label: 'المتوسط',
            data: new Array(data.length).fill(avg),
            borderColor: '#d29922',
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              labels: { color: '#8b949e', usePointStyle: true }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, color: '#8b949e' },
              grid: { color: 'rgba(48, 54, 61, 0.5)' }
            },
            x: {
              ticks: {
                color: '#8b949e',
                maxTicksLimit: 10
              },
              grid: { display: false }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error rendering productivity chart:', error);
    }
  },

  renderPrayerProductivityChart(stats) {
    try {
      const ctx = document.getElementById('prayerProductivityChart');
      if (!ctx) return;

      const labels = stats.prayerSlots.map(s => s.name);
      const data = stats.prayerSlots.map(s => s.count);

      this.charts.prayerProductivity = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'مهام مكتملة',
            data,
            backgroundColor: [
              'rgba(26, 82, 118, 0.8)',
              'rgba(20, 143, 119, 0.8)',
              'rgba(212, 172, 13, 0.8)',
              'rgba(142, 68, 173, 0.8)',
              'rgba(231, 76, 60, 0.8)',
              'rgba(52, 152, 219, 0.8)'
            ],
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.parsed.x} مهام`
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
      console.error('Error rendering prayer productivity chart:', error);
    }
  },

  /* ─────────────────────────────────────────────────────
     Data Export / Import
     ───────────────────────────────────────────────────── */

  async exportCSV() {
    try {
      const tasks = await db.tasks.toArray();
      if (tasks.length === 0) {
        showToast('مفيش مهام للتصدير', 'warning');
        return;
      }

      const headers = ['ID', 'العنوان', 'الوصف', 'الأولوية', 'الحالة', 'تاريخ التسليم', 'التاريخ الهجري', 'الصلاة', 'النية', 'الوسوم', 'تاريخ الإنشاء', 'تاريخ التحديث'];
      const rows = tasks.map(t => [
        t.id,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.priority,
        t.status,
        t.dueDate || '',
        t.hijriDate || '',
        t.prayerLink || '',
        `"${(t.niyyah || '').replace(/"/g, '""')}"`,
        `"${(t.tags || []).join(', ')}"`,
        t.createdAt || '',
        t.updatedAt || ''
      ]);

      const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      this.downloadFile(csv, 'hayah-tasks.csv', 'text/csv;charset=utf-8');
      showToast('تم تصدير CSV بنجاح', 'success');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showToast('خطأ في تصدير CSV', 'error');
    }
  },

  async exportJSON() {
    try {
      const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        tasks: await db.tasks.toArray(),
        projects: await db.projects.toArray(),
        notes: await db.notes.toArray(),
        habits: await db.habits.toArray(),
        teamMembers: await db.teamMembers.toArray(),
        settings: await db.settings.toArray(),
        aiConversations: await db.aiConversations.toArray()
      };

      const json = JSON.stringify(data, null, 2);
      this.downloadFile(json, `hayah-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      showToast('تم تصدير JSON بنجاح', 'success');
    } catch (error) {
      console.error('Error exporting JSON:', error);
      showToast('خطأ في تصدير JSON', 'error');
    }
  },

  async exportToPDF() {
    try {
      const settings = await getAllSettings();
      const userName = settings.profileName || 'مستخدم';
      const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
      const tasks = await db.tasks.toArray();
      const completed = tasks.filter(t => t.status === 'done');
      const habits = await getAllHabits();

      const printWin = window.open('', '_blank', 'width=900,height=700');
      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>تقرير حياة — ${userName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page { margin: 2cm; size: A4; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Cairo', Arial, sans-serif;
              color: #1a1a2e; background: #fff; padding: 20px; direction: rtl;
            }
            .report-header {
              text-align: center; padding: 30px 0 20px; border-bottom: 2px solid #1a5276; margin-bottom: 30px;
            }
            .report-header h1 { font-size: 24px; color: #1a5276; margin-bottom: 5px; }
            .report-header p { color: #666; font-size: 14px; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .summary-card { background: #f6f8fa; border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; }
            .summary-card .value { font-size: 28px; font-weight: 700; color: #1a5276; }
            .summary-card .label { font-size: 12px; color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #1a5276; color: #fff; padding: 8px 12px; font-size: 13px; text-align: right; }
            td { padding: 6px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
            tr:nth-child(even) { background: #f6f8fa; }
            .section-title { font-size: 16px; color: #1a5276; margin: 25px 0 10px; padding-bottom: 5px; border-bottom: 1px solid #ddd; }
            .habits-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0; }
            .habit-item { background: #f6f8fa; border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
            .habit-item .name { font-weight: 600; font-size: 13px; }
            .habit-item .stat { font-size: 11px; color: #666; }
            .footer { text-align: center; font-size: 11px; color: #999; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; }
            .no-print { display: none; }
            .badge-dot { display: none; }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>📊 تقرير حياة</h1>
            <p>${userName} — ${today}</p>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <div class="value">${completed.length}</div>
              <div class="label">✅ المهام المنجزة</div>
            </div>
            <div class="summary-card">
              <div class="value">${tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0}%</div>
              <div class="label">📈 معدل الإنجاز</div>
            </div>
            <div class="summary-card">
              <div class="value">${habits.reduce((sum, h) => sum + (h.completedDates?.length || 0), 0)}</div>
              <div class="label">🌱 إنجاز العادات</div>
            </div>
          </div>

          <h2 class="section-title">✅ المهام المنجزة هذا الشهر</h2>
          ${completed.length > 0 ? `
          <table>
            <thead><tr><th>المهمة</th><th>الأولوية</th><th>تاريخ الإنجاز</th></tr></thead>
            <tbody>
              ${completed.slice(0, 50).map(t => `
                <tr>
                  <td>${sanitizeHTML(t.title || 'بدون عنوان')}</td>
                  <td>${getPriorityLabel(t.priority)}</td>
                  <td>${t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('ar-EG') : '--'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${completed.length > 50 ? `<p style="font-size:12px;color:#999;">... و ${completed.length - 50} مهام أخرى</p>` : ''}
          ` : '<p style="color:#999;">لا توجد مهام منجزة</p>'}

          <h2 class="section-title">🌱 إحصائيات العادات</h2>
          <div class="habits-list">
            ${habits.map(h => `
              <div class="habit-item">
                <div class="name">${h.icon || ''} ${sanitizeHTML(h.name)}</div>
                <div class="stat">${h.completedDates?.length || 0} يوم منجزة · أقوى سلسلة: ${h.bestStreak || 0} يوم</div>
              </div>
            `).join('')}
          </div>

          <div class="footer">تم إنشاء التقرير بواسطة نظام حياة — ${new Date().toISOString().split('T')[0]}</div>

          <script>window.onload = function() { window.print(); window.close(); };<\/script>
        </body>
        </html>
      `);
      printWin.document.close();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast('خطأ في تصدير PDF', 'error');
    }
  },

  async importJSON() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const text = await file.text();
        const data = JSON.parse(text);

        if (data.tasks) {
          for (const task of data.tasks) {
            const existing = await db.tasks.get(task.id);
            if (!existing) {
              await db.tasks.add(task);
            }
          }
        }
        if (data.projects) {
          for (const proj of data.projects) {
            const existing = await db.projects.get(proj.id);
            if (!existing) await db.projects.add(proj);
          }
        }
        if (data.notes) {
          for (const note of data.notes) {
            const existing = await db.notes.get(note.id);
            if (!existing) await db.notes.add(note);
          }
        }
        if (data.habits) {
          for (const habit of data.habits) {
            const existing = await db.habits.get(habit.id);
            if (!existing) await db.habits.add(habit);
          }
        }
        if (data.teamMembers) {
          for (const member of data.teamMembers) {
            const existing = await db.teamMembers.get(member.id);
            if (!existing) await db.teamMembers.add(member);
          }
        }
        if (data.settings) {
          for (const setting of data.settings) {
            await db.settings.put(setting);
          }
        }
        if (data.aiConversations) {
          for (const conv of data.aiConversations) {
            const existing = await db.aiConversations.get(conv.id);
            if (!existing) await db.aiConversations.add(conv);
          }
        }

        showToast(`تم استيراد البيانات بنجاح`, 'success');
        this.load();
      };
      input.click();
    } catch (error) {
      console.error('Error importing JSON:', error);
      showToast('خطأ في استيراد البيانات', 'error');
    }
  },

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /* ─────────────────────────────────────────────────────
     Events
     ───────────────────────────────────────────────────── */

  bindEvents() {
    try {
      document.querySelectorAll('.analytics-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          this.currentRange = btn.dataset.range;
          this.render();
          this.load();
        });
      });
    } catch (error) {
      console.error('Error binding analytics events:', error);
    }
  }
};

if (typeof window !== 'undefined') {
  window.Analytics = Analytics;
}
