export function initStory(G) {
  const { socket } = G;
  const mk = (css) => {
    const el = document.createElement('div');
    el.style.cssText = css;
    document.body.appendChild(el);
    return el;
  };

  const INTRO_PAGES = [
    'For a thousand years, the kingdom of Frostwatch lived in peace, kept warm by the winter-wards: crystals powered by the song of the royal Songkeeper.',
    'Then the Long Winter came. Deep beneath Glacier Peak, the Frost Colossus awoke, and in one night it carried off Princess Deaneyrs, the last Songkeeper.',
    'Without her song, the wards are failing. Ice spreads across the land, and monsters pour down from the glacier.',
    'King Aldric has called for Wardens. You answered. Fight through six frozen realms, win back the Warding Shards, and bring the princess home.',
  ];
  const RESCUE_PAGES = [
    'The Frost Colossus shattered like a falling glacier. In the silence, a song rose through the ice.',
    'Princess Deaneyrs stood among the fallen crystals, unharmed. "Thank you, Warden," she whispered. "You heard me."',
    'Across Frostwatch, the wards blazed back to life, and for the first time in months, the snow began to melt.',
    'But on the horizon, a new storm gathered: the Whiteout. Someone woke the Colossus, and someone still wants the winter to last. The fight is not over.',
  ];
  const ENDLESS = ['Deaneyrs (distant voice)', 'The Whiteout is stronger now, Warden. Whoever woke the Colossus is still out there. Keep fighting.'];
  const STORY = [
    { name: 'Snowy Meadow',
      intro: ['King Aldric', "Warden! Frost imps are swarming the meadow. They came from the glacier the night Deaneyrs vanished. Drive them back!"],
      boss: ['Snowdrift Brute', 'GRRROAAAR! No one passes!'],
      outro: ['Deaneyrs (distant voice)', '...Warden? I can hear you through the ice. The wards are failing. Please, keep climbing.'],
      lore: 'Frost imps are scraps of glacier given life by the Long Winter.' },
    { name: 'Frostbite Woods',
      intro: ['Mira', 'The woods are full of frost wolves, Warden. Keep your distance, then strike. And roll when they lunge!'],
      boss: ['Frostfang Alpha', 'The pack hunts at your throat. Come.'],
      outro: ['Torvald', 'A Warding Shard from that beast! Good steel remembers the old magic. Keep collecting them.'],
      lore: 'The wolves of Frostbite serve the Alpha. Their fur grows ice when the winter is strong.' },
    { name: 'Winter Ruins',
      intro: ['Guard', 'Those ruins were the old watchtower. The dead do not rest there anymore. Watch for skeletons with shields.'],
      boss: ['Ruin Guardian', 'I have guarded this tower for a thousand winters. Turn back.'],
      outro: ['Deaneyrs (distant voice)', 'You are close. I can feel the wards humming. The Colossus keeps me at the peak. Please hurry.'],
      lore: 'The Ruin Guardian was the old captain of Frostwatch, bound by the Long Winter.' },
    { name: 'Frozen Lake',
      intro: ['Pip', 'The lake froze overnight, Warden! Yetis walk on it now. Hit them, then roll away. They hit like boulders!'],
      boss: ['Lake Colossus', 'Crack... crack... the ice remembers every step.'],
      outro: ['King Aldric', 'Four shards! The wards flicker back to life across the kingdom. Keep going, Warden.'],
      lore: 'Yetis are gentle in summer. The Long Winter drives them mad.' },
    { name: 'Blizzard Plains',
      intro: ['Deaneyrs (distant voice)', 'Be careful. The wraiths are the cold echoes of everyone who froze on the first night. They cannot be reasoned with.'],
      boss: ['Storm Titan', 'Whiteout! You will join the storm.'],
      outro: ['Deaneyrs (distant voice)', 'One last climb. The Frost Colossus was never evil. Something is feeding on his heart. Free us both.'],
      lore: 'Wraiths keep their distance and strike from afar. Close in with a roll.' },
    { name: 'Glacier Peak',
      intro: ['King Aldric', 'This is it, Warden. The peak. Deaneyrs is up there. Bring her home, and bring yourself home.'],
      boss: ['Frost Colossus', 'She is the heart of the winter. SHE IS MINE.'],
      outro: ['Deaneyrs', 'You did it.'],
      lore: 'The Frost Colossus guarded the Heartstone. Something corrupted it. Who?' },
  ];

  function typeInto(el, text, cps, onDone) {
    let i = 0, finished = false;
    el.textContent = '';
    const done = () => {
      if (!finished) {
        finished = true;
        if (onDone) onDone();
      }
    };
    const timer = setInterval(() => {
      i += 1;
      el.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(timer);
        done();
      }
    }, 1000 / cps);
    return { finish: () => { clearInterval(timer); el.textContent = text; done(); } };
  }

  const cut = mk('position:fixed;top:0;left:0;right:0;bottom:0;background:linear-gradient(#0a1020,#1b2a4a 55%,#3b4f78);z-index:40;display:none;flex-direction:column;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;color:#fff;font-family:Georgia,serif;text-align:center;');
  const cutText = document.createElement('div');
  cutText.style.cssText = 'max-width:640px;font-size:24px;line-height:1.6;min-height:160px;';
  const cutHint = document.createElement('div');
  cutHint.textContent = 'Click, tap or press Space to continue';
  cutHint.style.cssText = 'font:13px sans-serif;color:#8fa0c0;margin-top:20px;';
  const skip = document.createElement('button');
  skip.textContent = 'Skip story';
  skip.style.cssText = 'margin-top:18px;padding:6px 14px;border-radius:8px;border:0;background:#3a4258;color:#fff;cursor:pointer;font:13px sans-serif;';
  cut.appendChild(cutText);
  cut.appendChild(cutHint);
  cut.appendChild(skip);
  let pages = [], pi = 0, cutDone = null, typing = null, cutOpen = false;
  function showPage() {
    typing = typeInto(cutText, pages[pi], 38, () => { typing = null; });
  }
  function closeCut() {
    cutOpen = false;
    cut.style.display = 'none';
    window.STORY_BLOCK = false;
    if (cutDone) cutDone();
  }
  function advance() {
    if (!cutOpen) return;
    if (typing) { typing.finish(); return; }
    pi += 1;
    if (pi >= pages.length) closeCut();
    else showPage();
  }
  function playCut(p, done) {
    pages = p;
    pi = 0;
    cutDone = done || null;
    cutOpen = true;
    window.STORY_BLOCK = true;
    cut.style.display = 'flex';
    showPage();
  }
  cut.addEventListener('click', advance);
  skip.addEventListener('click', (e) => { e.stopPropagation(); closeCut(); });
  window.addEventListener('keydown', (e) => {
    if (cutOpen && (e.code === 'Space' || e.code === 'Enter')) {
      e.preventDefault();
      advance();
    }
  });
  let seen = false;
  try { seen = localStorage.getItem('storySeen') === '1'; } catch (e) { seen = false; }
  if (!seen) {
    setTimeout(() => playCut(INTRO_PAGES, () => {
      try { localStorage.setItem('storySeen', '1'); } catch (e) { /* ignore */ }
    }), 700);
  }

  const box = mk('position:fixed;left:50%;bottom:150px;transform:translateX(-50%);width:min(560px,92vw);background:rgba(10,14,24,.88);border:1px solid #5a6a8a;border-radius:12px;padding:12px 16px;color:#fff;font:15px/1.5 sans-serif;z-index:12;display:none;');
  const spk = document.createElement('div');
  spk.style.cssText = 'font-weight:bold;color:#ffd36b;margin-bottom:2px;';
  const txt = document.createElement('div');
  box.appendChild(spk);
  box.appendChild(txt);
  const queue = [];
  let busy = false;
  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    const item = queue.shift();
    spk.textContent = item[0];
    box.style.display = 'block';
    typeInto(txt, item[1], 45, () => {
      setTimeout(() => {
        box.style.display = 'none';
        busy = false;
        pump();
      }, 2800 + item[1].length * 18);
    });
  }
  function dialog(speaker, text) {
    queue.push([speaker, text]);
    pump();
  }

  const big = mk('position:fixed;top:36%;left:50%;transform:translateX(-50%);font:bold 38px sans-serif;text-shadow:0 3px 12px #000;z-index:11;pointer-events:none;opacity:0;transition:opacity .25s;text-align:center;');
  let bigTimer = 0;
  function shout(text, color) {
    big.textContent = text;
    big.style.color = color;
    big.style.opacity = '1';
    clearTimeout(bigTimer);
    bigTimer = setTimeout(() => { big.style.opacity = '0'; }, 1500);
  }
  socket.on('perfect', () => {
    shout('PERFECT DODGE!  x1.5 damage', '#ffd36b');
    if (window.SFX) window.SFX.play('chest', 0.5);
  });
  socket.on('bossEnrage', () => {
    shout('THE BOSS IS ENRAGED!', '#ff5a5a');
    if (window.SFX) window.SFX.play('growl', 1);
  });

  let reached = 0, rescued = false;
  const jbtn = mk('position:fixed;top:475px;right:10px;background:rgba(0,0,0,.55);color:#ffe9a8;font:bold 13px sans-serif;padding:5px 9px;border-radius:6px;z-index:6;cursor:pointer;user-select:none;');
  jbtn.textContent = '\u{1F4D6} Journal [J]';
  const jpanel = mk('position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(5,8,14,.78);z-index:22;display:none;align-items:center;justify-content:center;');
  const jcard = document.createElement('div');
  jcard.style.cssText = 'width:min(520px,94vw);max-height:90vh;overflow:auto;background:#12161f;border:1px solid #3a4258;border-radius:12px;padding:16px;color:#fff;font:14px/1.5 sans-serif;';
  jpanel.appendChild(jcard);
  let jopen = false;
  function renderJournal() {
    jcard.textContent = '';
    const add = (css, text) => {
      const d = document.createElement('div');
      d.style.cssText = css;
      d.textContent = text;
      jcard.appendChild(d);
    };
    add('font:bold 20px sans-serif;color:#ffd36b;margin-bottom:8px;', "Warden's Journal");
    add('margin-bottom:10px;', "The Long Winter has fallen on Frostwatch. The Frost Colossus awoke beneath Glacier Peak and carried off Princess Deaneyrs, whose song keeps the kingdom's winter-wards alive. Without her, ice spreads and monsters pour from the glacier.");
    const lap = Math.floor(reached / 6);
    add('color:#9fd8ff;margin-bottom:10px;', 'Objective: ' + (lap === 0 ? 'Climb to Glacier Peak and rescue Princess Deaneyrs.' : 'Survive the Whiteout and find out who woke the Colossus.'));
    add('margin-bottom:10px;', 'Warding Shards: ' + Math.min(6, reached) + '/6');
    for (let i = 0; i <= Math.min(5, reached); i++) add('font-size:13px;color:#b8c4dc;margin:4px 0;', STORY[i].name + ': ' + STORY[i].lore);
    const close = document.createElement('button');
    close.textContent = 'Close';
    close.style.cssText = 'margin-top:12px;padding:8px 16px;border-radius:8px;border:0;background:#3a4258;color:#fff;cursor:pointer;font:bold 13px sans-serif;';
    close.addEventListener('click', closeJournal);
    jcard.appendChild(close);
  }
  function openJournal() {
    jopen = true;
    renderJournal();
    jpanel.style.display = 'flex';
  }
  function closeJournal() {
    jopen = false;
    jpanel.style.display = 'none';
  }
  jbtn.addEventListener('click', () => { if (jopen) closeJournal(); else openJournal(); });
  jpanel.addEventListener('click', (e) => { if (e.target === jpanel) closeJournal(); });
  jpanel.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.code === 'Escape' || e.code === 'KeyJ') closeJournal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyJ' && !e.repeat) { if (jopen) closeJournal(); else openJournal(); }
  });

  let lastKey = '';
  socket.on('stage', (d) => {
    reached = Math.max(reached, d.idx);
    if (jopen) renderJournal();
    const key = d.idx + '|' + d.phase + '|' + d.msg;
    if (key === lastKey) return;
    lastKey = key;
    const inArena = !window.MY_ZONE || window.MY_ZONE === 'arena';
    if (!inArena) return;
    const i = d.idx % 6;
    const lap = Math.floor(d.idx / 6);
    const m = d.msg || '';
    if (m.indexOf('Level ') === 0) {
      const b = lap === 0 ? STORY[i].intro : ENDLESS;
      dialog(b[0], b[1]);
    } else if (m.indexOf('BOSS') === 0) {
      const b = STORY[i].boss;
      dialog(b[0], b[1]);
    } else if (m.indexOf('ALL LEVELS CLEARED') === 0) {
      if (!rescued) {
        rescued = true;
        playCut(RESCUE_PAGES);
      } else {
        dialog(ENDLESS[0], ENDLESS[1]);
      }
    } else if (m.indexOf('LEVEL CLEARED') === 0) {
      const prev = (d.idx - 1) % 6;
      dialog('Warding Shard', 'Collected! (' + (prev + 1) + '/6)');
      dialog(STORY[prev].outro[0], STORY[prev].outro[1]);
    }
  });
}
