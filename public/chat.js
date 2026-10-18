const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');

socket.on('chat', (m) => {
  const line = document.createElement('div');
  const name = document.createElement('b');
  name.textContent = m.name + ': ';
  name.style.color = m.color;
  line.appendChild(name);
  line.appendChild(document.createTextNode(m.text));
  chatLog.appendChild(line);
  while (chatLog.children.length > 30) chatLog.removeChild(chatLog.firstChild);
  chatLog.scrollTop = chatLog.scrollHeight;
});

chatInput.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') {
    const t = chatInput.value.trim();
    if (t) socket.emit('chat', t);
    chatInput.value = '';
    chatInput.blur();
  }
});
chatInput.addEventListener('keyup', (e) => e.stopPropagation());
