'use strict';

/**
 * إعدادات التطبيق — Phase 9
 * الملف الشخصي، المظهر، الإشعارات، البيانات، Groq API، PWA
 */

const Settings = {
  currentTab: 'profile',
  settings: {},

  async init() {
    try {
      this.settings = await getAllSettings();
      this.render();
      this.applySettings();
      this.bindEvents();
    } catch (error) {
      console.error('Error initializing Settings:', error);
      showToast('خطأ في تحميل الإعدادات', 'error');
    }
  },

  render() {
    const container = document.getElementById('pageContent');
    if (!container) return;

    const s = this.settings;

    container.innerHTML = `
      <div class="page active">
        <!-- Tabs -->
        <div class="settings-tabs" style="margin-bottom:var(--spacing-lg);display:flex;gap:var(--spacing-sm);overflow-x:auto;padding-bottom:var(--spacing-xs);flex-wrap:wrap;">
          <button class="btn btn-sm settings-tab ${this.currentTab === 'profile' ? 'active' : ''}" data-tab="profile">
            <i data-lucide="user" style="width:14px;height:14px;"></i> الملف الشخصي
          </button>
          <button class="btn btn-sm settings-tab ${this.currentTab === 'appearance' ? 'active' : ''}" data-tab="appearance">
            <i data-lucide="palette" style="width:14px;height:14px;"></i> المظهر
          </button>
          <button class="btn btn-sm settings-tab ${this.currentTab === 'api' ? 'active' : ''}" data-tab="api">
            <i data-lucide="bot" style="width:14px;height:14px;"></i> Groq API
          </button>
          <button class="btn btn-sm settings-tab ${this.currentTab === 'notifications' ? 'active' : ''}" data-tab="notifications">
            <i data-lucide="bell" style="width:14px;height:14px;"></i> الإشعارات
          </button>
          <button class="btn btn-sm settings-tab ${this.currentTab === 'data' ? 'active' : ''}" data-tab="data">
            <i data-lucide="database" style="width:14px;height:14px;"></i> البيانات
          </button>
          <button class="btn btn-sm settings-tab ${this.currentTab === 'about' ? 'active' : ''}" data-tab="about">
            <i data-lucide="info" style="width:14px;height:14px;"></i> عن التطبيق
          </button>
        </div>

        <!-- Profile Section -->
        <div class="settings-section ${this.currentTab === 'profile' ? 'active' : 'hidden'}" id="profileSection">
          <div class="card">
            <div class="card-header"><h3 class="card-title"><i data-lucide="user"></i> الملف الشخصي</h3></div>
            <div style="display:flex;align-items:center;gap:var(--spacing-lg);margin-bottom:var(--spacing-xl);">
              <div id="avatarPreview" style="width:80px;height:80px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden;cursor:pointer;position:relative;">
                ${s.profilePhoto ? `<img src="${s.profilePhoto}" style="width:100%;height:100%;object-fit:cover;">` : this.getInitials(s.profileName || 'مستخدم')}
                <input type="file" id="avatarUpload" accept="image/*" style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer;">
              </div>
              <div>
                <h4 style="margin:0 0 var(--spacing-xs);">${this.escapeHtml(s.profileName || 'مستخدم')}</h4>
                <p style="color:var(--text-muted);margin:0;font-size:0.8125rem;">اضغط على الصورة لتغييرها</p>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">الاسم الكامل</label>
              <input type="text" id="setProfileName" class="form-input" value="${this.escapeHtml(s.profileName || '')}" placeholder="اسمك الكامل">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">المدينة</label>
                <select id="setProfileCity" class="form-select">
                  <option value="Cairo" ${s.city === 'Cairo' ? 'selected' : ''}>القاهرة</option>
                  <option value="Alexandria" ${s.city === 'Alexandria' ? 'selected' : ''}>الإسكندرية</option>
                  <option value="Giza" ${s.city === 'Giza' ? 'selected' : ''}>الجيزة</option>
                  <option value="Mansoura" ${s.city === 'Mansoura' ? 'selected' : ''}>المنصورة</option>
                  <option value="Tanta" ${s.city === 'Tanta' ? 'selected' : ''}>طنطا</option>
                  <option value="Asyut" ${s.city === 'Asyut' ? 'selected' : ''}>أسيوط</option>
                  <option value="Ismailia" ${s.city === 'Ismailia' ? 'selected' : ''}>الإسماعيلية</option>
                  <option value="Luxor" ${s.city === 'Luxor' ? 'selected' : ''}>الأقصر</option>
                  <option value="Aswan" ${s.city === 'Aswan' ? 'selected' : ''}>أسوان</option>
                  <option value="Mecca" ${s.city === 'Mecca' ? 'selected' : ''}>مكة المكرمة</option>
                  <option value="Medina" ${s.city === 'Medina' ? 'selected' : ''}>المدينة المنورة</option>
                  <option value="Riyadh" ${s.city === 'Riyadh' ? 'selected' : ''}>الرياض</option>
                  <option value="Jeddah" ${s.city === 'Jeddah' ? 'selected' : ''}>جدة</option>
                  <option value="Amman" ${s.city === 'Amman' ? 'selected' : ''}>عمّان</option>
                  <option value="Beirut" ${s.city === 'Beirut' ? 'selected' : ''}>بيروت</option>
                  <option value="Damascus" ${s.city === 'Damascus' ? 'selected' : ''}>دمشق</option>
                  <option value="Baghdad" ${s.city === 'Baghdad' ? 'selected' : ''}>بغداد</option>
                  <option value="Kuwait" ${s.city === 'Kuwait' ? 'selected' : ''}>الكويت</option>
                  <option value="Doha" ${s.city === 'Doha' ? 'selected' : ''}>الدوحة</option>
                  <option value="Manama" ${s.city === 'Manama' ? 'selected' : ''}>المنامة</option>
                  <option value="Muscat" ${s.city === 'Muscat' ? 'selected' : ''}>مسقط</option>
                  <option value="Sanaa" ${s.city === 'Sanaa' ? 'selected' : ''}>صنعاء</option>
                  <option value="Tripoli" ${s.city === 'Tripoli' ? 'selected' : ''}>طرابلس</option>
                  <option value="Tunis" ${s.city === 'Tunis' ? 'selected' : ''}>تونس</option>
                  <option value="Algiers" ${s.city === 'Algiers' ? 'selected' : ''}>الجزائر</option>
                  <option value="Casablanca" ${s.city === 'Casablanca' ? 'selected' : ''}>الدار البيضاء</option>
                  <option value="Khartoum" ${s.city === 'Khartoum' ? 'selected' : ''}>الخرطوم</option>
                  <option value="Mogadishu" ${s.city === 'Mogadishu' ? 'selected' : ''}>مقديشو</option>
                  <option value="Djibouti" ${s.city === 'Djibouti' ? 'selected' : ''}>جيبوتي</option>
                  <option value="Nouakchott" ${s.city === 'Nouakchott' ? 'selected' : ''}>نواكشوط</option>
                  <option value="London" ${s.city === 'London' ? 'selected' : ''}>لندن</option>
                  <option value="Paris" ${s.city === 'Paris' ? 'selected' : ''}>باريس</option>
                  <option value="Istanbul" ${s.city === 'Istanbul' ? 'selected' : ''}>اسطنبول</option>
                  <option value="KualaLumpur" ${s.city === 'KualaLumpur' ? 'selected' : ''}>كوالالمبور</option>
                  <option value="Jakarta" ${s.city === 'Jakarta' ? 'selected' : ''}>جاكرتا</option>
                  <option value="Islamabad" ${s.city === 'Islamabad' ? 'selected' : ''}>إسلام آباد</option>
                  <option value="Dhaka" ${s.city === 'Dhaka' ? 'selected' : ''}>دكا</option>
                  <option value="Tehran" ${s.city === 'Tehran' ? 'selected' : ''}>طهران</option>
                  <option value="Kabul" ${s.city === 'Kabul' ? 'selected' : ''}>كابل</option>
                  <option value="Other" ${s.city === 'Other' ? 'selected' : ''}>أخرى</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">طريقة الحساب</label>
                <select id="setProfileMethod" class="form-select">
                  <option value="Egypt" ${s.prayerMethod === 'Egypt' ? 'selected' : ''}>الهيئة المصرية (5)</option>
                  <option value="Makkah" ${s.prayerMethod === 'Makkah' ? 'selected' : ''}>أم القرى</option>
                  <option value="MWL" ${s.prayerMethod === 'MWL' ? 'selected' : ''}>رابطة العالم الإسلامي</option>
                  <option value="ISNA" ${s.prayerMethod === 'ISNA' ? 'selected' : ''}>أمريكا الشمالية</option>
                  <option value="UmmAlQura" ${s.prayerMethod === 'UmmAlQura' ? 'selected' : ''}>أم القرى (حديث)</option>
                  <option value="Dubai" ${s.prayerMethod === 'Dubai' ? 'selected' : ''}>دبي</option>
                  <option value="Kuwait" ${s.prayerMethod === 'Kuwait' ? 'selected' : ''}>الكويت</option>
                  <option value="Qatar" ${s.prayerMethod === 'Qatar' ? 'selected' : ''}>قطر</option>
                  <option value="Singapore" ${s.prayerMethod === 'Singapore' ? 'selected' : ''}>سنغافورة</option>
                  <option value="Karachi" ${s.prayerMethod === 'Karachi' ? 'selected' : ''}>كراتشي</option>
                  <option value="Tehran" ${s.prayerMethod === 'Tehran' ? 'selected' : ''}>طهران</option>
                  <option value="Algeria" ${s.prayerMethod === 'Algeria' ? 'selected' : ''}>الجزائر</option>
                  <option value="Jafari" ${s.prayerMethod === 'Jafari' ? 'selected' : ''}>جعفري</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">المذهب (لحساب العصر)</label>
              <div class="radio-group" style="display:flex;gap:var(--spacing-md);margin-top:var(--spacing-xs);">
                <label class="radio-label" style="display:flex;align-items:center;gap:var(--spacing-xs);cursor:pointer;">
                  <input type="radio" name="madhab" value="Shafi" ${s.madhab === 'Shafi' || !s.madhab ? 'checked' : ''} style="accent-color:var(--primary);">
                  <span>شافعي</span>
                </label>
                <label class="radio-label" style="display:flex;align-items:center;gap:var(--spacing-xs);cursor:pointer;">
                  <input type="radio" name="madhab" value="Hanafi" ${s.madhab === 'Hanafi' ? 'checked' : ''} style="accent-color:var(--primary);">
                  <span>حنفي</span>
                </label>
              </div>
            </div>
            <div style="display:flex;gap:var(--spacing-sm);justify-content:flex-end;margin-top:var(--spacing-lg);">
              <button class="btn btn-primary" onclick="Settings.saveProfile()"><i data-lucide="save"></i> حفظ الملف الشخصي</button>
            </div>
          </div>
        </div>

        <!-- Appearance Section -->
        <div class="settings-section ${this.currentTab === 'appearance' ? 'active' : 'hidden'}" id="appearanceSection">
          <div class="card">
            <div class="card-header"><h3 class="card-title"><i data-lucide="palette"></i> المظهر والتخصيص</h3></div>

            <div class="form-group">
              <label class="form-label">السمة</label>
              <div class="theme-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--spacing-sm);">
                <button class="theme-option ${s.theme === 'dark' || !s.theme ? 'active' : ''}" data-theme="dark" onclick="Settings.setTheme('dark')">
                  <div style="width:100%;height:40px;background:#0d1117;border-radius:var(--radius-sm);border:2px solid var(--border);margin-bottom:var(--spacing-xs);"></div>
                  <span style="font-size:0.8125rem;">داكن</span>
                </button>
                <button class="theme-option ${s.theme === 'darker' ? 'active' : ''}" data-theme="darker" onclick="Settings.setTheme('darker')">
                  <div style="width:100%;height:40px;background:#010409;border-radius:var(--radius-sm);border:2px solid var(--border);margin-bottom:var(--spacing-xs);"></div>
                  <span style="font-size:0.8125rem;">أكثر ظلمة</span>
                </button>
                <button class="theme-option ${s.theme === 'oled' ? 'active' : ''}" data-theme="oled" onclick="Settings.setTheme('oled')">
                  <div style="width:100%;height:40px;background:#000000;border-radius:var(--radius-sm);border:2px solid var(--border);margin-bottom:var(--spacing-xs);"></div>
                  <span style="font-size:0.8125rem;">OLED</span>
                </button>
                <button class="theme-option ${s.theme === 'light' ? 'active' : ''}" data-theme="light" onclick="Settings.setTheme('light')">
                  <div style="width:100%;height:40px;background:#f6f8fa;border-radius:var(--radius-sm);border:2px solid #d1d5db;margin-bottom:var(--spacing-xs);"></div>
                  <span style="font-size:0.8125rem;">فاتح</span>
                </button>
              </div>
            </div>

            <div class="form-group" style="margin-top:var(--spacing-lg);">
              <label class="form-label">لون التمييز (Accent)</label>
              <div class="accent-grid" style="display:flex;gap:var(--spacing-sm);flex-wrap:wrap;">
                <button class="accent-option ${s.accent === 'gold' || !s.accent ? 'active' : ''}" data-accent="gold" onclick="Settings.setAccent('gold')" style="width:36px;height:36px;border-radius:50%;background:#d4ac0d;border:3px solid transparent;cursor:pointer;"></button>
                <button class="accent-option ${s.accent === 'blue' ? 'active' : ''}" data-accent="blue" onclick="Settings.setAccent('blue')" style="width:36px;height:36px;border-radius:50%;background:#58a6ff;border:3px solid transparent;cursor:pointer;"></button>
                <button class="accent-option ${s.accent === 'green' ? 'active' : ''}" data-accent="green" onclick="Settings.setAccent('green')" style="width:36px;height:36px;border-radius:50%;background:#3fb950;border:3px solid transparent;cursor:pointer;"></button>
                <button class="accent-option ${s.accent === 'purple' ? 'active' : ''}" data-accent="purple" onclick="Settings.setAccent('purple')" style="width:36px;height:36px;border-radius:50%;background:#bc8cff;border:3px solid transparent;cursor:pointer;"></button>
                <button class="accent-option ${s.accent === 'red' ? 'active' : ''}" data-accent="red" onclick="Settings.setAccent('red')" style="width:36px;height:36px;border-radius:50%;background:#f85149;border:3px solid transparent;cursor:pointer;"></button>
                <button class="accent-option ${s.accent === 'orange' ? 'active' : ''}" data-accent="orange" onclick="Settings.setAccent('orange')" style="width:36px;height:36px;border-radius:50%;background:#d29922;border:3px solid transparent;cursor:pointer;"></button>
                <button class="accent-option ${s.accent === 'cyan' ? 'active' : ''}" data-accent="cyan" onclick="Settings.setAccent('cyan')" style="width:36px;height:36px;border-radius:50%;background:#39d2c0;border:3px solid transparent;cursor:pointer;"></button>
                <button class="accent-option ${s.accent === 'pink' ? 'active' : ''}" data-accent="pink" onclick="Settings.setAccent('pink')" style="width:36px;height:36px;border-radius:50%;background:#f778ba;border:3px solid transparent;cursor:pointer;"></button>
              </div>
            </div>

            <div class="form-group" style="margin-top:var(--spacing-lg);">
              <label class="form-label">حجم الخط</label>
              <div class="font-size-grid" style="display:flex;gap:var(--spacing-sm);">
                <button class="btn btn-sm font-size-btn ${s.fontSize === 'small' ? 'btn-outline active' : 'btn-outline'}" data-size="small" onclick="Settings.setFontSize('small')">صغير</button>
                <button class="btn btn-sm font-size-btn ${s.fontSize === 'normal' || !s.fontSize ? 'btn-primary active' : 'btn-outline'}" data-size="normal" onclick="Settings.setFontSize('normal')">عادي</button>
                <button class="btn btn-sm font-size-btn ${s.fontSize === 'large' ? 'btn-outline active' : 'btn-outline'}" data-size="large" onclick="Settings.setFontSize('large')">كبير</button>
              </div>
            </div>

            <div class="form-group" style="margin-top:var(--spacing-lg);">
              <label class="form-label">كثافة البيانات</label>
              <div class="density-grid" style="display:flex;gap:var(--spacing-sm);">
                <button class="btn btn-sm density-btn ${s.density === 'compact' ? 'btn-outline active' : 'btn-outline'}" data-density="compact" onclick="Settings.setDensity('compact')">مضغوط</button>
                <button class="btn btn-sm density-btn ${s.density === 'normal' || !s.density ? 'btn-primary active' : 'btn-outline'}" data-density="normal" onclick="Settings.setDensity('normal')">عادي</button>
                <button class="btn btn-sm density-btn ${s.density === 'comfortable' ? 'btn-outline active' : 'btn-outline'}" data-density="comfortable" onclick="Settings.setDensity('comfortable')">مريح</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Groq API Section -->
        <div class="settings-section ${this.currentTab === 'api' ? 'active' : 'hidden'}" id="apiSection">
          <div class="card">
            <div class="card-header"><h3 class="card-title"><i data-lucide="bot"></i> إعدادات Groq API</h3></div>
            <div class="form-group">
              <label class="form-label">API Key</label>
              <div style="display:flex;gap:var(--spacing-sm);">
                <input type="password" id="groq-key-input" class="form-input" value="${this.escapeHtml(s.groqApiKey || '')}" placeholder="gsk_xxxxxxxxxxxxxxxx" style="flex:1;font-family:var(--font-mono);">
                <button type="button" class="btn btn-ghost btn-sm" onclick="toggleGroqKeyVisibility()" id="toggleApiBtn" title="إظهار/إخفاء">
                  <i data-lucide="eye" style="width:14px;height:14px;"></i>
                </button>
              </div>
              <small class="form-hint" style="margin-top:var(--spacing-xs);display:block;">
                احصل على مفتاح مجاني من <a href="https://console.groq.com/keys" target="_blank" style="color:var(--info);">console.groq.com/keys</a>
              </small>
            </div>
            <p id="groq-status" style="font-size:.8rem;color:var(--text-muted);margin:.5rem 0 0;">
              أدخل مفتاحك من groq.com (مجاني)
            </p>
            <div style="display:flex;gap:var(--spacing-sm);margin-top:var(--spacing-md);flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm" onclick="saveGroqKey()"><i data-lucide="save"></i> حفظ</button>
              <button class="btn btn-outline btn-sm" onclick="testGroqConnection()" id="test-groq-btn"><i data-lucide="plug" style="width:14px;height:14px;"></i> اختبر الاتصال</button>
              <a href="https://console.groq.com/keys" target="_blank" class="btn btn-outline btn-sm" style="text-decoration:none;">
                <i data-lucide="external-link" style="width:14px;height:14px;"></i> احصل على مفتاح مجاني
              </a>
            </div>
          </div>
        </div>

        <!-- Notifications Section -->
        <div class="settings-section ${this.currentTab === 'notifications' ? 'active' : 'hidden'}" id="notificationsSection">
          <div class="card">
            <div class="card-header"><h3 class="card-title"><i data-lucide="bell"></i> الإشعارات</h3></div>

            <div class="setting-row" style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-md) 0;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-weight:600;">إشعارات الصلاة</div>
                <small style="color:var(--text-muted);">تنبيه عند دخول وقت كل صلاة</small>
              </div>
              <label class="switch">
                <input type="checkbox" id="setNotifPrayer" ${s.notifPrayer !== false ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-row" style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-md) 0;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-weight:600;">التذكير قبل الصلاة</div>
                <small style="color:var(--text-muted);">تنبيه قبل وقت الصلاة</small>
              </div>
              <select id="setPrayerReminder" class="form-select" style="width:auto;min-width:100px;">
                <option value="0" ${s.prayerReminder === '0' || s.prayerReminder === 0 ? 'selected' : ''}>بدون</option>
                <option value="5" ${s.prayerReminder === '5' || s.prayerReminder === 5 ? 'selected' : ''}>٥ دقائق</option>
                <option value="10" ${s.prayerReminder === '10' || s.prayerReminder === 10 ? 'selected' : ''}>١٠ دقائق</option>
                <option value="15" ${s.prayerReminder === '15' || s.prayerReminder === 15 || !s.prayerReminder ? 'selected' : ''}>١٥ دقيقة</option>
                <option value="30" ${s.prayerReminder === '30' || s.prayerReminder === 30 ? 'selected' : ''}>٣٠ دقيقة</option>
              </select>
            </div>

            <div class="setting-row" style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-md) 0;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-weight:600;">إشعارات المهام المتأخرة</div>
                <small style="color:var(--text-muted);">تنبيه عند وجود مهام تجاوزت موعد التسليم</small>
              </div>
              <label class="switch">
                <input type="checkbox" id="setNotifOverdue" ${s.notifOverdue !== false ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-row" style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-md) 0;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-weight:600;">ملخص الصباح اليومي</div>
                <small style="color:var(--text-muted);">ملخص المهام والعادات كل صباح</small>
              </div>
              <label class="switch">
                <input type="checkbox" id="setMorningSummary" ${s.morningSummary !== false ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="setting-row" style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-md) 0;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-weight:600;">وقت ملخص الصباح</div>
                <small style="color:var(--text-muted);">متى تريد استلام الملخص؟</small>
              </div>
              <input type="time" id="setMorningTime" class="form-input" value="${s.morningTime || '07:00'}" style="width:auto;min-width:100px;text-align:center;">
            </div>

            <div class="setting-row" style="display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-md) 0;">
              <div>
                <div style="font-weight:600;">أصوات الإشعارات</div>
                <small style="color:var(--text-muted);">تشغيل صوت عند الإشعارات</small>
              </div>
              <label class="switch">
                <input type="checkbox" id="setSound" ${s.sound !== false ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div style="display:flex;gap:var(--spacing-sm);justify-content:flex-end;margin-top:var(--spacing-lg);flex-wrap:wrap;">
              <button class="btn btn-outline btn-sm" onclick="Settings.testNotification()"><i data-lucide="bell-ring" style="width:14px;height:14px;"></i> اختبر إشعاراً</button>
              <button class="btn btn-primary btn-sm" onclick="Settings.saveNotifications()"><i data-lucide="save"></i> حفظ</button>
            </div>
          </div>
        </div>

        <!-- Data Section -->
        <div class="settings-section ${this.currentTab === 'data' ? 'active' : 'hidden'}" id="dataSection">
          <div class="card">
            <div class="card-header"><h3 class="card-title"><i data-lucide="database"></i> إدارة البيانات</h3></div>

            <div id="dataStats" style="background:var(--surface-2);border-radius:var(--radius-md);padding:var(--spacing-md);margin-bottom:var(--spacing-lg);">
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:var(--spacing-sm);text-align:center;">
                <div>
                  <div style="font-size:1.5rem;font-weight:700;color:var(--primary-light);" id="statTasks">--</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);">مهام</div>
                </div>
                <div>
                  <div style="font-size:1.5rem;font-weight:700;color:var(--success);" id="statProjects">--</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);">مشاريع</div>
                </div>
                <div>
                  <div style="font-size:1.5rem;font-weight:700;color:var(--accent);" id="statNotes">--</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);">ملاحظات</div>
                </div>
                <div>
                  <div style="font-size:1.5rem;font-weight:700;color:var(--info);" id="statHabits">--</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);">عادات</div>
                </div>
                <div>
                  <div style="font-size:1.5rem;font-weight:700;color:var(--warning);" id="statStorage">--</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);">المساحة</div>
                </div>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:var(--spacing-sm);">
              <button class="btn btn-outline" onclick="Settings.exportData()"><i data-lucide="download"></i> تصدير كامل (JSON)</button>
              <button class="btn btn-outline" onclick="Settings.importData()"><i data-lucide="upload"></i> استيراد بيانات (JSON)</button>
              <button class="btn btn-outline" onclick="Settings.showGoogleDrivePlaceholder()" style="opacity:0.6;">
                <i data-lucide="cloud"></i> مزامنة مع Google Drive
                <span style="font-size:0.6875rem;color:var(--text-muted);margin-right:var(--spacing-xs);">(قريباً)</span>
              </button>
              <button class="btn btn-danger" onclick="Settings.clearAllData()"><i data-lucide="trash-2"></i> حذف كل البيانات</button>
            </div>
          </div>
        </div>

        <!-- About Section -->
        <div class="settings-section ${this.currentTab === 'about' ? 'active' : 'hidden'}" id="aboutSection">
          <div class="card">
            <div class="card-header"><h3 class="card-title"><i data-lucide="info"></i> عن التطبيق</h3></div>
            <div style="text-align:center;padding:var(--spacing-xl) 0;">
              <div style="width:80px;height:80px;background:var(--primary);border-radius:var(--radius-lg);display:inline-flex;align-items:center;justify-content:center;margin-bottom:var(--spacing-md);">
                <span style="font-size:2.5rem;font-weight:800;color:#fff;">ح</span>
              </div>
              <h3 style="margin:0 0 var(--spacing-xs);">حياة v1.0</h3>
              <p style="color:var(--text-muted);margin:0 0 var(--spacing-md);">نظام إدارة حياة شامل مبني على القيم الإسلامية</p>
              <div style="display:inline-flex;gap:var(--spacing-md);font-size:0.8125rem;color:var(--text-muted);">
                <span>Dexie.js</span>
                <span>•</span>
                <span>Groq AI</span>
                <span>•</span>
                <span>Aladhan API</span>
                <span>•</span>
                <span>PWA</span>
              </div>
            </div>
            <div style="border-top:1px solid var(--border);padding-top:var(--spacing-lg);">
              <div style="display:grid;gap:var(--spacing-sm);font-size:0.875rem;">
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-muted);">المطور</span><span>Hayah Team</span></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-muted);">الرخصة</span><span>MIT</span></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-muted);">الإصدار</span><span>1.0.0</span></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-muted);">آخر تحديث</span><span>${new Date().toLocaleDateString('ar-EG')}</span></div>
              </div>
            </div>
            <div style="display:flex;gap:var(--spacing-sm);justify-content:flex-end;margin-top:var(--spacing-lg);">
              <button class="btn btn-outline btn-sm" onclick="Settings.checkForUpdates()"><i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> البحث عن تحديثات</button>
            </div>
          </div>
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    this.loadDataStats();
  },

  bindEvents() {
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentTab = tab.dataset.tab;
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.settings-section').forEach(s => s.classList.add('hidden'));
        document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
        const section = document.getElementById(tab.dataset.tab + 'Section');
        if (section) {
          section.classList.remove('hidden');
          section.classList.add('active');
        }
      });
    });

    const avatarUpload = document.getElementById('avatarUpload');
    if (avatarUpload) {
      avatarUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const preview = document.getElementById('avatarPreview');
            if (preview) {
              preview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;"><input type="file" id="avatarUpload" accept="image/*" style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer;">`;
              this.settings.profilePhoto = ev.target.result;
              document.getElementById('avatarUpload').addEventListener('change', arguments.callee);
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  },

  getInitials(name) {
    if (!name) return 'م';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0);
    return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  async saveProfile() {
    try {
      const name = document.getElementById('setProfileName')?.value?.trim() || 'مستخدم';
      const city = document.getElementById('setProfileCity')?.value;
      const method = document.getElementById('setProfileMethod')?.value;
      const madhab = document.querySelector('input[name="madhab"]:checked')?.value || 'Shafi';

      await Promise.all([
        setSetting('profileName', name),
        setSetting('city', city),
        setSetting('prayerMethod', method),
        setSetting('madhab', madhab),
        setSetting('profilePhoto', this.settings.profilePhoto || '')
      ]);

      await updatePrayerSettings({ city, method });
      this.settings.profileName = name;
      this.settings.city = city;
      this.settings.prayerMethod = method;
      this.settings.madhab = madhab;

      const avatarEl = document.getElementById('userAvatar');
      const nameEl = document.getElementById('userName');
      if (avatarEl) avatarEl.textContent = this.getInitials(name);
      if (nameEl) nameEl.textContent = name.split(' ')[0];

      showToast('تم حفظ الملف الشخصي', 'success');
      this.render();
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('خطأ في الحفظ', 'error');
    }
  },

  async setTheme(theme) {
    this.settings.theme = theme;
    await setSetting('theme', theme);
    this.applyTheme();
    document.querySelectorAll('.theme-option').forEach(t => t.classList.toggle('active', t.dataset.theme === theme));
    showToast('تم تغيير السمة', 'success');
  },

  applyTheme() {
    const root = document.documentElement;
    const themes = {
      dark: {
        '--background': '#0d1117',
        '--surface': '#161b22',
        '--surface-2': '#21262d'
      },
      darker: {
        '--background': '#010409',
        '--surface': '#0a0e14',
        '--surface-2': '#161b22'
      },
      oled: {
        '--background': '#000000',
        '--surface': '#0a0a0a',
        '--surface-2': '#141414'
      },
      light: {
        '--background': '#f6f8fa',
        '--surface': '#ffffff',
        '--surface-2': '#f0f2f5',
        '--surface-3': '#e8eaed',
        '--text': '#1a1a2e',
        '--text-primary': '#111111',
        '--text-secondary': '#4a4a6a',
        '--text-muted': '#8b8ba7',
        '--text-disabled': '#b0b0c0',
        '--text-inverse': '#ffffff',
        '--border': '#d1d5db',
        '--border-muted': '#e5e7eb',
        '--border-strong': '#9ca3af',
        '--success-bg': '#3fb95015',
        '--warning-bg': '#d2992215',
        '--danger-bg': '#f8514915',
        '--info-bg': '#58a6ff15',
        '--shadow-sm': '0 1px 3px rgba(0,0,0,.1)',
        '--shadow-md': '0 4px 12px rgba(0,0,0,.12)',
        '--shadow-lg': '0 8px 32px rgba(0,0,0,.15)',
        '--shadow-glow': '0 0 20px rgba(26,82,118,.15)'
      }
    };
    const t = themes[this.settings.theme] || themes.dark;
    Object.entries(t).forEach(([k, v]) => root.style.setProperty(k, v));
    const themeName = this.settings.theme === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', themeName);
  },

  async setAccent(accent) {
    this.settings.accent = accent;
    await setSetting('accent', accent);
    this.applyAccent();
    document.querySelectorAll('.accent-option').forEach(a => {
      a.style.borderColor = a.dataset.accent === accent ? 'var(--text)' : 'transparent';
      a.classList.toggle('active', a.dataset.accent === accent);
    });
    showToast('تم تغيير لون التمييز', 'success');
  },

  applyAccent() {
    const root = document.documentElement;
    const accents = {
      gold: '#d4ac0d',
      blue: '#58a6ff',
      green: '#3fb950',
      purple: '#bc8cff',
      red: '#f85149',
      orange: '#d29922',
      cyan: '#39d2c0',
      pink: '#f778ba'
    };
    const color = accents[this.settings.accent] || accents.gold;
    root.style.setProperty('--accent', color);
    root.style.setProperty('--accent-light', this.lightenColor(color, 30));
  },

  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + percent);
    const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
    const b = Math.min(255, (num & 0x0000FF) + percent);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  },

  async setFontSize(size) {
    this.settings.fontSize = size;
    await setSetting('fontSize', size);
    this.applyFontSize();
    document.querySelectorAll('.font-size-btn').forEach(b => {
      b.className = `btn btn-sm font-size-btn ${b.dataset.size === size ? 'btn-primary active' : 'btn-outline'}`;
    });
    showToast('تم تغيير حجم الخط', 'success');
  },

  applyFontSize() {
    const sizes = { small: '14px', normal: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[this.settings.fontSize] || '16px';
  },

  async setDensity(density) {
    this.settings.density = density;
    await setSetting('density', density);
    this.applyDensity();
    document.querySelectorAll('.density-btn').forEach(b => {
      b.className = `btn btn-sm density-btn ${b.dataset.density === density ? 'btn-primary active' : 'btn-outline'}`;
    });
    showToast('تم تغيير كثافة البيانات', 'success');
  },

  applyDensity() {
    const densities = { compact: '0.75rem', normal: '1rem', comfortable: '1.25rem' };
    document.documentElement.style.setProperty('--spacing-md', densities[this.settings.density] || '1rem');
  },

  applySettings() {
    this.applyTheme();
    this.applyAccent();
    this.applyFontSize();
    this.applyDensity();

    const name = this.settings.profileName || 'مستخدم';
    const avatarEl = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userName');
    if (avatarEl) avatarEl.textContent = this.getInitials(name);
    if (nameEl) nameEl.textContent = name.split(' ')[0];
  },



  async saveNotifications() {
    try {
      const notifPrayer = document.getElementById('setNotifPrayer')?.checked ?? true;
      const prayerReminder = document.getElementById('setPrayerReminder')?.value || '15';
      const notifOverdue = document.getElementById('setNotifOverdue')?.checked ?? true;
      const morningSummary = document.getElementById('setMorningSummary')?.checked ?? true;
      const morningTime = document.getElementById('setMorningTime')?.value || '07:00';
      const sound = document.getElementById('setSound')?.checked ?? true;

      await Promise.all([
        setSetting('notifPrayer', notifPrayer),
        setSetting('prayerReminder', prayerReminder),
        setSetting('notifOverdue', notifOverdue),
        setSetting('morningSummary', morningSummary),
        setSetting('morningTime', morningTime),
        setSetting('sound', sound)
      ]);

      this.settings.notifPrayer = notifPrayer;
      this.settings.prayerReminder = prayerReminder;
      this.settings.notifOverdue = notifOverdue;
      this.settings.morningSummary = morningSummary;
      this.settings.morningTime = morningTime;
      this.settings.sound = sound;

      showToast('تم حفظ إعدادات الإشعارات', 'success');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      showToast('خطأ في الحفظ', 'error');
    }
  },

  async testNotification() {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('حياة — اختبار إشعار', {
            body: 'هذا إشعار تجريبي من تطبيق حياة ✓',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌙</text></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌙</text></svg>',
            tag: 'test-notification',
            requireInteraction: false
          });
          showToast('تم إرسال الإشعار التجريبي', 'success');
        } else {
          showToast('يرجى السماح بالإشعارات من إعدادات المتصفح', 'warning');
        }
      } else {
        showToast('المتصفح لا يدعم الإشعارات', 'warning');
      }
    } catch (error) {
      console.error('Error testing notification:', error);
      showToast('خطأ في اختبار الإشعار', 'error');
    }
  },

  async loadDataStats() {
    try {
      const tasksCount = await db.tasks.count();
      const projectsCount = await db.projects.count();
      const notesCount = await db.notes.count();
      const habitsCount = await db.habits.count();

      const tasksEl = document.getElementById('statTasks');
      const projectsEl = document.getElementById('statProjects');
      const notesEl = document.getElementById('statNotes');
      const habitsEl = document.getElementById('statHabits');
      const storageEl = document.getElementById('statStorage');

      if (tasksEl) tasksEl.textContent = tasksCount;
      if (projectsEl) projectsEl.textContent = projectsCount;
      if (notesEl) notesEl.textContent = notesCount;
      if (habitsEl) habitsEl.textContent = habitsCount;

      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage / 1024 / 1024).toFixed(1);
        if (storageEl) storageEl.textContent = `${usedMB} MB`;
      }
    } catch (error) {
      console.error('Error loading data stats:', error);
    }
  },

  async exportData() {
    try {
      showToast('جاري التصدير...', 'info');
      const data = await exportAllData();
      if (data) {
        downloadJSON(data, `hayah-backup-${new Date().toISOString().split('T')[0]}.json`);
        showToast('تم التصدير بنجاح', 'success');
      } else {
        showToast('خطأ في التصدير', 'error');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
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
          showToast('جاري الاستيراد...', 'info');
          const data = await readJSONFile(file);
          const ok = await importAllData(data);
          if (ok) {
            showToast('تم الاستيراد بنجاح — جاري إعادة التحميل', 'success');
            setTimeout(() => location.reload(), 1000);
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
      console.error('Error importing data:', error);
    }
  },

  showGoogleDrivePlaceholder() {
    showToast('هذه الميزة ستكون متاحة قريباً', 'info');
  },

  async clearAllData() {
    try {
      if (!confirm('⚠️ هل أنت متأكد من حذف كل البيانات؟\n\nلا يمكن التراجع عن هذا الإجراء!')) return;
      if (!confirm('⚠️ تأكيد أخير: سيتم حذف جميع المهام والملاحظات والعادات والإعدادات.\n\nمتابعة؟')) return;

      await clearAllData();
      showToast('تم حذف جميع البيانات', 'success');
      setTimeout(() => location.reload(), 1000);
    } catch (error) {
      console.error('Error clearing data:', error);
      showToast('خطأ في حذف البيانات', 'error');
    }
  },

  checkForUpdates() {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((reg) => {
            reg.update();
          });
        });
        showToast('جاري البحث عن تحديثات...', 'info');
        setTimeout(() => {
          showToast('التطبيق محدث (أو جاري التحديث في الخلفية)', 'info');
        }, 2000);
      } else {
        showToast('التحديثات التلقائية غير متاحة', 'warning');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }
};

window.Settings = Settings;
