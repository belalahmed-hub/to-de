'use strict';

/**
 * نظام حياة المسلم — مدير أوقات الصلاة (Phase 5 Enhanced)
 * Aladhan API + Fallback + Notifications + Countdown
 */

const PRAYER_METHODS = {
  Egypt: { id: 5 },
  Makkah: { id: 3 },
  MWL: { id: 4 },
  ISNA: { id: 2 },
  UmmAlQura: { id: 11 },
  Dubai: { id: 8 },
  Kuwait: { id: 9 },
  Qatar: { id: 12 },
  Singapore: { id: 11 },
  Karachi: { id: 1 },
  Tehran: { id: 7 },
  Algeria: { id: 13 },
  Jafari: { id: 0 }
};

const PrayerManager = {
  countdownInterval: null,
  notificationsEnabled: false,
  lastNotifiedPrayer: null,

  prayerNames: {
    Fajr: 'الفجر',
    Sunrise: 'الشروق',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء'
  },

  summerFallback: {
    Fajr: '04:00',
    Sunrise: '05:30',
    Dhuhr: '12:00',
    Asr: '15:30',
    Maghrib: '18:45',
    Isha: '20:15',
    Imsak: '03:45',
    Midnight: '00:00'
  },

  winterFallback: {
    Fajr: '04:30',
    Sunrise: '06:00',
    Dhuhr: '11:45',
    Asr: '15:15',
    Maghrib: '18:30',
    Isha: '19:50',
    Imsak: '04:15',
    Midnight: '00:00'
  },

  async init() {
    try {
      await this.requestNotificationPermission();
      this.startCountdown();
    } catch (error) {
      console.error('Error initializing PrayerManager:', error);
    }
  },

  async getPrayerTimes(date = null) {
    try {
      const d = date || new Date();
      const dateKey = this.toDateKey(d);

      const cached = await db.settings.get('prayerCache_' + dateKey);
      if (cached) return cached.value;

      const settings = await getPrayerSettings();
      const city = settings.city || 'Cairo';
      const country = settings.country || 'Egypt';
      const method = settings.method || 'Egypt';
      const methodId = PRAYER_METHODS[method]?.id || 5;

      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();

      const url = `https://api.aladhan.com/v1/timingsByCity/${dd}-${mm}-${yyyy}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${methodId}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('API failed');

      const data = await response.json();
      if (data.code === 200 && data.data) {
        const result = {
          timings: {
            Fajr: data.data.timings.Fajr,
            Sunrise: data.data.timings.Sunrise,
            Dhuhr: data.data.timings.Dhuhr,
            Asr: data.data.timings.Asr,
            Maghrib: data.data.timings.Maghrib,
            Isha: data.data.timings.Isha
          },
          hijri: data.data.date?.hijri || null,
          meta: data.data.meta || null
        };

        await setSetting('prayerCache_' + dateKey, result);
        return result;
      }

      throw new Error('Invalid API response');
    } catch (error) {
      console.error('Error fetching prayer times:', error);
      return this.getFallbackTimes(date);
    }
  },

  getFallbackTimes(date = null) {
    const d = date || new Date();
    const month = d.getMonth();
    const isSummer = month >= 4 && month <= 8;
    const fallback = isSummer ? this.summerFallback : this.winterFallback;

    return {
      timings: { ...fallback },
      hijri: toHijri(d),
      meta: null,
      isFallback: true
    };
  },

  async getNextPrayer(date = null) {
    try {
      const d = date || new Date();
      const data = await this.getPrayerTimes(d);
      const timings = data.timings;

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const prayers = [
        { name: this.prayerNames.Fajr, key: 'Fajr' },
        { name: this.prayerNames.Sunrise, key: 'Sunrise' },
        { name: this.prayerNames.Dhuhr, key: 'Dhuhr' },
        { name: this.prayerNames.Asr, key: 'Asr' },
        { name: this.prayerNames.Maghrib, key: 'Maghrib' },
        { name: this.prayerNames.Isha, key: 'Isha' }
      ];

      for (const prayer of prayers) {
        const time = timings[prayer.key];
        if (!time) continue;
        const [h, m] = time.split(':').map(Number);
        const prayerMinutes = h * 60 + m;

        if (prayerMinutes > currentMinutes) {
          return {
            name: prayer.name,
            key: prayer.key,
            time,
            minutesLeft: prayerMinutes - currentMinutes,
            isTomorrow: false
          };
        }
      }

      const fajrTime = timings.Fajr;
      const [fh, fm] = fajrTime.split(':').map(Number);
      const fajrMinutes = fh * 60 + fm;

      return {
        name: this.prayerNames.Fajr,
        key: 'Fajr',
        time: fajrTime,
        minutesLeft: (24 * 60 - currentMinutes) + fajrMinutes,
        isTomorrow: true
      };
    } catch (error) {
      console.error('Error getting next prayer:', error);
      return { name: '--', key: 'Fajr', time: '--:--', minutesLeft: 0, isTomorrow: false };
    }
  },

  getPrayerWindow(prayerKey) {
    const prayerOrder = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const idx = prayerOrder.indexOf(prayerKey);
    if (idx === -1) return null;
    if (idx === prayerOrder.length - 1) return 'حتى الفجر';
    return `حتى ${this.prayerNames[prayerOrder[idx + 1]]}`;
  },

  formatPrayerTime(time24) {
    if (!time24 || time24 === '--:--') return '--:--';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'م' : 'ص';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  },

  startCountdown() {
    try {
      if (this.countdownInterval) clearInterval(this.countdownInterval);

      const update = async () => {
        const next = await this.getNextPrayer();
        const el = document.getElementById('nextPrayerTime');
        if (el) {
          const mins = next.minutesLeft;
          const hours = Math.floor(mins / 60);
          const minutes = mins % 60;
          const timeStr = hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}` : `${minutes}`;
          const suffix = hours > 0 ? 'ساعة' : 'دقيقة';
          el.textContent = `${next.name} — ${timeStr} ${suffix}`;
        }

        await this.checkNotifications(next);
      };

      update();
      this.countdownInterval = setInterval(update, 30000);
    } catch (error) {
      console.error('Error starting countdown:', error);
    }
  },

  async requestNotificationPermission() {
    try {
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') {
        this.notificationsEnabled = true;
        return true;
      }
      if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        this.notificationsEnabled = perm === 'granted';
      }
      return this.notificationsEnabled;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  },

  async checkNotifications(next) {
    try {
      if (!this.notificationsEnabled) return;

      const mins = next.minutesLeft;
      const prayerId = `${next.key}_${new Date().toDateString()}`;

      if (this.lastNotifiedPrayer === prayerId) return;

      if (mins === 15) {
        this.sendNotification(
          `⏰ تبقى 15 دقيقة على ${next.name}`,
          'استعد للصلاة'
        );
      }

      if (mins <= 1) {
        this.sendNotification(
          `🕌 حان وقت صلاة ${next.name}`,
          'الله يبارك في يومك'
        );
        this.lastNotifiedPrayer = prayerId;
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  },

  sendNotification(title, body) {
    try {
      if (!this.notificationsEnabled) return;
      if (Notification.permission !== 'granted') return;

      new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌙</text></svg>',
        tag: title,
        silent: false
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  },

  toDateKey(date) {
    return date.toISOString().split('T')[0];
  }
};

if (typeof window !== 'undefined') {
  window.PrayerManager = PrayerManager;
}

/* ─────────────────────────────────────────────────────
   Backward compatibility — functions used by app.js & dashboard.js
   ───────────────────────────────────────────────────── */

async function getPrayerSettings() {
  try {
    const [city, method] = await Promise.all([
      getSetting('city'),
      getSetting('prayerMethod')
    ]);
    return { city: city || 'Cairo', method: method || 'Egypt', country: 'Egypt' };
  } catch (error) {
    console.error('Error getting prayer settings:', error);
    return { city: 'Cairo', method: 'Egypt', country: 'Egypt' };
  }
}

async function updatePrayerSettings(settings) {
  try {
    if (settings.city) await setSetting('city', settings.city);
    if (settings.method) await setSetting('prayerMethod', settings.method);
  } catch (error) {
    console.error('Error updating prayer settings:', error);
  }
}

async function setSetting(key, value) {
  try {
    const existing = await db.settings.get(key);
    if (existing) {
      return await db.settings.update(key, { value });
    }
    return await db.settings.add({ key, value });
  } catch (error) {
    console.error('Error setting:', error);
  }
}

async function getSetting(key) {
  try {
    const result = await db.settings.get(key);
    return result ? result.value : null;
  } catch (error) {
    console.error('Error getting setting:', error);
    return null;
  }
}

function getCurrentPrayer(timings) {
  return PrayerManager.getCurrentPrayer ? PrayerManager.getCurrentPrayer(timings) :
    { name: '--', key: 'Fajr', time: '--:--' };
}

PrayerManager.getCurrentPrayer = function(timings) {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayers = [
      { name: this.prayerNames.Fajr, key: 'Fajr' },
      { name: this.prayerNames.Sunrise, key: 'Sunrise' },
      { name: this.prayerNames.Dhuhr, key: 'Dhuhr' },
      { name: this.prayerNames.Asr, key: 'Asr' },
      { name: this.prayerNames.Maghrib, key: 'Maghrib' },
      { name: this.prayerNames.Isha, key: 'Isha' }
    ];

    let current = prayers[0];
    for (const prayer of prayers) {
      const time = timings?.[prayer.key];
      if (!time) continue;
      const [h, m] = time.split(':').map(Number);
      const prayerMinutes = h * 60 + m;

      if (prayerMinutes <= currentMinutes) {
        current = prayer;
      } else {
        break;
      }
    }
    return current;
  } catch (error) {
    console.error('Error getting current prayer:', error);
    return { name: '--', key: 'Fajr', time: '--:--' };
  }
};

function getNextPrayer(timings) {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayers = [
      { name: 'الفجر', key: 'Fajr', time: timings?.Fajr },
      { name: 'الشروق', key: 'Sunrise', time: timings?.Sunrise },
      { name: 'الظهر', key: 'Dhuhr', time: timings?.Dhuhr },
      { name: 'العصر', key: 'Asr', time: timings?.Asr },
      { name: 'المغرب', key: 'Maghrib', time: timings?.Maghrib },
      { name: 'العشاء', key: 'Isha', time: timings?.Isha }
    ];

    for (const prayer of prayers) {
      if (!prayer.time) continue;
      const [h, m] = prayer.time.split(':').map(Number);
      const prayerMinutes = h * 60 + m;

      if (prayerMinutes > currentMinutes) {
        const diff = prayerMinutes - currentMinutes;
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        return {
          name: prayer.name,
          time: prayer.time,
          timeRemaining: hours > 0 ? `${hours} ساعة ${minutes} دقيقة` : `${minutes} دقيقة`
        };
      }
    }

    const fajrTime = timings?.Fajr || '04:30';
    const [fh, fm] = fajrTime.split(':').map(Number);
    const fajrMinutes = fh * 60 + fm;
    const diff = (24 * 60 - currentMinutes) + fajrMinutes;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    return {
      name: 'الفجر (غداً)',
      time: fajrTime,
      timeRemaining: hours > 0 ? `${hours} ساعة ${minutes} دقيقة` : `${minutes} دقيقة`
    };
  } catch (error) {
    console.error('Error getting next prayer:', error);
    return { name: '--', time: '--:--', timeRemaining: '--:--' };
  }
}

async function refreshPrayerTimes() {
  try {
    const settings = await getPrayerSettings();
    const data = await PrayerManager.getPrayerTimes();
    await setSetting('cachedPrayerTimes', data);
    updatePrayerDisplay(data.timings);
    return data;
  } catch (error) {
    console.error('Error refreshing prayer times:', error);
    const cached = await getCachedPrayerTimes();
    updatePrayerDisplay(cached.timings);
    return cached;
  }
}

async function getCachedPrayerTimes() {
  try {
    const cached = await getSetting('cachedPrayerTimes');
    if (cached) return cached;
    return PrayerManager.getFallbackTimes();
  } catch (error) {
    console.error('Error getting cached prayer times:', error);
    return PrayerManager.getFallbackTimes();
  }
}

function updatePrayerDisplay(timings) {
  try {
    const nextPrayer = getNextPrayer(timings);
    const nextPrayerEl = document.getElementById('nextPrayerTime');
    if (nextPrayerEl) {
      nextPrayerEl.textContent = `${nextPrayer.name} - ${nextPrayer.time}`;
    }
  } catch (error) {
    console.error('Error updating prayer display:', error);
  }
}

async function getHijriDate(date = null) {
  try {
    const d = date || new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();

    const url = `https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error('Failed to fetch Hijri date');

    const data = await response.json();

    if (data.code === 200 && data.data) {
      const hijri = data.data.hijri;
      return {
        day: hijri.day,
        month: hijri.month.ar,
        year: hijri.year,
        full: `${hijri.day} ${hijri.month.ar} ${hijri.year} هـ`
      };
    }

    throw new Error('Invalid response');
  } catch (error) {
    console.error('Error getting Hijri date:', error);
    return toHijri(date);
  }
}

function updateDateDisplay(hijriDate) {
  try {
    const hijriEl = document.getElementById('hijriDate');
    const gregEl = document.getElementById('gregorianDate');

    const now = new Date();
    const gregorian = now.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (hijriEl && hijriDate) {
      hijriEl.textContent = hijriDate.full;
    }

    if (gregEl) {
      gregEl.textContent = gregorian;
    }
  } catch (error) {
    console.error('Error updating date display:', error);
  }
}
