'use strict';

/* ═══════════════════════════════════════
   GROQ API — الطبقة الأساسية
   ═══════════════════════════════════════ */

async function callGroq(userMessage, systemPrompt = '', conversationHistory = []) {
  const apiKey = await getSetting('groqApiKey');

  if (!apiKey || !apiKey.trim()) {
    throw new Error('لم يتم إضافة Groq API Key بعد — اذهب للإعدادات وأضفه');
  }

  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
      max_tokens: 1500,
      temperature: 0.7
    })
  });

  if (response.status === 401) throw new Error('API Key غير صحيح — تحقق منه في الإعدادات');
  if (response.status === 429) throw new Error('تجاوزت حد الطلبات — انتظر دقيقة وأعد المحاولة');
  if (response.status === 503) throw new Error('خدمة Groq غير متاحة مؤقتاً');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `خطأ في Groq: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('لم يصل رد من المساعد');
  return content;
}

/* ═══════════════════════════════════════
   ميزة ١ — تقسيم المهمة
   ═══════════════════════════════════════ */

async function splitTask(taskId) {
  const task = await db.tasks.get(Number(taskId));
  if (!task) { showToast('المهمة غير موجودة', 'error'); return; }

  const btn = document.querySelector(`[data-split-task="${taskId}"]`);
  const originalHTML = btn?.innerHTML;
  if (btn) { btn.innerHTML = '⏳ جاري التقسيم...'; btn.disabled = true; }

  showToast('🤖 جاري تقسيم المهمة...', 'info');

  try {
    const prompt = `قسّم هذه المهمة إلى خطوات عملية صغيرة:
المهمة: "${task.title}"
${task.description ? `التفاصيل: "${task.description}"` : ''}

أعطني قائمة من 3 إلى 6 خطوات عملية محددة.
كل خطوة في سطر منفصل وتبدأ بـ "- "
لا تكتب مقدمة أو خاتمة، فقط الخطوات.`;

    const result = await callGroq(prompt, 'أنت مساعد إنتاجية محترف. تجيب بالعربية فقط. تعطي خطوات عملية ومحددة.');

    const steps = result
      .split('\n')
      .map(l => l.replace(/^[-•*\d.\s]+/, '').trim())
      .filter(l => l.length > 3);

    if (steps.length === 0) throw new Error('لم يتم استخراج خطوات من الرد');

    let addedCount = 0;
    for (const step of steps) {
      await addTask({
        title: step,
        priority: task.priority || 'medium',
        status: 'todo',
        dueDate: task.dueDate || null,
        description: `خطوة من: ${task.title}`
      });
      addedCount++;
    }

    showToast(`✅ تم تقسيم المهمة إلى ${addedCount} خطوات`, 'success');
    if (typeof Tasks !== 'undefined' && Tasks.renderTaskList) {
      await Tasks.renderTaskList();
    }

  } catch (error) {
    console.error('splitTask error:', error);

    if (error.message.includes('API Key') || error.message.includes('صحيح')) {
      showToast('❌ ' + error.message, 'error');
      setTimeout(() => { if (confirm('هل تريد فتح الإعدادات الآن؟')) location.hash = 'settings'; }, 1500);
    } else if (error.message.includes('حد الطلبات') || error.message.includes('429')) {
      showToast('⏳ ' + error.message, 'warning');
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      showToast('❌ تحقق من اتصال الإنترنت', 'error');
    } else {
      showToast('❌ خطأ: ' + error.message, 'error');
    }
  } finally {
    if (btn) { btn.innerHTML = originalHTML || '⚡ تقسيم'; btn.disabled = false; }
  }
}

/* ═══════════════════════════════════════
   ميزة ٢ — ترتيب المهام
   ═══════════════════════════════════════ */

async function sortTasksWithAI() {
  showToast('🤖 جاري تحليل مهامك...', 'info');

  try {
    const tasks = await db.tasks.toArray();
    const pending = tasks.filter(t => t.status !== 'done');

    if (pending.length === 0) {
      showToast('لا توجد مهام لترتيبها', 'info');
      return;
    }

    const tasksList = pending.map((t, i) =>
      `${i+1}. "${t.title}" — أولوية: ${
        {high:'عالية', medium:'متوسطة', low:'منخفضة'}[t.priority] || 'متوسطة'
      }${t.dueDate ? ` — موعد: ${t.dueDate}` : ''}`
    ).join('\n');

    const prompt = `مهامي الحالية:
${tasksList}

الوقت الحالي: ${new Date().toLocaleTimeString('ar-EG')}

رتب هذه المهام حسب الأولوية والوقت المتاح.
اكتب رقم كل مهمة بالترتيب المقترح مع سبب موجز.`;

    const result = await callGroq(prompt, 'أنت مساعد إنتاجية إسلامي. ترتب المهام مراعياً أوقات الصلاة. تجيب بالعربية.');
    showAIResultModal('🎯 ترتيب مهامك المقترح', result);

  } catch (error) {
    handleAIError(error, 'ترتيب المهام');
  }
}

/* ═══════════════════════════════════════
   ميزة ٣ — اقتراح النية
   ═══════════════════════════════════════ */

async function suggestNiyah(taskTitle, inputId) {
  const btn = event?.target;
  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

  try {
    const result = await callGroq(
      `اقترح نية شرعية مناسبة لهذه المهمة: "${taskTitle}"
       النية تكون جملة واحدة قصيرة تبدأ بـ "أنوي..."
       مثال: "أنوي إتقان عملي لأؤدي حق من يعتمد عليّ وأرزق أهلي حلالاً"`,
      'أنت عالم مسلم. تقترح نيات شرعية صحيحة. جملة واحدة فقط.'
    );

    const input = document.getElementById(inputId);
    if (input) input.value = result.trim();

  } catch (error) {
    handleAIError(error, 'اقتراح النية');
  } finally {
    if (btn) { btn.textContent = '✨ اقترح نية'; btn.disabled = false; }
  }
}

/* ═══════════════════════════════════════
   ميزة ٤ — المحادثة الحرة
   ═══════════════════════════════════════ */

let chatHistory = [];
const MAX_CHAT_HISTORY = 20;

const AI_SYSTEM_PROMPT = `أنت مساعد شخصي ذكي لمسلم مصري اسمه بلال يستخدم نظام إدارة الحياة "حياة".
مهمتك مساعدته في تنظيم يومه بما يتوافق مع القيم الإسلامية.
تحدث بالعربية دائماً، بأسلوب ودي ومحفز ومختصر.
راعِ أوقات الصلاة في كل توصية.
أحياناً ادعُ له بالتوفيق.`;

async function sendChatMessage(userMessage) {
  if (!userMessage?.trim()) return;

  appendChatBubble(userMessage, 'user');

  chatHistory.push({ role: 'user', content: userMessage });
  if (chatHistory.length > MAX_CHAT_HISTORY) chatHistory.shift();

  const loadingId = 'loading-' + Date.now();
  appendLoadingBubble(loadingId);

  try {
    const reply = await callGroq('', AI_SYSTEM_PROMPT, chatHistory);

    document.getElementById(loadingId)?.remove();
    appendChatBubble(reply, 'assistant');

    chatHistory.push({ role: 'assistant', content: reply });

  } catch (error) {
    document.getElementById(loadingId)?.remove();
    const msg = error.message.includes('API Key')
      ? '❌ أضف Groq API Key من الإعدادات أولاً'
      : '❌ ' + error.message;
    appendChatBubble(msg, 'error');
  }
}

function appendChatBubble(text, role) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const isUser = role === 'user';
  const isError = role === 'error';

  const bubble = document.createElement('div');
  bubble.style.cssText = `display:flex;justify-content:${isUser ? 'flex-start' : 'flex-end'};margin-bottom:.75rem;`;

  bubble.innerHTML = `
    <div style="
      max-width:75%;
      padding:.75rem 1rem;
      border-radius:${isUser ? '16px 16px 16px 4px' : '16px 16px 4px 16px'};
      background:${isUser ? '#1a5276' : isError ? '#f8514920' : '#21262d'};
      border:1px solid ${isUser ? '#2471a3' : isError ? '#f85149' : '#30363d'};
      color:${isError ? '#f85149' : '#e6edf3'};
      font-size:.9rem;
      line-height:1.6;
      white-space:pre-wrap;
      word-break:break-word;
    ">${sanitizeHTML(text)}</div>`;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function appendLoadingBubble(id) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.id = id;
  bubble.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:.75rem;';
  bubble.innerHTML = `
    <div style="
      padding:.75rem 1.5rem;
      border-radius:16px 16px 4px 16px;
      background:#21262d;
      border:1px solid #30363d;
      color:#8b949e;
      font-size:.9rem;
    ">
      <span style="animation:pulse 1s infinite;">● </span>
      <span style="animation:pulse 1s .3s infinite;">● </span>
      <span style="animation:pulse 1s .6s infinite;">●</span>
    </div>`;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

/* ═══════════════════════════════════════
   ميزة ٥ — الخطة اليومية الذكية
   ═══════════════════════════════════════ */

async function generateDailyPlan() {
  showToast('📅 جاري إعداد خطتك اليومية...', 'info');

  try {
    const tasks = (await db.tasks.toArray()).filter(t => t.status !== 'done');

    const tasksText = tasks.length > 0
      ? tasks.map(t => `- ${t.title} (${{
          high:'عالية', medium:'متوسطة', low:'منخفضة'
        }[t.priority]})`).join('\n')
      : 'لا توجد مهام مضافة حتى الآن';

    const prompt = `اعمل لي خطة يوم كاملة الآن.

الوقت الحالي: ${new Date().toLocaleTimeString('ar-EG')}
التاريخ: ${new Date().toLocaleDateString('ar-EG', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}

مهامي:
${tasksText}

اعمل جدول يومي مرتب بين أوقات الصلاة.
الشكل المطلوب:
🌅 بعد الفجر (HH:MM — HH:MM)
  • [مهمة أو نشاط]

وهكذا لكل الفترات حتى العشاء.
أضف نصيحة قصيرة في النهاية.`;

    const plan = await callGroq(prompt, AI_SYSTEM_PROMPT);
    showAIResultModal('📅 خطتك اليومية', plan);

  } catch (error) {
    handleAIError(error, 'الخطة اليومية');
  }
}

/* ═══════════════════════════════════════
   Helper Functions
   ═══════════════════════════════════════ */

function handleAIError(error, featureName) {
  console.error(`AI Error (${featureName}):`, error);

  if (error.message.includes('API Key') || error.message.includes('صحيح')) {
    showToast(`❸ ${featureName}: أضف Groq API Key من الإعدادات`, 'error');
    setTimeout(() => {
      if (confirm('هل تريد فتح الإعدادات الآن لإضافة API Key؟')) {
        location.hash = 'settings';
      }
    }, 500);
  } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
    showToast(`❌ ${featureName}: تحقق من اتصال الإنترنت`, 'error');
  } else if (error.message.includes('حد الطلبات') || error.message.includes('429')) {
    showToast(`⏳ ${featureName}: انتظر دقيقة وأعد المحاولة`, 'warning');
  } else {
    showToast(`❌ ${featureName}: ${error.message}`, 'error');
  }
}

function showAIResultModal(title, content) {
  document.getElementById('ai-result-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'ai-result-modal';
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';

  modal.innerHTML = `
    <div style="
      background:#161b22;
      border:1px solid #30363d;
      border-radius:16px;
      width:100%;max-width:600px;max-height:80vh;
      overflow:hidden;display:flex;flex-direction:column;
      box-shadow:0 20px 60px rgba(0,0,0,.6);
    " onclick="event.stopPropagation()">

      <div style="display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid #30363d;">
        <h3 style="color:#f0f6fc;margin:0;font-size:1.1rem;">${title}</h3>
        <button onclick="document.getElementById('ai-result-modal').remove()"
          style="background:transparent;border:none;color:#8b949e;font-size:1.2rem;cursor:pointer;padding:.25rem;">✕</button>
      </div>

      <div style="padding:1.5rem;overflow-y:auto;color:#cdd9e5;line-height:1.8;white-space:pre-wrap;font-size:.95rem;">
${sanitizeHTML(content)}
      </div>

      <div style="padding:1rem 1.5rem;border-top:1px solid #30363d;display:flex;justify-content:flex-end;gap:.75rem;">
        <button onclick="navigator.clipboard.writeText(${JSON.stringify(content)}).then(()=>showToast('تم النسخ ✓','success'))"
          style="background:#21262d;color:#cdd9e5;border:1px solid #30363d;padding:.5rem 1rem;border-radius:8px;cursor:pointer;font-family:${document.documentElement.style.getPropertyValue('--font-arabic') || 'Cairo, sans-serif'};">📋 نسخ</button>
        <button onclick="document.getElementById('ai-result-modal').remove()"
          style="background:#1a5276;color:white;border:none;padding:.5rem 1rem;border-radius:8px;cursor:pointer;font-family:${document.documentElement.style.getPropertyValue('--font-arabic') || 'Cairo, sans-serif'};">✓ حسناً</button>
      </div>
    </div>`;

  modal.addEventListener('click', () => modal.remove());
  document.body.appendChild(modal);
}

/* ═══════════════════════════════════════
   صفحة المساعد الذكي
   ═══════════════════════════════════════ */

const QUICK_PROMPTS = [
  { icon:'📅', label:'خطط يومي',        action: generateDailyPlan },
  { icon:'🔥', label:'حفزني',           action: () => sendChatMessage('أحتاج تحفيزاً إسلامياً لأبدأ العمل الآن') },
  { icon:'📊', label:'حلل أسبوعي',      action: () => sendChatMessage('حلل إنتاجيتي هذا الأسبوع واقترح تحسينات') },
  { icon:'🌙', label:'أذكار المساء',     action: () => sendChatMessage('ذكرني بأهم أذكار المساء مع شرح مختصر') },
  { icon:'📖', label:'اقتباس ملهم',      action: () => sendChatMessage('أعطني آية أو حديث يناسب المسلم المنتج') },
  { icon:'🎯', label:'من أين أبدأ؟',    action: () => sendChatMessage('عندي كثير من المهام ولا أعرف من أين أبدأ. ساعدني') },
];

function renderAIPage() {
  const container = document.getElementById('pageContent');
  if (!container) return;

  container.innerHTML = `
    <div class="page active" style="max-width:800px;margin:0 auto;padding:1.5rem;height:100%;">

      <div style="text-align:center;margin-bottom:1.5rem;">
        <h2 style="color:var(--text-primary);margin:0 0 .25rem;">🤖 المساعد الذكي</h2>
        <p style="color:var(--text-muted);margin:0;font-size:.9rem;">مدعوم بـ Groq AI — llama-3.3-70b</p>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem;justify-content:center;">
        ${QUICK_PROMPTS.map(p => `
          <button onclick="(${p.action.toString()})()"
            style="background:var(--surface-2);border:1px solid var(--border);color:var(--text-secondary);
                   padding:.4rem .9rem;border-radius:999px;cursor:pointer;
                   font-family:var(--font-arabic);font-size:.85rem;
                   transition:all .2s;"
            onmouseover="this.style.borderColor='#58a6ff';this.style.color='#58a6ff'"
            onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
            ${p.icon} ${p.label}
          </button>
        `).join('')}
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;" id="chat-box">

        <div id="chat-messages" style="height:400px;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.5rem;">
          <div style="text-align:center;padding:2rem;color:var(--text-muted);">
            <div style="font-size:2rem;margin-bottom:.5rem;">🤖</div>
            <p style="margin:0;">أهلاً! كيف يمكنني مساعدتك اليوم؟</p>
          </div>
        </div>

        <div style="border-top:1px solid var(--border);padding:.75rem;display:flex;gap:.5rem;align-items:flex-end;">
          <textarea id="chat-input"
            placeholder="اكتب رسالتك هنا..."
            rows="2"
            style="flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;
                   color:var(--text);padding:.65rem .9rem;font-family:var(--font-arabic);
                   font-size:.9rem;resize:none;direction:rtl;outline:none;"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();handleChatSend();}"
          ></textarea>
          <button onclick="handleChatSend()"
            style="background:var(--primary);color:white;border:none;border-radius:10px;
                   width:44px;height:44px;cursor:pointer;font-size:1.1rem;flex-shrink:0;">
            ↑
          </button>
        </div>
      </div>

    </div>`;

  chatHistory = [];
}

function handleChatSend() {
  const input = document.getElementById('chat-input');
  const msg = input?.value?.trim();
  if (!msg) return;
  input.value = '';
  input.style.height = 'auto';
  sendChatMessage(msg);
}

/* ═══════════════════════════════════════
   اختبار الـ API Key
   ═══════════════════════════════════════ */

async function testGroqConnection() {
  const btn = document.getElementById('test-groq-btn');
  if (btn) { btn.textContent = '⏳ جاري الاختبار...'; btn.disabled = true; }

  try {
    const reply = await callGroq('قل "الاتصال ناجح" فقط بدون أي كلام إضافي.', 'أجب بجملة واحدة فقط.');

    const indicator = document.getElementById('groq-status');
    if (indicator) {
      indicator.style.color = '#3fb950';
      indicator.textContent = '✅ الاتصال ناجح — ' + reply.slice(0, 50);
    }
    showToast('✅ Groq API يعمل بشكل صحيح', 'success');

  } catch (error) {
    const indicator = document.getElementById('groq-status');
    if (indicator) {
      indicator.style.color = '#f85149';
      indicator.textContent = '❌ ' + error.message;
    }
    showToast('❌ ' + error.message, 'error');
  } finally {
    if (btn) { btn.textContent = '🔍 اختبر الاتصال'; btn.disabled = false; }
  }
}

async function saveGroqKey() {
  const key = document.getElementById('groq-key-input')?.value?.trim();
  if (!key) { showToast('أدخل API Key أولاً', 'error'); return; }
  if (!key.startsWith('gsk_')) { showToast('المفتاح يجب أن يبدأ بـ gsk_', 'error'); return; }
  await setSetting('groqApiKey', key);
  showToast('✅ تم حفظ المفتاح', 'success');
  await testGroqConnection();
}

function toggleGroqKeyVisibility() {
  const input = document.getElementById('groq-key-input');
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}
