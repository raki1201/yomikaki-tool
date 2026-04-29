let questions = QUESTIONS_DATA.questions;
let current = 0;
let userAnswers = {};

function loadQuestions() {
  renderQuestion();
}

function renderQuestion() {
  const q = questions[current];
  userAnswers[current] = userAnswers[current] || {};

  document.getElementById('question-number').textContent = `問${q.number}`;
  document.getElementById('question-type').textContent = q.type + (q.section ? `（${q.section}）` : '');
  document.getElementById('instruction').textContent = q.instruction;
  document.getElementById('result-message').textContent = '';
  document.getElementById('btn-next').style.display = 'none';
  document.getElementById('btn-check').style.display = 'inline-block';

  // 語群（word_bank_itemsがある問3は専用UIで表示するので非表示）
  const wb = document.getElementById('word-bank');
  if (q.word_bank && !q.word_bank_items) {
    wb.classList.add('visible');
    const list = Array.isArray(q.word_bank) ? q.word_bank.join('　') : q.word_bank;
    wb.innerHTML = `<div class="word-bank-label">【語群】</div>${list}`;
  } else {
    wb.classList.remove('visible');
    wb.innerHTML = '';
  }

  // 問題アイテム
  const container = document.getElementById('items-container');
  container.innerHTML = '';

  // プログレス
  const pct = ((current + 1) / questions.length) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `${current + 1} / ${questions.length} 問`;
  document.getElementById('footer-label').textContent = `${current + 1} / ${questions.length}`;

  if (q.type === '分類') {
    renderClassify(q, container);
  } else if (q.type === '語群分類') {
    renderWordBankClassify(q, container);
  } else if (q.type === '複数選択') {
    renderMultiSelect(q, container);
  } else if (q.type === '選択' || q.type === '選択（類義語）') {
    renderSelect(q, container);
  } else if (q.type === '参照入力') {
    renderRefInput(q, container);
  } else {
    renderWrite(q, container);
  }
}

function renderClassify(q, container) {
  const opts = q.options || ['A', 'B', 'C'];
  q.items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    const saved = userAnswers[current][i] || '';

    let btns = '';
    opts.forEach(opt => {
      const sel = saved === opt ? 'selected' : '';
      btns += `<button class="classify-btn ${sel}" data-idx="${i}" data-val="${opt}" onclick="selectClassify(this)">${opt}</button>`;
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

// 問3用：語群の各単語に条件番号1〜5を割り当てるUI
function renderWordBankClassify(q, container) {
  // 条件一覧を先に表示
  const refDiv = document.createElement('div');
  refDiv.className = 'conditions-ref';
  q.items.forEach(item => {
    const p = document.createElement('p');
    p.className = 'condition-ref-item';
    p.innerHTML = `<span class="condition-num">${item.number}</span>${item.text}`;
    refDiv.appendChild(p);
  });
  container.appendChild(refDiv);

  // 区切り線
  const hr = document.createElement('hr');
  hr.className = 'section-divider';
  container.appendChild(hr);

  // 語群の各単語 → ボタン1〜5で条件を選ぶ
  q.word_bank_items.forEach((word, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    const saved = userAnswers[current][i] || '';

    let btns = '';
    for (let n = 1; n <= 5; n++) {
      const sel = saved === String(n) ? 'selected' : '';
      btns += `<button class="classify-btn ${sel}" data-idx="${i}" data-val="${n}" onclick="selectClassify(this)">${n}</button>`;
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

// 問4用：各条件に対して複数のボタンをトグル選択
function renderMultiSelect(q, container) {
  const opts = Array.isArray(q.word_bank) ? q.word_bank : [];
  q.items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    if (!Array.isArray(userAnswers[current][i])) {
      userAnswers[current][i] = [];
    }
    const saved = userAnswers[current][i];

    let btns = '';
    opts.forEach(opt => {
      const sel = saved.includes(opt) ? 'selected' : '';
      btns += `<button class="choice-btn ${sel}" data-idx="${i}" data-val="${opt}" onclick="toggleMultiChoice(this)">${opt}</button>`;
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

function renderSelect(q, container) {
  q.items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    const saved = userAnswers[current][i] || '';

    let choicesHtml = '';
    if (item.choices) {
      item.choices.forEach(c => {
        const sel = saved === c ? 'selected' : '';
        choicesHtml += `<button class="choice-btn ${sel}" data-idx="${i}" data-val="${c}" onclick="selectChoice(this)">${c}</button>`;
      });
    } else {
      choicesHtml = `<input class="answer-input" type="text" placeholder="記号を入力" value="${saved}" data-idx="${i}" oninput="saveInput(this)">`;
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

function renderRefInput(q, container) {
  q.items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    const saved = userAnswers[current][i] || '';

    const choicesHtml = item.choices
      ? '<div class="ref-choices">' + item.choices.map(c => `<span class="ref-choice">${c}</span>`).join('') + '</div>'
      : '';

    div.innerHTML = `
      <div class="item-number">${item.number}</div>
      <div class="item-body">
        <div class="item-text">${item.text}</div>
        ${choicesHtml}
        <input class="answer-input" type="text" placeholder="漢字で入力" value="${saved}" data-idx="${i}" oninput="saveInput(this)">
      </div>`;
    container.appendChild(div);
  });
}

function renderWrite(q, container) {
  q.items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'item';

    if (item.sub_items) {
      let subHtml = '';
      item.sub_items.forEach((sub, j) => {
        const key = `${i}-${j}`;
        const saved = userAnswers[current][key] || '';
        subHtml += `
          <div class="sub-item">
            <span class="sub-label">${sub.label}</span>
            <div>
              <div class="sub-text">${sub.text}</div>
              <input class="answer-input" type="text" placeholder="熟語を入力" value="${saved}" data-key="${key}" oninput="saveInputKey(this)">
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
      const saved = userAnswers[current][i] || '';
      const targetHtml = item.target ? `<div class="item-target">${item.target}</div>` : '';
      div.innerHTML = `
        <div class="item-number">${item.number}</div>
        <div class="item-body">
          <div class="item-text">${item.text}</div>
          ${targetHtml}
          <input class="answer-input" type="text" placeholder="答えを入力" value="${saved}" data-idx="${i}" oninput="saveInput(this)">
        </div>`;
    }
    container.appendChild(div);
  });
}

function selectClassify(btn) {
  const idx = btn.dataset.idx;
  const val = btn.dataset.val;
  userAnswers[current][idx] = val;
  btn.closest('.classify-btns').querySelectorAll('.classify-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function toggleMultiChoice(btn) {
  const idx = btn.dataset.idx;
  const val = btn.dataset.val;
  if (!Array.isArray(userAnswers[current][idx])) {
    userAnswers[current][idx] = [];
  }
  if (btn.classList.contains('selected')) {
    btn.classList.remove('selected');
    userAnswers[current][idx] = userAnswers[current][idx].filter(v => v !== val);
  } else {
    btn.classList.add('selected');
    userAnswers[current][idx].push(val);
  }
}

function selectChoice(btn) {
  const idx = btn.dataset.idx;
  const val = btn.dataset.val;
  userAnswers[current][idx] = val;
  btn.closest('.choices').querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function saveInput(input) {
  userAnswers[current][input.dataset.idx] = input.value;
}

function saveInputKey(input) {
  userAnswers[current][input.dataset.key] = input.value;
}

function checkAnswers() {
  const q = questions[current];
  const items = q.word_bank_items || q.items || [];
  let correct = 0, wrong = 0, empty = 0, total = 0;
  const firstCA = items.length > 0 ? items[0].correct_answer : undefined;
  const hasCorrect = firstCA !== undefined && firstCA !== '' && !(Array.isArray(firstCA) && firstCA.length === 0);

  items.forEach((item, i) => {
    if (item.sub_items) {
      item.sub_items.forEach((sub, j) => {
        total++;
        const val = userAnswers[current][`${i}-${j}`] || '';
        if (!val) { empty++; return; }
        if (sub.correct_answer) { val === sub.correct_answer ? correct++ : wrong++; }
      });
    } else {
      total++;
      const val = userAnswers[current][i];
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
    }
    // 正誤をボタン・入力欄に反映
    showCorrectness(q, items, hasCorrect);
  } else {
    msg.textContent = '✓ すべて入力済み！';
    msg.className = 'result-ok';
  }

  document.getElementById('btn-next').style.display = 'inline-block';
}

function showCorrectness(q, items, hasCorrect) {
  if (!hasCorrect) return;
  const isWordBank = !!q.word_bank_items;

  items.forEach((item, i) => {
    const val = userAnswers[current][i] || '';
    const isCorrect = val === item.correct_answer;

    // classify-btn を探す
    const allItems = document.querySelectorAll('#items-container .item');
    // word_bank_items の場合、条件一覧の分だけオフセットが必要
    const offset = isWordBank ? q.items.length : 0; // conditions-ref は .item ではないので0でOK
    const itemEl = document.querySelectorAll('#items-container .item')[i];
    if (!itemEl) return;

    const selectedBtn = itemEl.querySelector('.classify-btn.selected');
    if (selectedBtn) {
      selectedBtn.classList.remove('selected');
      selectedBtn.classList.add(isCorrect ? 'correct' : 'wrong');
    }
    const input = itemEl.querySelector('.answer-input');
    if (input) {
      input.classList.add(isCorrect ? 'correct' : 'wrong');
    }
  });
}

function nextQuestion() {
  if (current < questions.length - 1) {
    current++;
    renderQuestion();
    window.scrollTo(0, 0);
  }
}

function prevQuestion() {
  if (current > 0) {
    current--;
    renderQuestion();
    window.scrollTo(0, 0);
  }
}

loadQuestions();
