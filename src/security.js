import { PREFIX } from './api.js';

export const CANARY_KEY = `${PREFIX}canary`;

const INCIDENTS_KEY = `${PREFIX}incidents`;
let incidents = [];

function renderIncidents() {
  const list = document.querySelector('#incident-list');
  list.replaceChildren();

  for (const incident of incidents) {
    const item = document.createElement('li');
    const time = new Date(incident.time).toLocaleString('ru-RU');

    item.textContent =
      `${time} — ${incident.type}: ${incident.reason}`;

    list.append(item);
  }

  document.querySelector('#incident-count').textContent =
    String(incidents.length);
  document.querySelector('#incidents-empty').hidden =
    incidents.length > 0;
}

// Временный вывод для проверки ловушек. Постоянный журнал добавляется в бонусе.
export function reportIncident(type, reason) {
  incidents.unshift({
    time: new Date().toISOString(),
    type,
    reason
  });

  incidents = incidents.slice(0, 30);

  try {
    localStorage.setItem(
      INCIDENTS_KEY,
      JSON.stringify(incidents)
    );
  } catch {
  }

  renderIncidents();
}

let refreshTimes = [];

// События: startup, refresh, submit, decoy. Условия ловушек добавьте здесь.
export function checkActivity(action, details = {}) {
  if (action === 'refresh') {
    const now = Date.now();

    refreshTimes = refreshTimes.filter(
      time => now - time < 5000
    );

    refreshTimes.push(now);

    if (refreshTimes.length === 6) {
      reportIncident(
        'T1',
        'Шесть попыток обновить список за последние 5 секунд'
      );
    }
  }

  if (action === 'submit' && details.supportCode) {
    reportIncident(
      'T2',
      'При отправке заполнено скрытое поле supportCode'
    );
  }

  if (action === 'decoy') {
    reportIncident(
      'T3',
      'Вызвана скрытая кнопка staff-export'
    );
  }

  if (
    action === 'submit' &&
    details.topic &&
    !['html', 'javascript', 'api'].includes(details.topic)
  ) {
    reportIncident(
      'T4',
      'При отправке получено недопустимое направление'
    );
  }
  if (action === 'startup') {
    let marker = null;

    try {
      marker = JSON.parse(localStorage.getItem(CANARY_KEY));
    } catch {
    }

    if (marker?.role === 'admin') {
      try {
        localStorage.setItem(
          CANARY_KEY,
          JSON.stringify({ role: 'visitor' })
        );
      } catch {
      }

      reportIncident(
        'T5',
        'Обнаружена подмена маркера: role admin'
      );
    }

    const url = new URL(window.location.href);

    if (url.searchParams.getAll('staff').includes('1')) {
      url.searchParams.delete('staff');
      window.history.replaceState(null, '', url.href);

      reportIncident(
        'T6',
        'В адресе обнаружен параметр staff=1'
      );
    }
  }
}

// Приложение вызывает эту функцию перед отправкой и обновлением списка.
export function isRestricted() {
  return false;
}

export function initializeSecurity() {
    try {
    const saved = JSON.parse(localStorage.getItem(INCIDENTS_KEY));

    incidents = Array.isArray(saved)
      ? saved.filter(item =>
          item &&
          typeof item.time === 'string' &&
          Number.isFinite(Date.parse(item.time)) &&
          typeof item.type === 'string' &&
          typeof item.reason === 'string'
        ).slice(0, 30)
      : [];
  } catch {
    incidents = [];
  }

  renderIncidents();

  try {
    if (localStorage.getItem(CANARY_KEY) === null) {
      localStorage.setItem(CANARY_KEY, JSON.stringify({ role: 'visitor' }));
    }
  } catch { /* Бонус должен учитывать недоступное хранилище. */ }
  checkActivity('startup');
}

export function resetSecurity() {
  refreshTimes = [];
  incidents = [];
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX) && key !== `${PREFIX}applications`) localStorage.removeItem(key);
    }
    localStorage.setItem(CANARY_KEY, JSON.stringify({ role: 'visitor' }));
  } catch { /* Учебный сброс остаётся доступным без storage. */ }
  document.querySelector('#incident-list').replaceChildren();
  document.querySelector('#incident-count').textContent = '0';
  document.querySelector('#incidents-empty').hidden = false;
  document.querySelector('#security-status').textContent = 'Ограничений нет';
  document.querySelector('#restriction-detail').hidden = true;
}
