let questions = [];
let current = 0;
let userAnswers = {};
let wrongQuestions = new Set(); // 不正解があった問題のインデックス（元のquestions配列上）
let isReviewMode = false;
let reviewIndices = []; // 復習対象の questions 内インデックス
let reviewCurrent = 0;

// -------------------------------------------------------
// 初期化・画面切り替え
// -------------------------------------------------------

function init() {
  if (!window.DRILL_SETS || DRILL_SETS.length === 0) {
    document.body.innerHTML = '<p style="padding:24px">問題データが見つかりません。</p>';
    return;
  }
  if (DRILL_SETS.length === 1) {
    startSet(0);
  } else {
    showSetSelector();
  }
}

function showSetSelector() {
  hide('main-quiz');
  hide('main-footer');
  hide('summary-screen');
  hide('progress-area');
  hide('btn-home');
  show('set-selector', 'flex');

  const list = document.getElementById('set-list');
  list.innerHTML = '';
  DRILL_SETS.forEach((set, i) => {
    const btn = document.createElement('button');
    btn.className = 'set-btn';
    btn.innerHTML = `<span class="set-btn-title">${set.title}</span><span class="set-btn-count">${set.questions.length}問</span>`;
    btn.onclick = () => startSet(i);
    list.appendChild(btn);
  });
}

function goHome() {
  isReviewMode = false;
  if (DRILL_SETS.length === 1) {
    startSet(0);
  } else {
    showSetSelector();
  }
}

function startSet(i) {
  questions = DRILL_SETS[i].questions;
  current = 0;
  userAnswers = {};
  wrongQuestions = new Set();
  isReviewMode = false;

  hide('set-selector');
  hide('summary-screen');
  show('main-quiz', 'flex');
  show('main-footer', 'flex');
  show('progress-area');
  if (DRILL_SETS.length > 1) show('btn-home');

  document.getElementById('header-title').textContent = '読み書きドリル ' + DRILL_SETS[i].title;
  document.getElementById('review-badge').style.display = 'none';
  renderQuestion();
}

function startReview() {
  reviewIndices = Array.from(wrongQuestions).sort((a, b) => a - b);
  if (reviewIndices.length === 0) return;

  isReviewMode = true;
  reviewCurrent = 0;

  hide('summary-screen');
  show('main-quiz', 'flex');
  show('main-footer', 'flex');
  show('review-badge');

  renderCurrentQuestion();
}

// -------------------------------------------------------
// 問題表示
// -------------------------------------------------------

function activeIndex() {
  return isReviewMode ? reviewIndices[reviewCurrent] : current;
}

function activeLength() {
  return isReviewMode ? reviewIndices.length : questions.length;
}

function renderCurrentQuestion() {
  const idx = activeIndex();
  userAnswers[idx] = userAnswers[idx] || {};
  const q = questions[idx];

  document.getElementById('question-number').textContent = `問${q.number}`;
  document.getElementById('question-type').textContent = q.type + (q.section ? `（${q.section}）` : '');
  document.getElementById('instruction').textContent = q.instruction;
  document.getElementById('result-message').textContent = '';
  document.getElementById('btn-next').style.display = 'none';
  document.getElementById('btn-check').style.display = 'inline-block';

  const wb = document.getElementById('word-bank');
  if (q.word_bank && !q.word_bank_items) {
    wb.classList.add('visible');
    const list = Array.isArray(q.word_bank) ? q.word_bank.join('　') : q.word_bank;
    wb.innerHTML = `<div class="word-bank-label">【語群】</div>${list}`;
  } else {
    wb.classList.remove('visible');
    wb.innerHTML = '';
  }

  const container = document.getElementById('items-container');
  container.innerHTML = '';

  const pos = isReviewMode ? reviewCurrent : current;
  const len = activeLength();
  const pct = ((pos + 1) / len) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `${pos + 1} / ${len} 問`;
  document.getElementById('footer-label').textContent = `${pos + 1} / ${len}`;

  if (q.type === '分類') {
    renderClassify(q, container, idx);
  } else if (q.type === '語群分類') {
    renderWordBankClassify(q, container, idx);
  } else if (q.type === '複数選択') {
    renderMultiSelect(q, container, idx);
  } else if (q.type === '選択' || q.type === '選択（類義語）') {
    renderSelect(q, container, idx);
  } else if (q.type === '参照入力') {
    renderRefInput(q, container, idx);
  } else {
    renderWrite(q, container, idx);
  }
}

// 後方互換のため renderQuestion も定義
function renderQuestion() {
  renderCurrentQuestion();
}

// -------------------------------------------------------
// 各タイプのレンダラー（idx を引数に追加）
// -------------------------------------------------------

function renderClassify(q, container, idx) {
  const opts = q.options || ['A', 'B', 'C'];
  q.items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    const saved = userAnswers[idx][i] || '';

    let btns = '';
    opts.forEach(opt => {
      const sel = saved === opt ? 'selected' : '';
      btns += `<button class="classify-btn ${sel}" data-idx="${i}" data-val="${opt}" onclick="selectClassify(this,${idx})">${opt}</button>`;
    });

    div.innerHTML = `
      <div class="item-number">${item.number}</div>
      <div class="item-body">
        <div class="item-text">${item.text}</div>
        <div class="classify-btns">${btns}</div>
      </div>`;
    container.appendChild(div);
  });
}

function renderWordBankClassify(q, container, idx) {
  const refDiv = document.createElement('div');
  refDiv.className = 'conditions-ref';
  q.items.forEach(item => {
    const p = document.createElement('p');
    p.className = 'condition-ref-item';
    p.innerHTML = `<span class="condition-num">${item.number}</span>${item.text}`;
    refDiv.appendChild(p);
  });
  container.appendChild(refDiv);

  const hr = document.createElement('hr');
  hr.className = 'section-divider';
  container.appendChild(hr);

  q.word_bank_items.forEach((word, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    const saved = userAnswers[idx][i] || '';

    let btns = '';
    for (let n = 1; n <= 5; n++) {
      const sel = saved === String(n) ? 'selected' : '';
      btns += `<button class="classify-btn ${sel}" data-idx="${i}" data-val="${n}" onclick="selectClassify(this,${idx})">${n}</button>`;
    }

    div.innerHTML = `
      <div class="item-number">${word.number}</div>
      <div class="item-body">
        <div class="item-text word-bank-word">${word.text}</div>
        <div class="classify-btns">${btns}</div>
      </div>`;
    container.appendChild(div);
  });
}

function renderMultiSelect(q, container, idx) {
  const opts = Array.isArray(q.word_bank) ? q.word_bank : [];
  q.items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    if (!Array.isArray(userAnswers[idx][i])) {
      userAnswers[idx][i] = [];
    }
    const saved = userAnswers[idx][i];

    let btns = '';
    opts.forEach(opt => {
      const sel = saved.includes(opt) ? 'selected' : '';
      btns += `<button class="choice-btn ${sel}" data-idx="${i}" data-val="${opt}" onclick="toggleMultiChoice(this,${idx})">${opt}</button>`;
    });

    div.innerHTML = `
      <div class="item-number">${item.number}</div>
      <div class="item-body">
        <div class="item-text">${item.text}</div>
        <div class="choices">${btns}</div>
      </div>`;
    container.appendChild(div);
  });
}

function renderSelect(q, container, idx) {
  q.items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    const saved = userAnswers[idx][i] || '';

    let choicesHtml = '';
    if (item.choices) {
      item.choices.forEach(c => {
        const sel = saved === c ? 'selected' : '';
        choicesHtml += `<button class="choice-btn ${sel}" data-idx="${i}" data-val="${c}" onclick="selectChoice(this,${idx})">${c}</button>`;
      });
    } else {
      choicesHtml = `<input class="answer-input" type="text" placeholder="記号を入力" value="${saved}" data-idx="${i}" oninput="saveInput(this,${idx})">`;
    }

    const textHtml = item.reading ? `${item.text}（${item.reading}）` : item.text;

    div.innerHTML = `
      <div class="item-number">${item.number}</div>
      <div class="item-body">
        <div class="item-text">${textHtml}</div>
        <div class="choices">${choicesHtml}</div>
      </div>`;
    container.appendChild(div);
  });
}

function renderRefInput(q, container, idx) {
  q.items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    const saved = userAnswers[idx][i] || '';

    const choicesHtml = item.choices
      ? '<div class="ref-choices">' + item.choices.map(c => `<span class="ref-choice">${c}</span>`).join('') + '</div>'
      : '';

    div.innerHTML = `
      <div class="item-number">${item.number}</div>
      <div class="item-body">
        <div class="item-text">${item.text}</div>
        ${choicesHtml}
        <input class="answer-input" type="text" placeholder="漢字で入力" value="${saved}" data-idx="${i}" oninput="saveInput(this,${idx})">
      </div>`;
    container.appendChild(div);
  });
}

function renderWrite(q, container, idx) {
  q.items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'item';

    if (item.sub_items) {
      let subHtml = '';
      item.sub_items.forEach((sub, j) => {
        const key = `${i}-${j}`;
        const saved = userAnswers[idx][key] || '';
        subHtml += `
          <div class="sub-item">
            <span class="sub-label">${sub.label}</span>
            <div>
              <div class="sub-text">${sub.text}</div>
              <input class="answer-input" type="text" placeholder="熟語を入力" value="${saved}" data-key="${key}" oninput="saveInputKey(this,${idx})">
            </div>
          </div>`;
      });
      div.innerHTML = `
        <div class="item-number">${item.number}</div>
        <div class="item-body">
          <div class="item-text">【${item.kanji || ''}】</div>
          ${subHtml}
        </div>`;
    } else {
      const saved = userAnswers[idx][i] || '';
      const targetHtml = item.target ? `<div class="item-target">${item.target}</div>` : '';
      div.innerHTML = `
        <div class="item-number">${item.number}</div>
        <div class="item-body">
          <div class="item-text">${item.text}</div>
          ${targetHtml}
          <input class="answer-input" type="text" placeholder="答えを入力" value="${saved}" data-idx="${i}" oninput="saveInput(this,${idx})">
        </div>`;
    }
    container.appendChild(div);
  });
}

// -------------------------------------------------------
// インタラクション
// -------------------------------------------------------

function selectClassify(btn, idx) {
  const i = btn.dataset.idx;
  const val = btn.dataset.val;
  userAnswers[idx][i] = val;
  btn.closest('.classify-btns').querySelectorAll('.classify-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function toggleMultiChoice(btn, idx) {
  const i = btn.dataset.idx;
  const val = btn.dataset.val;
  if (!Array.isArray(userAnswers[idx][i])) userAnswers[idx][i] = [];
  if (btn.classList.contains('selected')) {
    btn.classList.remove('selected');
    userAnswers[idx][i] = userAnswers[idx][i].filter(v => v !== val);
  } else {
    btn.classList.add('selected');
    userAnswers[idx][i].push(val);
  }
}

function selectChoice(btn, idx) {
  const i = btn.dataset.idx;
  const val = btn.dataset.val;
  userAnswers[idx][i] = val;
  btn.closest('.choices').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function saveInput(input, idx) {
  userAnswers[idx][input.dataset.idx] = input.value;
}

function saveInputKey(input, idx) {
  userAnswers[idx][input.dataset.key] = input.value;
}

// -------------------------------------------------------
// 答え合わせ
// -------------------------------------------------------

function checkAnswers() {
  const idx = activeIndex();
  const q = questions[idx];
  const items = q.word_bank_items || q.items || [];
  let correct = 0, wrong = 0, empty = 0, total = 0;
  const firstCA = items.length > 0 ? items[0].correct_answer : undefined;
  const hasCorrect = firstCA !== undefined && firstCA !== '' && !(Array.isArray(firstCA) && firstCA.length === 0);

  items.forEach((item, i) => {
    if (item.sub_items) {
      item.sub_items.forEach((sub, j) => {
        total++;
        const val = userAnswers[idx][`${i}-${j}`] || '';
        if (!val) { empty++; return; }
        if (sub.correct_answer) { val === sub.correct_answer ? correct++ : wrong++; }
      });
    } else {
      total++;
      const val = userAnswers[idx][i];
      const isEmpty = Array.isArray(val) ? val.length === 0 : !val;
      if (isEmpty) { empty++; return; }
      if (hasCorrect) {
        const isCorrect = Array.isArray(item.correct_answer)
          ? JSON.stringify([...item.correct_answer].sort()) === JSON.stringify([...(val || [])].sort())
          : val === item.correct_answer;
        isCorrect ? correct++ : wrong++;
      }
    }
  });

  const msg = document.getElementById('result-message');
  if (empty > 0) {
    msg.textContent = `${empty} 問未入力です。`;
    msg.className = 'result-ng';
  } else if (hasCorrect) {
    if (wrong === 0) {
      msg.textContent = `全問正解！ (${correct}/${total})`;
      msg.className = 'result-ok';
    } else {
      msg.textContent = `${correct} 問正解、${wrong} 問不正解。`;
      msg.className = 'result-ng';
      wrongQuestions.add(idx); // 不正解があった問題を記録
    }
    showCorrectness(q, items);
  } else {
    msg.textContent = '✓ すべて入力済み！';
    msg.className = 'result-ok';
  }

  document.getElementById('btn-next').style.display = 'inline-block';
}

function showCorrectness(q, items) {
  const isWordBank = !!q.word_bank_items;
  const idx = activeIndex();

  items.forEach((item, i) => {
    const val = userAnswers[idx][i] || '';
    const isCorrect = val === item.correct_answer;

    const itemEl = document.querySelectorAll('#items-container .item')[i];
    if (!itemEl) return;

    const selectedBtn = itemEl.querySelector('.classify-btn.selected');
    if (selectedBtn) {
      selectedBtn.classList.remove('selected');
      selectedBtn.classList.add(isCorrect ? 'correct' : 'wrong');
    }
    const choiceBtn = itemEl.querySelector('.choice-btn.selected');
    if (choiceBtn) {
      choiceBtn.classList.remove('selected');
      choiceBtn.classList.add(isCorrect ? 'correct' : 'wrong');
    }
    const input = itemEl.querySelector('.answer-input');
    if (input) {
      input.classList.add(isCorrect ? 'correct' : 'wrong');
    }
  });
}

// -------------------------------------------------------
// ナビゲーション
// -------------------------------------------------------

function nextQuestion() {
  if (isReviewMode) {
    if (reviewCurrent < reviewIndices.length - 1) {
      reviewCurrent++;
      renderCurrentQuestion();
      window.scrollTo(0, 0);
    } else {
      showSummary(true);
    }
  } else {
    if (current < questions.length - 1) {
      current++;
      renderCurrentQuestion();
      window.scrollTo(0, 0);
    } else {
      showSummary(false);
    }
  }
}

function prevQuestion() {
  if (isReviewMode) {
    if (reviewCurrent > 0) {
      reviewCurrent--;
      renderCurrentQuestion();
      window.scrollTo(0, 0);
    }
  } else {
    if (current > 0) {
      current--;
      renderCurrentQuestion();
      window.scrollTo(0, 0);
    }
  }
}

// -------------------------------------------------------
// サマリー画面
// -------------------------------------------------------

function showSummary(afterReview) {
  hide('main-quiz');
  hide('main-footer');
  hide('progress-area');
  show('summary-screen', 'flex');

  const stats = document.getElementById('summary-stats');
  const reviewBtn = document.getElementById('btn-review');

  if (afterReview) {
    stats.innerHTML = '<p class="summary-msg">復習が完了しました！</p>';
    reviewBtn.style.display = 'none';
  } else {
    const total = questions.length;
    const wrongCount = wrongQuestions.size;
    const correctCount = total - wrongCount;
    stats.innerHTML = `
      <p class="summary-msg">${total} 問中 <strong>${correctCount}</strong> 問正解</p>
      ${wrongCount > 0 ? `<p class="summary-sub">間違えた問題：${wrongCount} 問</p>` : '<p class="summary-sub">全問正解！素晴らしい！</p>'}
    `;
    reviewBtn.style.display = wrongCount > 0 ? 'inline-block' : 'none';
  }
}

// -------------------------------------------------------
// ユーティリティ
// -------------------------------------------------------

function show(id, displayType) {
  document.getElementById(id).style.display = displayType || 'block';
}

function hide(id) {
  document.getElementById(id).style.display = 'none';
}

init();
