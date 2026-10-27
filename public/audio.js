export function initAudio(G) {
  const { socket } = G;
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(ctx.destination);
  const musicBus = ctx.createGain();
  musicBus.gain.value = 0.3;
  musicBus.connect(master);
  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.8;
  sfxBus.connect(master);
  const ambBus = ctx.createGain();
  ambBus.gain.value = 0.7;
  ambBus.connect(master);

  const nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = nbuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const now = () => ctx.currentTime;

  function tone(f0, type, dur, vol, f1, delay = 0, bus = sfxBus) {
    const t = now() + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, ftype, f0, f1, delay = 0, bus = sfxBus) {
    const t = now() + delay;
    const s = ctx.createBufferSource();
    s.buffer = nbuf;
    const f = ctx.createBiquadFilter();
    f.type = ftype;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(bus);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  function growl(v, pitch) {
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(pitch, t);
    o.frequency.linearRampToValueAtTime(pitch * 0.7, t + 0.8);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 26;
    const lg = ctx.createGain();
    lg.gain.value = 0.25 * v;
    lfo.connect(lg);
    lg.connect(g.gain);
    o.connect(lp);
    lp.connect(g);
    g.connect(sfxBus);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.9);
    lfo.stop(t + 0.9);
  }

  // SFXV2
  const reverb = ctx.createConvolver();
  const irLen = Math.floor(ctx.sampleRate * 2.6);
  const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.6);
  }
  reverb.buffer = ir;
  const revOut = ctx.createGain();
  revOut.gain.value = 0.4;
  reverb.connect(revOut);
  revOut.connect(master);
  const musicSend = ctx.createGain();
  musicSend.gain.value = 0.5;
  musicBus.connect(musicSend);
  musicSend.connect(reverb);
  const sfxSend = ctx.createGain();
  sfxSend.gain.value = 0.25;
  sfxBus.connect(sfxSend);
  sfxSend.connect(reverb);

  const crack = (v) => noise(0.04, 0.9 * v, 'highpass', 3000, null);

  const SFX = {
    swing(v = 1) {
      noise(0.22, 0.3 * v, 'bandpass', 700, 3200);
      noise(0.12, 0.12 * v, 'highpass', 4000, 9000, 0.04);
      tone(2200, 'sine', 0.18, 0.03 * v, 3600);
    },
    flame(v = 1) {
      SFX.swing(v);
      noise(0.5, 0.25 * v, 'bandpass', 1200, 400, 0.05);
      tone(90, 'sawtooth', 0.4, 0.1 * v, 60, 0.02);
    },
    axe(v = 1) {
      noise(0.35, 0.4 * v, 'bandpass', 300, 1500);
      tone(80, 'sine', 0.35, 0.5 * v, 32, 0.15);
      noise(0.3, 0.3 * v, 'lowpass', 900, 150, 0.15);
    },
    pistol(v = 1) {
      crack(v * 0.8);
      noise(0.16, 0.7 * v, 'bandpass', 1800, 300);
      tone(150, 'sine', 0.2, 0.7 * v, 40);
      noise(1.0, 0.18 * v, 'lowpass', 700, 120, 0.03);
    },
    rifle(v = 1) {
      crack(v);
      noise(0.22, 0.85 * v, 'bandpass', 1400, 200);
      tone(110, 'sine', 0.35, 0.9 * v, 30);
      noise(1.6, 0.25 * v, 'lowpass', 600, 80, 0.04);
      tone(60, 'sine', 0.6, 0.4 * v, 28, 0.05);
    },
    hit(v = 1) {
      tone(120, 'sine', 0.14, 0.45 * v, 50);
      noise(0.1, 0.35 * v, 'lowpass', 1500, 300);
    },
    hurt(v = 1) {
      tone(300, 'sawtooth', 0.22, 0.25 * v, 140);
      noise(0.12, 0.25 * v, 'bandpass', 900, 300);
      tone(90, 'sine', 0.15, 0.4 * v, 45);
    },
    monsterHit(v = 1) {
      noise(0.08, 0.5 * v, 'bandpass', 900, 300);
      tone(140, 'sawtooth', 0.18, 0.35 * v, 60);
    },
    monsterDie(v = 1) {
      tone(170, 'sawtooth', 0.9, 0.4 * v, 30);
      tone(110, 'sawtooth', 0.9, 0.3 * v, 26, 0.05);
      noise(0.8, 0.3 * v, 'bandpass', 500, 100);
    },
    growl(v = 1) {
      const p = 70 + Math.random() * 25;
      growl(v, p);
      growl(v * 0.6, p * 1.5);
    },
    chest(v = 1) {
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        tone(f, 'triangle', 0.6, 0.18 * v, null, i * 0.07);
        tone(f * 2, 'sine', 0.5, 0.05 * v, null, i * 0.07 + 0.02);
      });
    },
    fanfare(v = 1) {
      [392, 494, 587, 784].forEach((f) => tone(f, 'sawtooth', 0.9, 0.1 * v, null, 0));
      [523, 659, 784, 1047].forEach((f) => tone(f, 'sawtooth', 1.2, 0.1 * v, null, 0.35));
      tone(1568, 'sine', 1.4, 0.08 * v, null, 0.4);
    },
    jump(v = 1) { tone(280, 'sine', 0.14, 0.2 * v, 520); },
    roll(v = 1) { noise(0.3, 0.3 * v, 'bandpass', 700, 250); },
    step(v = 1) {
      noise(0.09, 0.14 * v, 'bandpass', 1400, 500);
      tone(70, 'sine', 0.08, 0.1 * v, 45);
    },
    respawn(v = 1) { tone(200, 'sine', 0.4, 0.25 * v, 900); },
    owl(v = 1) {
      tone(430, 'sine', 0.3, 0.12 * v, 380, 0, ambBus);
      tone(430, 'sine', 0.3, 0.12 * v, 370, 0.45, ambBus);
    },
    bird(v = 1) {
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) tone(2600 + Math.random() * 800, 'sine', 0.07, 0.05 * v, 3800, i * 0.1, ambBus);
    },
    howl(v = 1) {
      const t = now();
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(300, t);
      o.frequency.linearRampToValueAtTime(620, t + 1.0);
      o.frequency.linearRampToValueAtTime(420, t + 2.4);
      const vib = ctx.createOscillator();
      vib.frequency.value = 5.5;
      const vg = ctx.createGain();
      vg.gain.value = 14;
      vib.connect(vg);
      vg.connect(o.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.1 * v, t + 0.6);
      g.gain.linearRampToValueAtTime(0.0001, t + 2.5);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1200;
      o.connect(lp);
      lp.connect(g);
      g.connect(ambBus);
      o.start(t);
      vib.start(t);
      o.stop(t + 2.6);
      vib.stop(t + 2.6);
    },
  };

  const buffers = {};
  function playFile(name, v) {
    const b = buffers[name];
    if (!b) return false;
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = 0.95 + Math.random() * 0.1;
    const g = ctx.createGain();
    g.gain.value = Math.min(1, v === undefined ? 1 : v);
    src.connect(g);
    g.connect(sfxBus);
    src.start();
    return true;
  }
  function startFileMusic(buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(g);
    g.connect(master);
    src.start();
    musicBus.gain.value = 0;
  }
  async function tryLoad(name) {
    for (const ext of ['mp3', 'ogg', 'wav']) {
      try {
        const r = await fetch('sounds/' + name + '.' + ext);
        if (!r.ok) continue;
        const buf = await ctx.decodeAudioData(await r.arrayBuffer());
        buffers[name] = buf;
        console.log('Loaded sound file:', name + '.' + ext);
        if (name === 'music') startFileMusic(buf);
        return;
      } catch (err) {
        // try the next file type
      }
    }
  }
  ['music', 'swing', 'flame', 'axe', 'pistol', 'rifle', 'hit', 'hurt', 'monsterHit', 'monsterDie', 'growl', 'chest', 'fanfare', 'jump', 'roll', 'step', 'respawn', 'owl', 'bird', 'howl'].forEach(tryLoad);

  SFX.play = (name, v) => {
    if (ctx.state !== 'running') return;
    if (playFile(name, v)) return;
    if (typeof SFX[name] === 'function') SFX[name](v);
  };
  window.SFX = SFX;
  // SFXWAR
  const crackSound = (v) => noise(0.03, 1.0 * v, 'highpass', 3500, null);
  SFX.pistol = (v = 1) => {
    crackSound(v * 0.8);
    noise(0.12, 0.8 * v, 'bandpass', 2200, 400);
    tone(180, 'sine', 0.18, 0.9 * v, 38);
    noise(0.9, 0.25 * v, 'lowpass', 900, 100, 0.03);
    tone(3200, 'square', 0.02, 0.08 * v, 1800, 0.18);
  };
  SFX.rifle = (v = 1) => {
    crackSound(v);
    noise(0.2, 0.9 * v, 'bandpass', 1800, 300);
    noise(0.25, 0.15 * v, 'bandpass', 4000, 800, 0.02);
    tone(110, 'sine', 0.45, 1.0 * v, 28);
    noise(1.8, 0.3 * v, 'lowpass', 700, 80, 0.04);
    tone(3000, 'square', 0.02, 0.08 * v, 1700, 0.3);
  };
  SFX.clash = (v = 1) => {
    tone(1900, 'square', 0.25, 0.1 * v, 1700);
    tone(2850, 'sine', 0.35, 0.1 * v, 2600);
    noise(0.08, 0.4 * v, 'highpass', 5000, null);
  };
  SFX.swing = (v = 1) => {
    noise(0.25, 0.4 * v, 'bandpass', 500, 2500);
    noise(0.12, 0.15 * v, 'highpass', 4000, 9000, 0.04);
    tone(150, 'sine', 0.15, 0.2 * v, 80);
  };
  SFX.hit = (v = 1) => {
    tone(110, 'sine', 0.2, 0.6 * v, 45);
    noise(0.1, 0.4 * v, 'lowpass', 1500, 300);
    if (Math.random() < 0.4) SFX.clash(v * 0.7);
  };
  SFX.slam = (v = 1) => {
    tone(70, 'sine', 0.8, 1.0 * v, 25);
    noise(1.2, 0.5 * v, 'lowpass', 700, 90);
    crackSound(v * 0.6);
    tone(45, 'sine', 0.9, 0.7 * v, 22, 0.05);
  };
  SFX.monsterDie = (v = 1) => {
    tone(150, 'sawtooth', 1.1, 0.5 * v, 24);
    tone(95, 'sawtooth', 1.1, 0.4 * v, 22, 0.04);
    noise(1.0, 0.35 * v, 'bandpass', 500, 90);
    tone(70, 'sine', 0.5, 0.6 * v, 30, 0.05);
  };
  SFX.growl = (v = 1) => {
    const p = 62 + Math.random() * 22;
    growl(v, p);
    growl(v * 0.7, p * 1.5);
    growl(v * 0.5, p * 0.5);
  };

  function speak(text, pitch, rate) {
    try {
      if (window.NO_ANNOUNCER || !window.speechSynthesis || master.gain.value === 0) return;
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch;
      u.rate = rate;
      u.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((x) => /^en/i.test(x.lang) && /male|david|daniel|alex|guy|mark|george/i.test(x.name)) || voices.find((x) => /^en/i.test(x.lang));
      if (v) u.voice = v;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (err) {
      /* ignore */
    }
  }
  SFX.announce = (text) => speak(text, 0.3, 0.8);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyV' && !e.repeat) window.NO_ANNOUNCER = !window.NO_ANNOUNCER;
  });
  let lastAnn = '';
  socket.on('stage', (d) => {
    const m = d.msg || '';
    const key = d.idx + '|' + m;
    if (key === lastAnn) return;
    lastAnn = key;
    if (window.MY_ZONE && window.MY_ZONE !== 'arena') return;
    if (m.indexOf('WAVE 1') === 0) SFX.announce('Level ' + d.level + '. Fight!');
    else if (m.indexOf('BOSS') === 0) SFX.announce('Boss incoming!');
    else if (m.indexOf('ALL LEVELS CLEARED') === 0) SFX.announce('Victory!');
    else if (m.indexOf('LEVEL CLEARED') === 0) SFX.announce('Level cleared!');
  });
  socket.on('gameOver', () => SFX.announce('Game over.'));
  socket.on('combo', (d) => {
    if (d.id === socket.id && d.n === 5) SFX.announce('Unstoppable!');
  });


  const windSrc = ctx.createBufferSource();
  windSrc.buffer = nbuf;
  windSrc.loop = true;
  const windF = ctx.createBiquadFilter();
  windF.type = 'lowpass';
  windF.frequency.value = 500;
  const windG = ctx.createGain();
  windG.gain.value = 0.05;
  const windLfo = ctx.createOscillator();
  windLfo.frequency.value = 0.12;
  const wl = ctx.createGain();
  wl.gain.value = 250;
  windLfo.connect(wl);
  wl.connect(windF.frequency);
  windSrc.connect(windF);
  windF.connect(windG);
  windG.connect(ambBus);
  windSrc.start();
  windLfo.start();

  const cri = ctx.createOscillator();
  cri.type = 'sine';
  cri.frequency.value = 4300;
  const criAmp = ctx.createGain();
  criAmp.gain.value = 0.5;
  const criLfo = ctx.createOscillator();
  criLfo.type = 'square';
  criLfo.frequency.value = 9;
  const criL = ctx.createGain();
  criL.gain.value = 0.5;
  const criN = ctx.createGain();
  criN.gain.value = 0;
  criLfo.connect(criL);
  criL.connect(criAmp.gain);
  cri.connect(criAmp);
  criAmp.connect(criN);
  criN.connect(ambBus);
  cri.start();
  criLfo.start();

  const CH = [
    { bass: 50, pad: [50, 53, 57] },
    { bass: 46, pad: [46, 50, 53] },
    { bass: 53, pad: [53, 57, 60] },
    { bass: 48, pad: [48, 52, 55] },
    { bass: 50, pad: [50, 53, 57] },
    { bass: 46, pad: [46, 50, 53] },
    { bass: 48, pad: [48, 52, 55] },
    { bass: 45, pad: [45, 49, 52] },
  ];
  const MEL = [
    [[69, 0, 4], [74, 4, 4], [77, 8, 2], [76, 10, 2], [74, 12, 4]],
    [[74, 0, 4], [72, 4, 4], [70, 8, 4], [72, 12, 4]],
    [[69, 0, 4], [72, 4, 4], [77, 8, 4], [76, 12, 2], [72, 14, 2]],
    [[76, 0, 8], [74, 8, 4], [72, 12, 4]],
    [[69, 0, 4], [74, 4, 4], [77, 8, 2], [79, 10, 2], [81, 12, 4]],
    [[79, 0, 4], [77, 4, 4], [74, 8, 8]],
    [[76, 0, 4], [79, 4, 4], [76, 8, 4], [74, 12, 4]],
    [[73, 0, 4], [76, 4, 4], [69, 8, 8]],
  ];
  const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const isNight = () => window.TOD !== undefined && window.TOD >= 19.5 && window.TOD <= 29.5;

  function musNote(m, t, dur, type, vol, atk, rel, lp) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = m2f(m);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + atk);
    g.gain.setValueAtTime(vol, t + Math.max(atk, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    o.connect(g);
    let out = g;
    if (lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      g.connect(f);
      out = f;
    }
    out.connect(musicBus);
    o.start(t);
    o.stop(t + dur + rel + 0.05);
  }

  function kick(t, vol) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + 0.25);
  }

  // MUSICV2
  function stringVoice(m, t, dur, vol) {
    for (const det of [-9, 0, 9]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = m2f(m);
      o.detune.value = det;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1300;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.5);
      g.gain.setValueAtTime(vol, t + Math.max(0.5, dur - 0.4));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.7);
      o.connect(f);
      f.connect(g);
      g.connect(musicBus);
      o.start(t);
      o.stop(t + dur + 0.8);
    }
  }

  function brassNote(m, t, dur, vol) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = m2f(m);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const lg = ctx.createGain();
    lg.gain.value = 6;
    lfo.connect(lg);
    lg.connect(o.detune);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(700, t);
    f.frequency.linearRampToValueAtTime(2600, t + 0.12);
    f.frequency.linearRampToValueAtTime(1800, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
    g.gain.setValueAtTime(vol, t + Math.max(0.05, dur - 0.1));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
    o.connect(f);
    f.connect(g);
    g.connect(musicBus);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.2);
    lfo.stop(t + dur + 0.2);
  }

  function taiko(t, vol) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + 0.55);
    noise(0.05, vol * 0.5, 'bandpass', 800, 300, Math.max(0, t - now()), musicBus);
  }

  // WARV3
  let warPhase = 'intermission', warLevel = 0;
  socket.on('stage', (d) => { warPhase = d.phase; warLevel = d.idx; });

  function warMode() {
    const zone = window.MY_ZONE;
    if (zone && zone !== 'arena') return 'calm';
    if (warPhase === 'boss') return 'boss';
    if (warPhase === 'wave') return 'battle';
    return 'tense';
  }
  function warTempo() {
    const m = warMode();
    const lv = Math.min(warLevel, 8);
    if (m === 'calm') return 78;
    if (m === 'tense') return 100;
    if (m === 'battle') return 126 + lv * 3;
    return 138 + lv * 2;
  }

  const WCH = [
    { root: 38, notes: [50, 53, 57] },
    { root: 34, notes: [46, 50, 53] },
    { root: 31, notes: [43, 46, 50] },
    { root: 33, notes: [45, 49, 52] },
  ];
  const RIFF = [
    [62, 62, 65, 62, 69, 62, 65, 67],
    [58, 58, 62, 58, 65, 58, 62, 60],
    [55, 55, 58, 55, 62, 55, 58, 60],
    [57, 57, 61, 57, 64, 57, 61, 62],
  ];

  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) curve[i] = Math.tanh((i / 512 - 1) * 4);
  shaper.curve = curve;
  const shaperOut = ctx.createGain();
  shaperOut.gain.value = 0.5;
  shaper.connect(shaperOut);
  shaperOut.connect(musicBus);

  function bassHit(m, t, dur, vol) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = m2f(m);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    o.connect(g);
    g.connect(lp);
    lp.connect(shaper);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function scheduleStep(i, t, night, tempo) {
    const mode = warMode();
    const bar = Math.floor(i / 16) % 4;
    const s = i % 16;
    const c = WCH[bar];
    const spb = 60 / tempo / 4;
    const delay = Math.max(0, t - now());
    if (mode === 'calm') {
      if (s === 0) c.notes.forEach((m) => stringVoice(m + 12, t, spb * 15, 0.03));
      if (s === 0 || s === 8) taiko(t, 0.3);
      if (s % 4 === 0) musNote(c.notes[(s / 4) % 3] + 24, t, spb * 3, 'triangle', 0.05, 0.01, 0.4, 2500);
      return;
    }
    const hot = mode === 'battle' || mode === 'boss';
    const boss = mode === 'boss';
    if (s === 0) {
      c.notes.forEach((m) => stringVoice(m + 12, t, spb * 15, boss ? 0.05 : 0.035));
      if (bar === 0) noise(1.6, boss ? 0.16 : 0.1, 'highpass', 5000, 2500, delay, musicBus);
    }
    if (hot) {
      const acc = [1, 0.5, 0.75, 0.5][s % 4];
      bassHit(c.root + 12, t, spb * 0.9, 0.5 * acc);
    } else if (s % 4 === 0) {
      bassHit(c.root + 12, t, spb * 3, 0.45);
    }
    if (s === 0) taiko(t, 0.95);
    else if (hot && (s === 6 || s === 8 || s === 10)) taiko(t, 0.7);
    else if (!hot && s === 8) taiko(t, 0.6);
    if (hot && (s === 4 || s === 12)) {
      noise(0.16, 0.35, 'bandpass', 2200, 700, delay, musicBus);
      noise(0.08, 0.2, 'highpass', 4000, 6000, delay, musicBus);
    }
    if (hot && s % 2 === 0) noise(0.03, 0.06, 'highpass', 8000, null, delay, musicBus);
    if (boss && s % 2 === 1) noise(0.03, 0.04, 'highpass', 8000, null, delay, musicBus);
    if (hot && s % 2 === 0) brassNote(RIFF[bar][s / 2], t, spb * 1.7, boss ? 0.06 : 0.045);
    if (hot && (s === 0 || s === 6 || s === 10)) {
      [c.notes[0] + 12, c.notes[2] + 12].forEach((m) => brassNote(m, t, spb * 2.5, 0.06));
    }
    if (hot && bar === 3 && s >= 12) taiko(t, 0.5 + (s - 12) * 0.1);
  }

  let step = 0, nextT = 0, started = false;
  setInterval(() => {
    if (ctx.state !== 'running') return;
    if (!started || nextT < ctx.currentTime - 0.5) {
      nextT = ctx.currentTime + 0.1;
      started = true;
    }
    const night = isNight();
    const tempo = warTempo();
    while (nextT < ctx.currentTime + 0.2) {
      scheduleStep(step, nextT, night, tempo);
      nextT += 60 / tempo / 4;
      step++;
    }
  }, 50);

  const dist = (id) => {
    const me = G.getMe();
    const e = G.getEntity(id);
    if (!me || !e) return 0;
    return Math.hypot(me.group.position.x - e.group.position.x, me.group.position.z - e.group.position.z);
  };
  const vol = (d) => Math.min(Math.max(1 - d / 16, 0.1), 1);

  socket.on('attackEffect', (d) => {
    const v = vol(dist(d.id));
    const w = d.weapon || 'sword';
    if (w === 'pistol') SFX.play('pistol', v);
    else if (w === 'rifle') SFX.play('rifle', v);
    else if (w === 'flame') SFX.play('flame', v);
    else if (w === 'axe') SFX.play('axe', v);
    else SFX.play('swing', v);
  });
  socket.on('hpUpdate', (d) => {
    if (d.id === socket.id) SFX.play('hurt', 1);
    else SFX.play('hit', vol(dist(d.id)));
  });
  socket.on('playerRespawn', (d) => { if (d.id === socket.id) SFX.play('respawn', 1); });
  socket.on('roll', (d) => SFX.play('roll', vol(dist(d.id))));
  socket.on('chestOpened', (d) => {
    if (d.who === socket.id) SFX.play('fanfare', 1);
    else SFX.play('chest', 0.5);
  });

  const prev = {};
  let growlCd = 0;
  socket.on('enemies', (list) => {
    const me = G.getMe();
    const seen = {};
    let nearest = Infinity;
    for (const en of list) {
      seen[en.id] = true;
      const d = me ? Math.hypot(me.group.position.x - en.x / 50, me.group.position.z - en.y / 50) : 99;
      nearest = Math.min(nearest, d);
      if (prev[en.id] && en.hp < prev[en.id].hp) SFX.play('monsterHit', vol(d));
      prev[en.id] = { hp: en.hp, d };
    }
    for (const id in prev) {
      if (!seen[id]) {
        SFX.play('monsterDie', vol(prev[id].d));
        delete prev[id];
      }
    }
    const t = performance.now();
    if (nearest < 9 && t > growlCd) {
      SFX.play('growl', Math.min(1, (10 - nearest) / 8));
      growlCd = t + 2500 + Math.random() * 3000;
    }
  });

  const btn = document.createElement('div');
  btn.style.cssText = 'position:fixed;top:385px;right:10px;background:rgba(0,0,0,.55);color:#fff;font:13px sans-serif;padding:5px 9px;border-radius:6px;z-index:6;cursor:pointer;user-select:none;';
  document.body.appendChild(btn);
  let muted = false;
  function refresh() {
    btn.textContent = ctx.state !== 'running' ? '\u{1F507} Click to enable sound' : muted ? '\u{1F507} Muted [M]' : '\u{1F50A} Sound [M]';
  }
  function unlock() {
    if (ctx.state !== 'running') ctx.resume().then(refresh);
  }
  ctx.onstatechange = refresh;
  ['pointerdown', 'pointerup', 'keydown', 'touchstart', 'touchend', 'click'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
  function toggleMute() {
    muted = !muted;
    master.gain.value = muted ? 0 : 0.9;
    refresh();
  }
  btn.addEventListener('click', toggleMute);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM' && !e.repeat) toggleMute();
  });
  refresh();

  let lastPos = null, stepT = 0, nextOwl = 8, nextHowl = 40, nextBird = 4, last = performance.now();
  function tick() {
    requestAnimationFrame(tick);
    const nowMs = performance.now();
    const dt = Math.min((nowMs - last) / 1000, 0.2);
    last = nowMs;
    const running = ctx.state === 'running';
    const me = G.getMe();
    if (me && running) {
      const p = me.group.position;
      if (lastPos) {
        const sp = Math.hypot(p.x - lastPos.x, p.z - lastPos.z) / Math.max(dt, 0.001);
        if (sp > 1 && p.y < 0.05) {
          stepT -= dt;
          if (stepT <= 0) {
            SFX.play('step', 0.8);
            stepT = sp > 8 ? 0.26 : 0.4;
          }
        }
      }
      lastPos = { x: p.x, z: p.z };
    }
    const night = isNight();
    criN.gain.value += ((night ? 0.012 : 0) - criN.gain.value) * Math.min(1, dt);
    windG.gain.value = night ? 0.06 : 0.04;
    if (running) {
      if (night) {
        nextOwl -= dt;
        nextHowl -= dt;
        if (nextOwl <= 0) { SFX.play('owl', 1); nextOwl = 14 + Math.random() * 14; }
        if (nextHowl <= 0) { SFX.play('howl', 1); nextHowl = 45 + Math.random() * 45; }
      } else {
        nextBird -= dt;
        if (nextBird <= 0) { SFX.play('bird', 1); nextBird = 3 + Math.random() * 6; }
      }
    }
  }
  tick();
}
