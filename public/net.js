(function () {
  const playerName = (prompt('Choose your player name (max 12 letters):') || '').trim().slice(0, 12);
  window.socket = io({ autoConnect: false, auth: { name: playerName } });
})();
