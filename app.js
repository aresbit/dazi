const lessonTextEl = document.getElementById('lessonText');
const wpmEl = document.getElementById('wpm');
const accuracyEl = document.getElementById('accuracy');
const correctEl = document.getElementById('correct');
const wrongEl = document.getElementById('wrong');
const levelEl = document.getElementById('level');
const weakKeysEl = document.getElementById('weakKeys');
const newLessonBtn = document.getElementById('newLessonBtn');
const resetBtn = document.getElementById('resetBtn');

const lessons = ['fj', 'dk', 'sl', 'a;', 'gh', 'ru', 'ei', 'wo', 'cv', 'mn', 'ty', 'bpqxz'];

const state = {
  // 默认全键位开放，避免一开始只练 f/j
  unlocked: lessons.length,
  text: '',
  index: 0,
  startTime: Date.now(),
  correct: 0,
  wrong: 0,
  missAt: new Set(),
  letterStats: Object.create(null),
};

function unlockedLetters() {
  return lessons.slice(0, state.unlocked).join('');
}

function scoreOf(letter) {
  const v = state.letterStats[letter];
  if (!v) return 0.75;
  const total = v.hit + v.miss;
  if (!total) return 0.75;
  return v.hit / total;
}

function weakLetters(limit = 5) {
  const letters = [...new Set(unlockedLetters().split(''))];
  return letters
    .map((letter) => ({ letter, score: scoreOf(letter) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

function pickChar(base, focus) {
  if (Math.random() < 0.65) {
    return focus[Math.floor(Math.random() * focus.length)];
  }
  return base[Math.floor(Math.random() * base.length)];
}

function makeWord(base, focus) {
  const len = 3 + Math.floor(Math.random() * 5);
  let out = '';
  for (let i = 0; i < len; i++) out += pickChar(base, focus);
  return out;
}

function generateLesson() {
  const base = [...new Set(unlockedLetters().split(''))];
  const weak = weakLetters(3).map((x) => x.letter);
  const focus = weak.length ? weak : base;
  const words = [];

  for (let i = 0; i < 26; i++) {
    words.push(makeWord(base, focus));
  }

  state.text = words.join(' ');
  state.index = 0;
  state.startTime = Date.now();
  state.missAt = new Set();
  render();
}

function paintText() {
  let html = '';
  for (let i = 0; i < state.text.length; i++) {
    const ch = state.text[i] === ' ' ? '&nbsp;' : state.text[i];
    let cls = 'todo';
    if (i < state.index) cls = state.missAt.has(i) ? 'miss' : 'done';
    if (i === state.index) cls = 'now';
    html += `<span class="char ${cls}">${ch}</span>`;
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
  weakLetters(6).forEach((x) => {
    const chip = document.createElement('span');
    chip.className = 'key-chip';
    chip.textContent = `${x.letter} ${(x.score * 100).toFixed(0)}%`;
    weakKeysEl.appendChild(chip);
  });
}

function paintKeyboard() {
  document.querySelectorAll('.keyboard [data-key]').forEach((el) => {
    el.classList.remove('active');
  });
  const expected = state.text[state.index];
  if (!expected || expected === ' ') return;
  const key = document.querySelector(`.keyboard [data-key="${CSS.escape(expected)}"]`);
  if (key) key.classList.add('active');
}

function render() {
  paintText();
  updateStats();
  updateWeakKeys();
  paintKeyboard();
}

function registerResult(ch, ok) {
  if (!/[a-z;]/.test(ch)) return;
  if (!state.letterStats[ch]) state.letterStats[ch] = { hit: 0, miss: 0 };
  if (ok) state.letterStats[ch].hit++;
  else state.letterStats[ch].miss++;
}

function maybeLevelUp() {
  const total = state.correct + state.wrong;
  if (total < 250) return;
  const acc = state.correct / total;
  if (acc >= 0.95 && state.unlocked < lessons.length) {
    state.unlocked += 1;
  }
}

function finishLesson() {
  maybeLevelUp();
  generateLesson();
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    generateLesson();
    return;
  }

  if (e.key.length !== 1) return;
  const typed = e.key.toLowerCase();
  const expected = state.text[state.index];
  if (!expected) return;

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
    registerResult(expected.toLowerCase(), false);
    state.missAt.add(state.index);
  }

  render();
});

newLessonBtn.addEventListener('click', generateLesson);

resetBtn.addEventListener('click', () => {
  // 重置统计，但保持全键位可用
  state.unlocked = lessons.length;
  state.correct = 0;
  state.wrong = 0;
  state.letterStats = Object.create(null);
  generateLesson();
});

generateLesson();
