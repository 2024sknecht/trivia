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

async function fetchTrivia(amount = 5, qtype = 'any') {
	let url = `https://opentdb.com/api.php?amount=${encodeURIComponent(amount)}`;
	if (qtype && qtype !== 'any') url += `&type=${encodeURIComponent(qtype)}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Network error: ${res.status}`);
	const data = await res.json();
	if (data.response_code !== 0) throw new Error('API returned an error');
	return data.results;
}

function renderTrivia(items) {
	const list = $('#trivia-list');
	list.innerHTML = '';
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
				if (answerItem.dataset.isCorrect === 'true') {
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

async function loadAndShow() {
	const amount = Math.max(1, Math.min(50, Number($('#amount').value) || 5));
	const qtype = $('#type') ? $('#type').value : 'any';
	const status = $('#status');
	status.textContent = 'Loading...';
	try {
		const items = await fetchTrivia(amount, qtype);
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
});
