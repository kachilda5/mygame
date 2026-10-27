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

(function () {
  const phrases = ['Monster behind you!', 'Attack together!', 'Need help!', 'Gather here!', 'Watch out!', 'Nice one!'];
  const row = document.createElement('div');
  row.id = 'quick-chat';
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;';
  phrases.forEach((text) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = 'background:rgba(40,44,62,.85);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:4px 8px;font:12px sans-serif;cursor:pointer;';
    btn.addEventListener('click', () => { socket.emit('chat', text); btn.blur(); });
    row.appendChild(btn);
  });
  const chat = document.getElementById('chat');
  if (chat) chat.insertBefore(row, chat.firstChild);
})();
