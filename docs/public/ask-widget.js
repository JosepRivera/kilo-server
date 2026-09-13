(function () {
	const CHAT_ICON =
		'<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2A10 10 0 0 0 2 12a9.9 9.9 0 0 0 2.3 6.3l-2 2a1 1 0 0 0-.3 1.1 1 1 0 0 0 1 .6h9a10 10 0 0 0 0-20m0 18H5.4l1-1a1 1 0 0 0 0-1.3A8 8 0 1 1 12 20"/></svg>';
	const SEND_ICON =
		'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.92 11.62a1.001 1.001 0 0 0-.21-.33l-5-5a1.003 1.003 0 1 0-1.42 1.42l3.3 3.29H7a1 1 0 0 0 0 2h7.59l-3.3 3.29a1.002 1.002 0 0 0 .325 1.639 1 1 0 0 0 1.095-.219l5-5a1 1 0 0 0 .21-.33 1 1 0 0 0 0-.76Z"/></svg>';

	function escapeHtml(s) {
		const div = document.createElement('div');
		div.textContent = s;
		return div.innerHTML;
	}

	function inline(text) {
		return escapeHtml(text)
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/`(.+?)`/g, '<code>$1</code>')
			.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
	}

	function renderMarkdownChunk(markdown) {
		const blocks = markdown.trim().split(/\n{2,}/);
		return blocks
			.map((block) => {
				const lines = block.split('\n').filter((l) => l.trim() !== '');
				if (lines.length === 0) return '';

				if (lines.length >= 2 && lines[0].trim().startsWith('```') && lines[lines.length - 1].trim() === '```') {
					const code = lines.slice(1, -1).map(escapeHtml).join('\n');
					return `<pre><code>${code}</code></pre>`;
				}

				if (lines.length >= 2 && lines[0].includes('|') && /^\s*\|?\s*:?-{2,}/.test(lines[1])) {
					const toCells = (line) =>
						line
							.trim()
							.replace(/^\||\|$/g, '')
							.split('|')
							.map((c) => c.trim());
					const head = toCells(lines[0]);
					const rows = lines.slice(2).map(toCells);
					const thead = `<tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr>`;
					const tbody = rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
					return `<div class="kilo-ask-table-wrap"><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
				}

				const heading = lines[0].match(/^(#{1,6})\s+(.*)$/);
				if (lines.length === 1 && heading) {
					return `<p class="kilo-ask-heading">${inline(heading[2])}</p>`;
				}

				if (lines.every((l) => /^[-*]\s+/.test(l))) {
					return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`;
				}
				if (lines.every((l) => /^\d+\.\s+/.test(l))) {
					return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
				}

				return `<p>${lines.map(inline).join('<br>')}</p>`;
			})
			.filter((html) => html !== '')
			.join('');
	}

	const SUGGESTIONS = [
		'¿Cómo se calcula el precio mensual?',
		'¿Qué pasa si el dueño pierde el chip?',
		'¿Por qué se eligió Culqi para los cobros?',
	];

	function init() {
		if (document.getElementById('kilo-ask-button')) return;

		const button = document.createElement('button');
		button.id = 'kilo-ask-button';
		button.type = 'button';
		button.setAttribute('aria-label', 'Preguntar a la IA sobre la documentación');
		button.innerHTML = CHAT_ICON;

		const scrim = document.createElement('div');
		scrim.id = 'kilo-ask-scrim';
		scrim.hidden = true;

		const panel = document.createElement('aside');
		panel.id = 'kilo-ask-panel';
		panel.hidden = true;
		panel.setAttribute('role', 'dialog');
		panel.setAttribute('aria-label', 'Preguntar a la IA sobre la documentación de Kilo');
		panel.innerHTML = `
			<div id="kilo-ask-header">
				<span>${CHAT_ICON} Preguntar sobre la documentación</span>
				<button id="kilo-ask-close" type="button" aria-label="Cerrar">&times;</button>
			</div>
			<div id="kilo-ask-messages">
				<p id="kilo-ask-intro">Pregunta lo que quieras sobre Kilo. Las respuestas se basan en esta documentación.</p>
				<div id="kilo-ask-suggestions"></div>
			</div>
			<form id="kilo-ask-form">
				<textarea id="kilo-ask-input" rows="1" placeholder="Escribe tu pregunta..." autocomplete="off"></textarea>
				<button id="kilo-ask-submit" type="submit" aria-label="Preguntar">${SEND_ICON}</button>
			</form>
		`;

		document.body.append(button, scrim, panel);

		const messagesEl = panel.querySelector('#kilo-ask-messages');
		const suggestionsEl = panel.querySelector('#kilo-ask-suggestions');
		const form = panel.querySelector('#kilo-ask-form');
		const input = panel.querySelector('#kilo-ask-input');
		const submitBtn = panel.querySelector('#kilo-ask-submit');

		for (const text of SUGGESTIONS) {
			const chip = document.createElement('button');
			chip.type = 'button';
			chip.className = 'kilo-ask-chip';
			chip.textContent = text;
			chip.addEventListener('click', () => {
				input.value = text;
				form.requestSubmit();
			});
			suggestionsEl.append(chip);
		}

		function openPanel() {
			scrim.hidden = false;
			panel.hidden = false;
			document.documentElement.style.overflow = 'hidden';
			requestAnimationFrame(() => panel.classList.add('kilo-ask-panel--open'));
			input.focus();
		}
		function closePanel() {
			panel.classList.remove('kilo-ask-panel--open');
			document.documentElement.style.overflow = '';
			setTimeout(() => {
				panel.hidden = true;
				scrim.hidden = true;
			}, 200);
		}

		button.addEventListener('click', openPanel);
		panel.querySelector('#kilo-ask-close').addEventListener('click', closePanel);
		scrim.addEventListener('click', closePanel);
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && !panel.hidden) closePanel();
		});

		function resizeInput() {
			input.style.height = 'auto';
			input.style.height = `${input.scrollHeight}px`;
		}
		input.addEventListener('input', resizeInput);

		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				if (!submitBtn.disabled) form.requestSubmit();
			}
		});

		function addBubble(role, text) {
			const bubble = document.createElement('div');
			bubble.className = `kilo-ask-bubble kilo-ask-bubble--${role}`;
			bubble.textContent = text;
			messagesEl.append(bubble);
			messagesEl.scrollTop = messagesEl.scrollHeight;
			return bubble;
		}

		async function addAssistantBlocks(markdown) {
			const chunks = markdown
				.split(/\n*---MSG---\n*/)
				.map((c) => c.trim())
				.filter((c) => c !== '');
			for (const chunk of chunks) {
				const block = document.createElement('div');
				block.className = 'kilo-ask-block';
				block.innerHTML = renderMarkdownChunk(chunk);
				messagesEl.append(block);
				messagesEl.scrollTop = messagesEl.scrollHeight;
				if (chunks.length > 1) await new Promise((r) => setTimeout(r, 220));
			}
		}

		const MAX_HISTORY_MESSAGES = 8;
		const history = [];

		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			if (submitBtn.disabled) return;
			const question = input.value.trim();
			if (!question) return;

			suggestionsEl.remove();
			addBubble('user', question);
			input.value = '';
			resizeInput();
			submitBtn.disabled = true;
			const pending = addBubble('assistant', 'Pensando...');

			try {
				const res = await fetch('/api/ask', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ question, history }),
				});
				const data = await res.json();
				if (res.ok && data.answer && data.answer.trim()) {
					pending.remove();
					await addAssistantBlocks(data.answer);
					history.push({ role: 'user', content: question }, { role: 'assistant', content: data.answer });
					history.splice(0, history.length - MAX_HISTORY_MESSAGES);
				} else if (res.ok) {
					pending.classList.add('kilo-ask-bubble--error');
					pending.textContent = 'No llegó una respuesta. Intenta preguntar de nuevo.';
				} else {
					pending.classList.add('kilo-ask-bubble--error');
					pending.textContent = 'No se pudo responder. Intenta de nuevo en un momento.';
				}
			} catch {
				pending.classList.add('kilo-ask-bubble--error');
				pending.textContent = 'Error de red al preguntar. Revisa tu conexión.';
			} finally {
				submitBtn.disabled = false;
				input.focus();
			}
		});
	}

	document.addEventListener('DOMContentLoaded', init);
	document.addEventListener('astro:page-load', init);
})();
