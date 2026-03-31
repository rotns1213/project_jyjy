/* ===== STATE ===== */
let userMedications = JSON.parse(localStorage.getItem('yak_meds') || '[]');
let notifications = JSON.parse(localStorage.getItem('yak_notifs') || '[]');
let lastMealTime = localStorage.getItem('yak_last_meal') || null;
let selectedImageFile = null;
let lastScanResult = null;
let currentScreen = 'splash';

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  setGreeting();
  renderTodaySchedule();
  renderMedicationsList();
  renderNotifications();
  updateMealCard();
  updateNotifBadge();

  // Auto-leave splash
  setTimeout(() => {
    showScreen('home', true);
  }, 2200);
});

/* ===== SCREEN NAVIGATION ===== */
function showScreen(name, fromSplash = false) {
  const prev = document.querySelector('.screen.active');
  const next = document.getElementById(`screen-${name}`);
  if (!next || next === prev) return;

  if (prev) {
    prev.classList.add('slide-out');
    setTimeout(() => {
      prev.classList.remove('active', 'slide-out');
    }, 280);
  }

  next.classList.add('active');
  currentScreen = name;

  // Refresh dynamic content on screen entry
  if (name === 'home') {
    renderTodaySchedule();
    updateMealCard();
    updateNotifBadge();
  } else if (name === 'medications') {
    renderMedicationsList();
  } else if (name === 'notifications') {
    renderNotifications();
  }
}

/* ===== GREETING ===== */
function setGreeting() {
  const h = new Date().getHours();
  const greets = [
    [5, 11, '좋은 아침이에요! ☀️'],
    [11, 14, '점심 드셨나요? 🍱'],
    [14, 18, '오후도 건강하게! 😊'],
    [18, 21, '저녁 잘 드셨나요? 🌙'],
    [21, 24, '오늘 복약 잘 하셨나요? 🌟'],
    [0, 5, '늦은 밤 건강 챙기세요 🌙'],
  ];
  const g = greets.find(([s, e]) => h >= s && h < e);
  if (g) document.getElementById('greeting-text').textContent = g[2];
}

/* ===== IMAGE SELECT ===== */
function handleImageSelect(input) {
  const file = input.files[0];
  if (!file) return;

  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const vfPlaceholder = document.getElementById('vf-placeholder');
    const previewImg = document.getElementById('preview-img');
    const submitBtn = document.getElementById('scan-submit-btn');

    vfPlaceholder.classList.add('hidden');
    previewImg.src = e.target.result;
    previewImg.classList.remove('hidden');
    submitBtn.disabled = false;

    // Add scan line animation
    const viewfinder = document.getElementById('viewfinder');
    let existing = viewfinder.querySelector('.scan-line');
    if (!existing) {
      const line = document.createElement('div');
      line.className = 'scan-line';
      line.style.animation = 'none';
      viewfinder.appendChild(line);
    }
  };
  reader.readAsDataURL(file);
}

/* ===== SCAN ===== */
function startScan() {
  if (!selectedImageFile) return;
  showScreen('processing');
  animateProcessingSteps();

  const formData = new FormData();
  formData.append('image', selectedImageFile);

  fetch('/api/scan', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        lastScanResult = data;
        renderResultScreen(data);
        setTimeout(() => showScreen('result'), 200);
      }
    })
    .catch(() => {
      showToast('오류가 발생했어요. 다시 시도해주세요.');
      showScreen('scan');
    });
}

function animateProcessingSteps() {
  const steps = ['step1', 'step2', 'step3'];
  const messages = [
    '글자를 인식하고 있어요...',
    '식품안전의약처에서 약 정보를 찾는 중...',
    '쉬운 말로 정리하고 있어요...'
  ];

  steps.forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove('active', 'done');
  });

  let current = 0;
  document.getElementById('step1').classList.add('active');
  document.getElementById('processing-status').textContent = messages[0];

  const interval = setInterval(() => {
    const stepEl = document.getElementById(steps[current]);
    stepEl.classList.remove('active');
    stepEl.classList.add('done');

    current++;
    if (current < steps.length) {
      document.getElementById(steps[current]).classList.add('active');
      document.getElementById('processing-status').textContent = messages[current];
    } else {
      clearInterval(interval);
    }
  }, 750);
}

/* ===== RENDER RESULT ===== */
function renderResultScreen(data) {
  const body = document.getElementById('result-body');
  let html = '';

  // OCR Raw text card
  html += `
    <div class="result-header-card">
      <div class="ocr-raw-label">인식된 텍스트 (OCR)</div>
      <div class="ocr-raw-text">${escapeHtml(data.raw_ocr || '')}</div>
    </div>`;

  // Prescription badge
  if (data.scan_type === 'prescription') {
    html += `<div class="result-prescription-badge">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8" fill="none" stroke="white" stroke-width="2"/></svg>
      처방전 스캔
    </div>`;
  }

  if (data.prescription_days) {
    html += `<div class="prescription-days-badge">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      총 ${data.prescription_days}일분 처방
    </div>`;
  }

  // Each medication
  (data.medications || []).forEach(med => {
    const timingIcon = med.timing_type === 'before_meal' ? '🕐' :
                       med.timing_type === 'after_meal' ? '🍽️' : '⏰';
    const pillEmoji = getPillEmoji(med.category);

    html += `
      <div class="med-result-card">
        <div class="med-result-header">
          <div class="med-pill-icon" style="background-color:${med.pill_color}22;">
            <span style="font-size:24px;">${pillEmoji}</span>
          </div>
          <div class="med-result-names">
            <div class="med-result-name">${med.easy_name}</div>
            <div class="med-result-generic">${med.generic_name}</div>
          </div>
          <div class="med-category-badge">${med.category}</div>
        </div>
        <div class="med-result-body">
          <div class="info-block">
            <div class="info-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              이 약은 무엇인가요?
            </div>
            <div class="info-content highlight">${med.easy_description}</div>
          </div>

          <div class="info-block">
            <div class="info-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              언제 어떻게 먹나요?
            </div>
            <div class="timing-pill">
              ${timingIcon} ${med.timing_label}
            </div>
            <div class="info-content">${med.how_to_take}</div>
          </div>

          <div class="info-block">
            <div class="info-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              주의할 점
            </div>
            <div class="warning-list">
              ${med.warnings.map(w => `
                <div class="warning-item">
                  <div class="warning-dot"></div>
                  <span>${w}</span>
                </div>`).join('')}
            </div>
          </div>

          <div class="info-block">
            <div class="info-label">보관 방법</div>
            <div class="info-content">${med.storage}</div>
          </div>
        </div>
      </div>`;
  });

  // Add to my medications button
  const alreadyAdded = (data.medications || []).every(m =>
    userMedications.some(um => um.id === m.id));

  html += `
    <button class="btn-primary result-add-btn" id="result-add-btn"
      onclick="addMedicationsFromResult()"
      ${alreadyAdded ? 'disabled style="opacity:0.5"' : ''}>
      ${alreadyAdded
        ? '✓ 이미 내 약 목록에 있어요'
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>내 약 목록에 추가하기`}
    </button>`;

  body.innerHTML = html;
  body.scrollTop = 0;
}

function getPillEmoji(category) {
  if (!category) return '💊';
  if (category.includes('항생')) return '🔵';
  if (category.includes('진통') || category.includes('해열')) return '🔴';
  if (category.includes('위산') || category.includes('위장')) return '🟣';
  if (category.includes('알레르기') || category.includes('히스타민')) return '🔵';
  if (category.includes('비타민')) return '🟡';
  return '💊';
}

function addMedicationsFromResult() {
  if (!lastScanResult) return;
  const newMeds = (lastScanResult.medications || []).filter(m =>
    !userMedications.some(um => um.id === m.id));

  userMedications.push(...newMeds);
  saveData();
  renderTodaySchedule();
  renderMedicationsList();

  const btn = document.getElementById('result-add-btn');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.textContent = '✓ 내 약 목록에 추가됐어요';
  }

  showToast(`${newMeds.length}가지 약이 추가됐어요!`);
  updateNotifBadge();
}

/* ===== MEAL ===== */
function recordMeal() {
  lastMealTime = new Date().toISOString();
  localStorage.setItem('yak_last_meal', lastMealTime);
  updateMealCard();

  const mealDate = new Date(lastMealTime);
  const timeStr = mealDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
  document.getElementById('meal-recorded-time').textContent = `${timeStr}에 식사 기록됨`;

  if (userMedications.length === 0) {
    document.getElementById('no-meds-warning').classList.remove('hidden');
    document.getElementById('meal-notif-list').innerHTML = '';
  } else {
    document.getElementById('no-meds-warning').classList.add('hidden');

    fetch('/api/meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meal_time: lastMealTime,
        medications: userMedications.filter(m => m.active !== false)
      })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        renderMealNotifications(data.notifications);
        notifications = data.notifications;
        saveData();
        renderNotifications();
        updateNotifBadge();
        scheduleBrowserNotifications(data.notifications);
      }
    })
    .catch(() => renderMealNotifications(calcNotifsFallback()));
  }

  document.getElementById('overlay-meal').classList.remove('hidden');
}

function renderMealNotifications(notifs) {
  const list = document.getElementById('meal-notif-list');
  if (!notifs || notifs.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-light);font-size:13px;padding:12px 0;">복용 중인 약이 없어요</p>';
    return;
  }

  list.innerHTML = notifs.map(n => {
    const t = new Date(n.notify_time);
    const timeStr = t.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
    const isNow = n.is_now;
    return `
      <div class="meal-notif-item ${isNow ? 'now' : ''}">
        <div class="meal-notif-time-badge">${isNow ? '지금 바로' : timeStr}</div>
        <div class="meal-notif-info">
          <div class="meal-notif-name">${n.medication_name}</div>
          <div class="meal-notif-label">${n.timing_label || ''}</div>
        </div>
      </div>`;
  }).join('');
}

function calcNotifsFallback() {
  const mealDate = new Date(lastMealTime);
  return userMedications.filter(m => m.active !== false).map(med => {
    const t = new Date(mealDate);
    const mins = med.timing_type === 'before_meal' ? 360 - (med.timing_minutes || 30)
                 : (med.timing_minutes || 0);
    t.setMinutes(t.getMinutes() + mins);
    return {
      medication_id: med.id,
      medication_name: med.easy_name || med.name,
      timing_label: med.timing_label,
      notify_time: t.toISOString(),
      is_now: t <= new Date(Date.now() + 60000)
    };
  });
}

function confirmNotifications() {
  closeMealOverlay();
  showToast('알림이 설정됐어요 🔔');
  showScreen('notifications');
}

function closeMealOverlay() {
  document.getElementById('overlay-meal').classList.add('hidden');
}

function updateMealCard() {
  const sub = document.getElementById('meal-card-sub');
  const card = document.getElementById('meal-card');
  if (lastMealTime) {
    const t = new Date(lastMealTime);
    const timeStr = t.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
    sub.textContent = `마지막 식사: ${timeStr}`;
    card.classList.add('meal-recorded');
  } else {
    sub.textContent = '터치하면 복약 알림을 계산해드려요';
    card.classList.remove('meal-recorded');
  }
}

/* ===== BROWSER NOTIFICATIONS ===== */
function scheduleBrowserNotifications(notifs) {
  if (!('Notification' in window)) return;

  const schedule = () => {
    notifs.forEach(n => {
      const delay = new Date(n.notify_time) - Date.now();
      if (delay > 0 && delay < 86400000) {
        setTimeout(() => {
          new Notification('약쏘옥 복약 알림 💊', {
            body: `${n.medication_name} 복용 시간이에요!`,
            icon: '/icon.png'
          });
        }, delay);
      }
    });
  };

  if (Notification.permission === 'granted') {
    schedule();
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') schedule();
    });
  }
}

/* ===== RENDER TODAY SCHEDULE ===== */
function renderTodaySchedule() {
  const container = document.getElementById('today-schedule');
  if (!container) return;

  const activeMeds = userMedications.filter(m => m.active !== false);
  if (activeMeds.length === 0) {
    container.innerHTML = `
      <div class="empty-schedule">
        <div class="empty-icon">💊</div>
        <p>아직 등록된 약이 없어요</p>
        <p class="empty-sub">약을 스캔해서 복약 일정을 만들어 보세요!</p>
      </div>`;
    return;
  }

  const now = new Date();

  container.innerHTML = activeMeds.map(med => {
    const matchingNotif = notifications.find(n => n.medication_id === med.id);
    let badge = '';
    let badgeClass = '';

    if (matchingNotif) {
      const notifTime = new Date(matchingNotif.notify_time);
      const diffMin = Math.round((notifTime - now) / 60000);
      if (diffMin <= 0) {
        badge = '완료';
        badgeClass = 'badge-done';
      } else if (diffMin <= 30) {
        badge = `${diffMin}분 후`;
        badgeClass = 'badge-soon';
      } else {
        badge = notifTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
        badgeClass = 'badge-later';
      }
    } else {
      badge = med.timing_label || '설정 필요';
      badgeClass = 'badge-later';
    }

    return `
      <div class="schedule-item">
        <div class="schedule-pill-dot" style="background-color:${med.pill_color || '#5acd90'}"></div>
        <div class="schedule-info">
          <div class="schedule-name">${med.easy_name || med.name}</div>
          <div class="schedule-timing">${med.timing_label || ''} · ${med.how_to_take || ''}</div>
        </div>
        <div class="schedule-badge ${badgeClass}">${badge}</div>
      </div>`;
  }).join('');
}

/* ===== RENDER MEDICATIONS LIST ===== */
function renderMedicationsList() {
  const body = document.getElementById('meds-body');
  if (!body) return;

  if (userMedications.length === 0) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-big-icon">💊</div>
        <h3>아직 약이 없어요</h3>
        <p>처방전이나 알약을 스캔하면<br>여기에 자동으로 추가돼요</p>
        <button class="btn-primary mt-16" onclick="showScreen('scan')">약 스캔하러 가기</button>
      </div>`;
    return;
  }

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${userMedications.map(med => `
        <div class="med-list-card">
          <div class="med-list-header">
            <div class="med-list-dot" style="background-color:${med.pill_color || '#5acd90'};border-radius:4px;"></div>
            <div class="med-list-info">
              <div class="med-list-name">${med.easy_name || med.name}</div>
              <div class="med-list-timing">${med.name} · ${med.timing_label || ''}</div>
            </div>
            <div class="med-list-actions">
              <div class="med-toggle ${med.active !== false ? 'on' : ''}"
                onclick="toggleMed('${med.id}')">
                <div class="med-toggle-thumb"></div>
              </div>
              <button class="med-del-btn" onclick="deleteMed('${med.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </div>
          </div>
          <div style="padding:0 16px 14px;">
            <div style="font-size:12px;color:var(--text-light);line-height:1.6;">
              ${med.easy_description || ''}
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}

function toggleMed(id) {
  const med = userMedications.find(m => m.id === id);
  if (med) {
    med.active = med.active === false ? true : false;
    saveData();
    renderMedicationsList();
    renderTodaySchedule();
  }
}

function deleteMed(id) {
  userMedications = userMedications.filter(m => m.id !== id);
  saveData();
  renderMedicationsList();
  renderTodaySchedule();
  showToast('약이 삭제됐어요');
}

/* ===== RENDER NOTIFICATIONS ===== */
function renderNotifications() {
  const body = document.getElementById('notif-body');
  if (!body) return;

  if (notifications.length === 0 || !lastMealTime) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-big-icon">🔔</div>
        <h3>설정된 알림이 없어요</h3>
        <p>식사 후 '방금 식사했어요' 버튼을<br>누르면 복약 알림을 받을 수 있어요</p>
        <button class="btn-primary mt-16" onclick="showScreen('home')">홈으로 가기</button>
      </div>`;
    return;
  }

  const mealDate = new Date(lastMealTime);
  const mealTimeStr = mealDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
  const mealDateStr = mealDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  const timelineItems = notifications.map(n => {
    const t = new Date(n.notify_time);
    const timeStr = t.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
    const isPast = t < new Date();
    return `
      <div class="notif-timeline-item">
        <div class="notif-time" style="${isPast ? 'color:var(--text-light);' : ''}">${timeStr}</div>
        <div class="notif-med-name" style="${isPast ? 'text-decoration:line-through;color:var(--text-light);' : ''}">
          ${n.medication_name}
        </div>
      </div>`;
  }).join('');

  body.innerHTML = `
    <div class="notif-card">
      <div class="notif-card-header">
        <div class="notif-meal-time">
          🍽️ ${mealDateStr} ${mealTimeStr} 식사
          <span class="notif-meal-badge">기록됨</span>
        </div>
      </div>
      <div class="notif-timeline">${timelineItems}</div>
    </div>
    <button class="btn-outline" onclick="recordMeal()">
      새 식사 기록하기
    </button>`;
}

function updateNotifBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  const hasActive = notifications.some(n => new Date(n.notify_time) > new Date());
  badge.classList.toggle('hidden', !hasActive);
}

/* ===== UTILS ===== */
function saveData() {
  localStorage.setItem('yak_meds', JSON.stringify(userMedications));
  localStorage.setItem('yak_notifs', JSON.stringify(notifications));
}

function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add('hidden'), duration);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
