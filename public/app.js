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
    default:
      return name.startsWith('/')
        ? `I do not know ${name}. Try /help to see available commands.`
        : 'I can respond to commands. Try /help, or say something with /echo.';
  }
}

function runCommand(command) {
  const trimmedCommand = command.trim();
  if (!trimmedCommand) return;
  addMessage(trimmedCommand, 'user');
  if (trimmedCommand.toLowerCase() === '/clear') {
    messages.replaceChildren();
    addMessage('Chat cleared. Try /help whenever you need a hand.', 'assistant');
    return;
  }
  addMessage(responseFor(trimmedCommand), 'assistant');
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