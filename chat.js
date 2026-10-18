module.exports = (io, socket, players) => {
  let last = 0;
  socket.on('chat', (text) => {
    if (typeof text !== 'string') return;
    const msg = text.trim().slice(0, 120);
    const now = Date.now();
    if (!msg || now - last < 500) return;
    last = now;
    const p = players[socket.id];
    io.emit('chat', {
      name: 'Player ' + socket.id.slice(0, 4),
      color: '#' + (p ? p.color : 0xffffff).toString(16).padStart(6, '0'),
      text: msg,
    });
  });
};
