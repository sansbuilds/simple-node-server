const messages = document.querySelector('#messages');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#command-input');
const sendButton = document.querySelector('.send-button');
const clearButton = document.querySelector('.clear-chat');
const statusText = document.querySelector('.powered-by');
const welcomePanel = document.querySelector('#welcome-panel');
const conversation = [];
let isSending = false;

function escapeHtml(text) {
  return text.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function renderMarkdown(text) {
  const codeBlocks = [];
  let rendered = escapeHtml(text).replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (_, language, code) => {
    const index = codeBlocks.push({ language: language || 'code', code: code.trim() }) - 1;
    return `\u0000CODE${index}\u0000`;
  });
  rendered = rendered.replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^[-*] (.+)$/gm, '<li>$1</li>').replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  rendered = rendered.split(/\n\n+/).map((block) => { if (/^<(?:h2|h3|ul|pre)/.test(block.trim()) || /^\u0000CODE\d+\u0000$/.test(block.trim()) || !block.trim()) return block; return `<p>${block.replace(/\n/g, '<br />')}</p>`; }).join('');
  codeBlocks.forEach(({ language, code }, index) => { const codeHtml = `<pre><div class="code-toolbar"><span>${language}</span><button class="copy-code" type="button" aria-label="Copy code"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg><span>Copy</span></button></div><code>${escapeHtml(code)}</code></pre>`; rendered = rendered.replace(`\u0000CODE${index}\u0000`, codeHtml); });
  return rendered;
}

function sanitizeReply(text) {
  let cleaned = text.replace(/<(think|analysis|reasoning|thought|chain_of_thought)[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<\/?(think|analysis|reasoning|thought|chain_of_thought)[^>]*>/gi, '').trim();
  if (/^\s*(?:here(?:'s| is)\s+(?:my\s+)?(?:thinking process|analysis|reasoning)|thinking process|analysis|reasoning)\s*:/i.test(cleaned)) { const finalAnswer = cleaned.match(/\n\s*(?:final answer|answer)\s*:\s*([\s\S]*)$/i); cleaned = finalAnswer ? finalAnswer[1] : ''; }
  return cleaned.replace(/^\s*(?:final answer|answer)\s*:\s*/i, '').trim();
}

function addMessage(text, role) {
  const message = document.createElement('article'); message.className = `message ${role}`;
  const avatar = document.createElement('div'); avatar.className = 'message-avatar'; avatar.setAttribute('aria-hidden', 'true'); avatar.textContent = role.includes('user') ? 'You' : 'A';
  const content = document.createElement('div'); content.className = 'message-content';
  if (role.includes('assistant') && !role.includes('typing')) content.innerHTML = renderMarkdown(text); else { const paragraph = document.createElement('p'); paragraph.textContent = text; content.appendChild(paragraph); }
  message.append(avatar, content); messages.appendChild(message); messages.scrollTop = messages.scrollHeight;
  if (role.includes('assistant') && !role.includes('typing')) message.querySelectorAll('.copy-code').forEach((button) => { button.addEventListener('click', async () => { const code = button.closest('pre').querySelector('code').textContent; await navigator.clipboard.writeText(code); button.querySelector('span').textContent = 'Copied'; setTimeout(() => { button.querySelector('span').textContent = 'Copy'; }, 1400); }); });
  return message;
}

function addTypingIndicator() { const message = document.createElement('article'); message.className = 'message assistant typing'; message.innerHTML = '<div class="message-avatar" aria-hidden="true">A</div><div class="message-content" aria-label="Aira is typing"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>'; messages.appendChild(message); messages.scrollTop = messages.scrollHeight; return message; }
function setSendingState(sending) { isSending = sending; input.disabled = sending; sendButton.disabled = sending; clearButton.disabled = sending; statusText.innerHTML = sending ? '<span class="online-dot"></span>Aira is thinking' : '<span class="online-dot"></span>Ready to chat'; }

function responseFor(command) {
  const [name, ...argumentsList] = command.trim().split(/\s+/); const argument = argumentsList.join(' ');
  switch (name.toLowerCase()) { case '/help': return 'Ask me anything, or try /status, /time, /about, /echo <text>, or /clear.'; case '/status': return 'Aira is online and ready.'; case '/time': return `Your local time is ${new Date().toLocaleTimeString()}.`; case '/about': return 'Aira is a Groq-powered AI assistant running through a Node.js backend.'; case '/echo': return argument || 'Usage: /echo <text>'; default: return name.startsWith('/') ? `I do not know ${name}. Try /help for available commands.` : null; }
}

async function getAssistantReply(command) {
  conversation.push({ role: 'user', content: command.trim() });
  try { const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: conversation }) }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'The assistant could not complete that request.'); const reply = sanitizeReply(result.reply || ''); if (!reply) throw new Error('The assistant returned no visible answer.'); conversation.push({ role: 'assistant', content: reply }); return reply; } catch (error) { conversation.pop(); throw error; }
}

async function runCommand(command) {
  const trimmedCommand = command.trim(); if (!trimmedCommand || isSending) return; welcomePanel.classList.add('hidden');
  if (trimmedCommand.toLowerCase() === '/clear') { conversation.length = 0; messages.replaceChildren(); welcomePanel.classList.remove('hidden'); return; }
  addMessage(trimmedCommand, 'user'); const localReply = responseFor(trimmedCommand); if (localReply !== null) { addMessage(localReply, 'assistant'); return; }
  setSendingState(true); const typingIndicator = addTypingIndicator();
  try { const reply = await getAssistantReply(trimmedCommand); typingIndicator.remove(); addMessage(reply, 'assistant'); } catch (error) { typingIndicator.remove(); addMessage(error.message, 'assistant error'); } finally { setSendingState(false); }
}

form.addEventListener('submit', (event) => { event.preventDefault(); runCommand(input.value); input.value = ''; input.style.height = 'auto'; input.focus(); });
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 150)}px`; });
input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
clearButton.addEventListener('click', () => runCommand('/clear'));
document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => runCommand(button.dataset.prompt)));
