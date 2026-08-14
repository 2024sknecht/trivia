// Fetch random trivia from Open Trivia DB and render into the page

const $ = (sel) => document.querySelector(sel);

function decodeHtml(html) {
	const txt = document.createElement('textarea');
	txt.innerHTML = html;
	return txt.value;
}

function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

async function fetchTrivia(amount = 5, qtype = 'any', category = 'any') {
	let url = `https://opentdb.com/api.php?amount=${encodeURIComponent(amount)}`;
	if (qtype && qtype !== 'any') url += `&type=${encodeURIComponent(qtype)}`;
	if (category && category !== 'any') url += `&category=${encodeURIComponent(category)}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Network error: ${res.status}`);
	const data = await res.json();
	if (data.response_code !== 0) throw new Error('API returned an error');
	return data.results;
}

async function fetchCategories() {
	try {
		const res = await fetch('https://opentdb.com/api_category.php');
		if (!res.ok) return [];
		const json = await res.json();
		return json.trivia_categories || [];
	} catch (e) {
		return [];
	}
}

function renderTrivia(items) {
	const list = $('#trivia-list');
	list.innerHTML = '';
	// reset progress tracking
	window._triviaProgress = { total: items.length, answered: 0 };
	updateProgress();

	items.forEach((q, idx) => {
		const li = document.createElement('li');
		const question = document.createElement('div');
		question.className = 'question';
		question.textContent = `${idx + 1}. ${decodeHtml(q.question)}`;
		li.appendChild(question);

		// Build answers depending on question type
		let answers = [];
		if (q.type === 'boolean') {
			answers = ['True', 'False'];
		} else {
			answers = [q.correct_answer, ...q.incorrect_answers].map(decodeHtml);
		}

		shuffle(answers);
		const ol = document.createElement('ol');
		ol.className = 'answers';
		answers.forEach((a) => {
			const answerItem = document.createElement('li');
			answerItem.textContent = a;
			answerItem.tabIndex = 0;
			answerItem.setAttribute('role', 'button');
			// mark correct answer via dataset
			answerItem.dataset.isCorrect = (a === decodeHtml(q.correct_answer)).toString();

			// click/keyboard handler
			const handleSelect = () => {
				if (ol.dataset.answered === 'true') return;
				ol.dataset.answered = 'true';
				// highlight chosen
				const isCorrect = answerItem.dataset.isCorrect === 'true';
				if (isCorrect) {
					answerItem.classList.add('correct');
				} else {
					answerItem.classList.add('wrong');
				}
				// reveal correct answer
				const children = Array.from(ol.children);
				children.forEach((ch) => {
					if (ch.dataset.isCorrect === 'true') ch.classList.add('correct');
				});
				ol.classList.add('disabled');

				// update progress and persistent score
				window._triviaProgress.answered += 1;
				updateProgress();
				const score = readScore();
				score.attempts += 1;
				if (isCorrect) score.correct += 1;
				writeScore(score);
				updateScoreDisplay();
			};

			answerItem.addEventListener('click', handleSelect);
			answerItem.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') handleSelect();
			});

			ol.appendChild(answerItem);
		});
		li.appendChild(ol);
		// metadata: category and difficulty
		const meta = document.createElement('div');
		meta.className = 'meta';
		meta.textContent = `${decodeHtml(q.category)} • ${q.difficulty}`;
		li.appendChild(meta);
		list.appendChild(li);
	});
}

function updateProgress() {
	const prog = window._triviaProgress || { total: 0, answered: 0 };
	const text = $('#progress-text');
	const bar = $('#progress-bar');
	if (text) text.textContent = `Progress: ${prog.answered} / ${prog.total}`;
	if (bar) {
		const pct = prog.total ? Math.round((prog.answered / prog.total) * 100) : 0;
		bar.style.width = pct + '%';
	}
}

function readScore() {
	try {
		const raw = localStorage.getItem('triviaScore');
		if (!raw) return { correct: 0, attempts: 0 };
		return JSON.parse(raw);
	} catch (e) {
		return { correct: 0, attempts: 0 };
	}
}

function writeScore(score) {
	try {
		localStorage.setItem('triviaScore', JSON.stringify(score));
	} catch (e) {
		// ignore
	}
}

function updateScoreDisplay() {
	const s = readScore();
	const el = $('#score');
	if (el) el.textContent = `Score: ${s.correct} / ${s.attempts}`;
}

function resetScore() {
	writeScore({ correct: 0, attempts: 0 });
	updateScoreDisplay();
}

function updateSelectedCategory() {
	const sel = $('#category');
	const el = $('#selected-category');
	if (!el || !sel) return;
	const text = sel.selectedOptions && sel.selectedOptions.length ? sel.selectedOptions[0].textContent : (sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].text) || 'Any';
	el.textContent = `Category: ${text}`;
}

async function loadAndShow() {
	const amount = Math.max(1, Math.min(50, Number($('#amount').value) || 5));
	const qtype = $('#type') ? $('#type').value : 'any';
	const qcategory = $('#category') ? $('#category').value : 'any';
	const status = $('#status');
	status.textContent = 'Loading...';
	try {
		const items = await fetchTrivia(amount, qtype, qcategory);
		renderTrivia(items);
		status.textContent = `Loaded ${items.length} questions.`;
	} catch (err) {
		status.textContent = `Error: ${err.message}`;
	}
}

document.addEventListener('DOMContentLoaded', () => {
	$('#load-btn').addEventListener('click', loadAndShow);
	$('#amount').addEventListener('keydown', (e) => {
		if (e.key === 'Enter') loadAndShow();
	});
	// populate categories and wire reset
	fetchCategories().then((cats) => {
		const sel = $('#category');
		if (!sel) return;
		cats.forEach((c) => {
			const opt = document.createElement('option');
			opt.value = c.id;
			opt.textContent = c.name;
			sel.appendChild(opt);
		});
		// update visible label and listen for changes
		updateSelectedCategory();
		sel.addEventListener('change', updateSelectedCategory);
	});
	$('#reset-score').addEventListener('click', resetScore);
	updateScoreDisplay();
});
