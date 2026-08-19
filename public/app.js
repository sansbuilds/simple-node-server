const messages = document.querySelector('#messages');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#command-input');

function addMessage(text, role) {
  const message = document.createElement('div');
  message.className = `message ${role}`;
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  message.appendChild(paragraph);
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

function responseFor(command) {
  const [name, ...argumentsList] = command.trim().split(/\s+/);
  const argument = argumentsList.join(' ');
  const message = command.trim().toLowerCase().replace(/[!?.,]+$/g, '');

  switch (name.toLowerCase()) {
    case '/help':
      return 'Available commands:\n/help  Show this list\n/status  Check the server\n/time  Show the current time\n/about  Learn about this demo\n/echo <text>  Repeat a message\n/clear  Clear the conversation';
    case '/status':
      return 'All systems are ready. This page is being served by Node.js.';
    case '/time':
      return `Your local time is ${new Date().toLocaleTimeString()}.`;
    case '/about':
      return 'SimpleServer is a dependency-free static server built with Node\'s built-in http module.';
    case '/echo':
      return argument ? argument : 'Usage: /echo <text>';
  }

  if (/^(hello|hi|hey|hiya)$/.test(message)) {
    return 'Hello! Nice to meet you. How can I help?';
  }
  if (/^(good morning|good afternoon|good evening)$/.test(message)) {
    return `Good ${message.slice(5)}! How is your day going?`;
  }
  if (/^(how are you|how are you doing)$/.test(message)) {
    return 'I am doing great and ready to help. Try /help for commands.';
  }
  if (/^(thanks|thank you|thx)$/.test(message)) {
    return 'You are welcome!';
  }
  if (/^(bye|goodbye|see you)$/.test(message)) {
    return 'Goodbye! Come back whenever you need me.';
  }
  if (/^(who are you|what is your name)$/.test(message)) {
    return 'I am the SimpleServer assistant, a small browser-based chat helper.';
  }
  return name.startsWith('/')
    ? `I do not know ${name}. Try /help to see available commands.`
    : 'I can respond to greetings and simple questions. Try saying “hello” or type /help for commands.';
}

async function getAssistantReply(command) {
  const localReply = responseFor(command);
  if (command.trim().startsWith('/') || localReply !== 'I can respond to greetings and simple questions. Try saying “hello” or type /help for commands.') {
    return localReply;
  }
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: command })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Assistant unavailable');
  return result.reply;
}

async function runCommand(command) {
  const trimmedCommand = command.trim();
  if (!trimmedCommand) return;
  addMessage(trimmedCommand, 'user');
  if (trimmedCommand.toLowerCase() === '/clear') {
    messages.replaceChildren();
    addMessage('Chat cleared. Try /help whenever you need a hand.', 'assistant');
    return;
  }
  try {
    addMessage(await getAssistantReply(trimmedCommand), 'assistant');
  } catch (error) {
    addMessage(`${error.message} Try a basic greeting or /help for local commands.`, 'assistant');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  runCommand(input.value);
  input.value = '';
  input.focus();
});

document.querySelectorAll('[data-command]').forEach((button) => {
  button.addEventListener('click', () => {
    runCommand(button.dataset.command);
    input.focus();
  });
});

addMessage('Welcome. Type /help to explore what I can do.', 'assistant');