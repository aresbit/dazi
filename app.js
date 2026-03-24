const lessonTextEl = document.getElementById('lessonText');
const wpmEl = document.getElementById('wpm');
const accuracyEl = document.getElementById('accuracy');
const correctEl = document.getElementById('correct');
const wrongEl = document.getElementById('wrong');
const levelEl = document.getElementById('level');
const weakKeysEl = document.getElementById('weakKeys');
const newLessonBtn = document.getElementById('newLessonBtn');
const resetBtn = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const langSelect = document.getElementById('langSelect');
const modeSelect = document.getElementById('modeSelect');

const lessons = ['fj', 'dk', 'sl', 'a;', 'gh', 'ru', 'ei', 'wo', 'cv', 'mn', 'ty', 'bpqxz'];

const microgradSnippets = [
`#include "micrograd/nn.h"

static void run_engine_demo(void) {
    mg_value_t *a = mg_value_new(-4.0);
    mg_value_t *b = mg_value_new(2.0);
    mg_value_t *c = mg_add(a, b);
    mg_value_t *d = mg_add(mg_mul(a, b), mg_pow(b, 3.0));
    mg_zero_grad_graph(d);
    mg_backward(d);
}`,
`typedef struct {
    sp_da(mg_value_t *) weights;
    mg_value_t *bias;
    bool nonlin;
} mg_neuron_t;

typedef struct {
    sp_da(mg_layer_t) layers;
} mg_mlp_t;`,
`static void assert_close(f64 actual, f64 expected, f64 tol, const char *label) {
    if (fabs(actual - expected) > tol) {
        SP_LOG("{} expected {} but got {}", SP_FMT_CSTR(label), SP_FMT_F64(expected), SP_FMT_F64(actual));
        abort();
    }
}`
];

const i18n = {
  en: {
    subtitle: 'Typing trainer inspired by keybr-style adaptive practice.',
    langLabel: 'Language',
    modeLabel: 'Mode',
    modeAdaptive: 'Adaptive words',
    modeCode: 'Code lesson',
    wpm: 'WPM',
    acc: 'Accuracy',
    correct: 'Correct',
    wrong: 'Wrong',
    level: 'Level',
    hint: 'Type exactly. Use Tab for a new lesson.',
    weakTitle: 'Weak keys',
    heatTitle: 'Error heatmap',
    heatNote: 'Red means more mistakes on that key.',
    newLesson: 'New lesson',
    reset: 'Reset progress',
    exportCfg: 'Export config',
    importCfg: 'Import config',
    importOk: 'Config loaded.',
    importFail: 'Invalid config file.'
  },
  zh: {
    subtitle: '基于 keybr 思路的自适应打字训练。',
    langLabel: '语言',
    modeLabel: '模式',
    modeAdaptive: '自适应伪单词',
    modeCode: '代码课程',
    wpm: '速度',
    acc: '准确率',
    correct: '正确',
    wrong: '错误',
    level: '等级',
    hint: '逐字符输入。按 Tab 切换新课程。',
    weakTitle: '薄弱按键',
    heatTitle: '错误热力图',
    heatNote: '越红说明该键错误越多。',
    newLesson: '新课程',
    reset: '重置统计',
    exportCfg: '导出配置',
    importCfg: '导入配置',
    importOk: '配置已加载。',
    importFail: '配置文件无效。'
  }
};

const bigramFollowers = {
  a: 'ntrlscmdpguby', b: 'leoraaiuy', c: 'haoekiurlt', d: 'eiraou', e: 'rnsdtlcmpv',
  f: 'oieaurl', g: 'herioauln', h: 'eiaouyrt', i: 'nstrclmde', j: 'ouaei',
  k: 'eiynlaro', l: 'eiaoyldstu', m: 'eiaopybt', n: 'edgstioua', o: 'nrtuslmdcp',
  p: 'reloaihpt', q: 'u', r: 'eiaotduy', s: 'tehaionupr', t: 'hieaoruy',
  u: 'rnsltdc', v: 'eiaou', w: 'hreaio', x: 'pteia', y: 'ouea', z: 'eiaoy'
};

const state = {
  unlocked: lessons.length,
  text: '',
  index: 0,
  startTime: Date.now(),
  correct: 0,
  wrong: 0,
  missAt: new Set(),
  letterStats: Object.create(null),
  mode: 'adaptive',
  lang: 'en'
};

function t(key) {
  return i18n[state.lang][key] || key;
}

function unlockedLetters() {
  return [...new Set(lessons.slice(0, state.unlocked).join('').split(''))];
}

function scoreOf(letter) {
  const v = state.letterStats[letter];
  if (!v) return 0.75;
  const total = v.hit + v.miss;
  if (!total) return 0.75;
  return v.hit / total;
}

function weakLetters(limit = 6) {
  return unlockedLetters()
    .map((letter) => ({ letter, score: scoreOf(letter) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

function weightedPick(items) {
  const sum = items.reduce((n, x) => n + x.w, 0);
  if (!sum) return items[Math.floor(Math.random() * items.length)].v;
  let r = Math.random() * sum;
  for (const item of items) {
    r -= item.w;
    if (r <= 0) return item.v;
  }
  return items[items.length - 1].v;
}

function nextCharByBigram(prev, base, weakSet) {
  const follow = (bigramFollowers[prev] || '').split('');
  const candidates = (follow.length ? follow : base).filter((x) => base.includes(x));
  const pool = (candidates.length ? candidates : base).map((ch) => ({
    v: ch,
    w: weakSet.has(ch) ? 3.2 : 1.0
  }));
  return weightedPick(pool);
}

function makePseudoWord(base, weakSet) {
  const len = 4 + Math.floor(Math.random() * 5);
  let out = '';
  let prev = weightedPick(base.map((x) => ({ v: x, w: weakSet.has(x) ? 3 : 1 })));
  out += prev;
  for (let i = 1; i < len; i++) {
    prev = nextCharByBigram(prev, base, weakSet);
    out += prev;
  }
  return out;
}

function generateAdaptiveLesson() {
  const base = unlockedLetters();
  const weakSet = new Set(weakLetters(4).map((x) => x.letter));
  const words = [];
  for (let i = 0; i < 24; i++) words.push(makePseudoWord(base, weakSet));
  return words.join(' ');
}

function generateCodeLesson() {
  const pick = microgradSnippets[Math.floor(Math.random() * microgradSnippets.length)];
  const lines = pick.split('\n');
  const start = Math.floor(Math.random() * Math.max(1, lines.length - 7));
  return lines.slice(start, start + 8).join('\n');
}

function generateLesson() {
  state.text = state.mode === 'code' ? generateCodeLesson() : generateAdaptiveLesson();
  state.index = 0;
  state.startTime = Date.now();
  state.missAt = new Set();
  render();
}

function paintText() {
  let html = '';
  for (let i = 0; i < state.text.length; i++) {
    const raw = state.text[i];
    const ch = raw === ' ' ? '&nbsp;' : raw === '\n' ? '<br>' : raw
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    let cls = 'todo';
    if (i < state.index) cls = state.missAt.has(i) ? 'miss' : 'done';
    if (i === state.index) cls = 'now';
    html += raw === '\n' ? ch : `<span class="char ${cls}">${ch}</span>`;
  }
  lessonTextEl.innerHTML = html;
}

function updateStats() {
  const elapsedMin = Math.max((Date.now() - state.startTime) / 60000, 1 / 60000);
  const wpm = (state.correct / 5) / elapsedMin;
  const total = state.correct + state.wrong;
  const acc = total ? (state.correct / total) * 100 : 100;

  wpmEl.textContent = Math.round(wpm).toString();
  accuracyEl.textContent = `${acc.toFixed(1)}%`;
  correctEl.textContent = state.correct.toString();
  wrongEl.textContent = state.wrong.toString();
  levelEl.textContent = state.unlocked.toString();
}

function updateWeakKeys() {
  weakKeysEl.innerHTML = '';
  weakLetters(7).forEach((x) => {
    const chip = document.createElement('span');
    chip.className = 'key-chip';
    chip.textContent = `${x.letter} ${(x.score * 100).toFixed(0)}%`;
    weakKeysEl.appendChild(chip);
  });
}

function errorRateOfKey(key) {
  const s = state.letterStats[key];
  if (!s) return 0;
  const total = s.hit + s.miss;
  if (!total) return 0;
  return s.miss / total;
}

function paintKeyboard() {
  const expected = state.text[state.index];

  document.querySelectorAll('.keyboard [data-key]').forEach((el) => {
    const key = el.dataset.key;
    const er = Math.min(errorRateOfKey(key), 1);
    const alpha = er * 0.75;
    el.classList.toggle('active', !!expected && expected.toLowerCase() === key);
    el.style.background = `linear-gradient(#202534, rgba(255,80,80,${alpha}))`;
    el.style.borderColor = er > 0.35 ? '#ff6b6b' : '#3a4152';
  });
}

function renderTexts() {
  document.documentElement.lang = state.lang;
  document.getElementById('subtitle').textContent = t('subtitle');
  document.getElementById('langLabel').textContent = t('langLabel');
  document.getElementById('modeLabel').textContent = t('modeLabel');
  document.getElementById('wpmLabel').textContent = t('wpm');
  document.getElementById('accLabel').textContent = t('acc');
  document.getElementById('correctLabel').textContent = t('correct');
  document.getElementById('wrongLabel').textContent = t('wrong');
  document.getElementById('levelLabel').textContent = t('level');
  document.getElementById('hintText').innerHTML = `${t('hint').replace('Tab', '<kbd>Tab</kbd>')}`;
  document.getElementById('weakTitle').textContent = t('weakTitle');
  document.getElementById('heatTitle').textContent = t('heatTitle');
  document.getElementById('heatNote').textContent = t('heatNote');
  newLessonBtn.textContent = t('newLesson');
  resetBtn.textContent = t('reset');
  exportBtn.textContent = t('exportCfg');
  importBtn.textContent = t('importCfg');
  modeSelect.options[0].text = t('modeAdaptive');
  modeSelect.options[1].text = t('modeCode');
}

function render() {
  paintText();
  updateStats();
  updateWeakKeys();
  paintKeyboard();
  renderTexts();
}

function registerResult(ch, ok) {
  const key = ch.toLowerCase();
  if (!state.letterStats[key]) state.letterStats[key] = { hit: 0, miss: 0 };
  if (ok) state.letterStats[key].hit++;
  else state.letterStats[key].miss++;
}

function maybeLevelUp() {
  if (state.unlocked >= lessons.length) return;
  const total = state.correct + state.wrong;
  if (total < 250) return;
  const acc = state.correct / total;
  if (acc >= 0.95) state.unlocked += 1;
}

function finishLesson() {
  maybeLevelUp();
  generateLesson();
}

function exportConfig() {
  const cfg = {
    version: 2,
    lang: state.lang,
    mode: state.mode,
    unlocked: state.unlocked,
    letterStats: state.letterStats
  };
  const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dazi-config.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importConfigObj(cfg) {
  state.lang = cfg.lang === 'zh' ? 'zh' : 'en';
  state.mode = cfg.mode === 'code' ? 'code' : 'adaptive';
  state.unlocked = Number.isFinite(cfg.unlocked) ? Math.min(Math.max(1, cfg.unlocked), lessons.length) : lessons.length;
  state.letterStats = typeof cfg.letterStats === 'object' && cfg.letterStats ? cfg.letterStats : Object.create(null);
  langSelect.value = state.lang;
  modeSelect.value = state.mode;
  render();
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    generateLesson();
    return;
  }

  const expected = state.text[state.index];
  if (!expected) return;

  if (e.key === 'Enter' && expected === '\n') {
    e.preventDefault();
    state.correct++;
    state.index++;
    if (state.index >= state.text.length) return finishLesson();
    return render();
  }

  if (e.key.length !== 1) return;

  const typed = e.key;
  e.preventDefault();

  if (typed === expected) {
    state.correct++;
    registerResult(typed, true);
    state.index++;
    if (state.index >= state.text.length) {
      finishLesson();
      return;
    }
  } else {
    state.wrong++;
    registerResult(expected, false);
    state.missAt.add(state.index);
  }

  render();
});

newLessonBtn.addEventListener('click', generateLesson);

resetBtn.addEventListener('click', () => {
  state.unlocked = lessons.length;
  state.correct = 0;
  state.wrong = 0;
  state.letterStats = Object.create(null);
  generateLesson();
});

langSelect.addEventListener('change', () => {
  state.lang = langSelect.value === 'zh' ? 'zh' : 'en';
  render();
});

modeSelect.addEventListener('change', () => {
  state.mode = modeSelect.value === 'code' ? 'code' : 'adaptive';
  generateLesson();
});

exportBtn.addEventListener('click', exportConfig);

importBtn.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', async () => {
  const file = importFile.files && importFile.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const cfg = JSON.parse(text);
    importConfigObj(cfg);
    alert(t('importOk'));
    generateLesson();
  } catch {
    alert(t('importFail'));
  } finally {
    importFile.value = '';
  }
});

generateLesson();
