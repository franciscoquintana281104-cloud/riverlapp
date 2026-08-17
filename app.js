/* ===========================================================
   RIVERLAPP — lógica
   =========================================================== */

const LS = 'riverlapp.v1';
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const estado = {
  prefs: {},        // setId -> 0 (me raya) | 1 (me renta) | 2 (sí o sí)
  historial: [],    // para el rewind
  dia: 'vie',
  vista: 'fichar',
  modoPlan: 'plan', // 'plan' | 'cartel'
  intro: true,
  ajustes: { andar: 6, pausaMin: 25 },
  sim: null,        // desfase en ms sobre la hora real (null = hora real)
  registro: [],     // [{tipo, ts}] — lo que te has metido y cuándo
  otras: [],        // sustancias que has añadido tú
};

function guardar() {
  try {
    localStorage.setItem(LS, JSON.stringify({
      prefs: estado.prefs, dia: estado.dia, intro: estado.intro, ajustes: estado.ajustes,
      registro: estado.registro, otras: estado.otras,
    }));
  } catch (e) { /* modo privado */ }
}
function cargar() {
  try {
    const d = JSON.parse(localStorage.getItem(LS) || '{}');
    Object.assign(estado, {
      prefs: d.prefs || {},
      dia: d.dia || 'vie',
      intro: d.intro !== false,
      ajustes: Object.assign({ andar: 6, pausaMin: 25 }, d.ajustes || {}),
      registro: Array.isArray(d.registro) ? d.registro : [],
      otras: Array.isArray(d.otras) ? d.otras : [],
    });
  } catch (e) { /* nada */ }
}

/* La simulación es un DESFASE sobre la hora real, no un instante fijo: guardando
   un instante, el reloj se quedaba clavado y nada avanzaba. */
const ahora = () => Date.now() + (estado.sim || 0);

window.estado = estado; // para depurar desde la consola

/* ===========================================================
   PORTADAS GENERADAS
   =========================================================== */

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const HUES = [328, 340, 316, 300, 286, 272, 258, 244, 310, 292];

const PATRONES = [
  { p: 'radial-gradient(circle, rgba(255,255,255,.9) 2.6px, transparent 2.8px)', s: '34px 34px' },
  { p: 'repeating-linear-gradient(45deg, rgba(255,255,255,.8) 0 5px, transparent 5px 30px)', s: 'auto' },
  { p: 'repeating-linear-gradient(0deg, rgba(255,255,255,.55) 0 2px, transparent 2px 38px), repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 2px, transparent 2px 38px)', s: 'auto' },
  { p: 'repeating-radial-gradient(circle at 28% 14%, transparent 0 26px, rgba(255,255,255,.5) 26px 29px)', s: 'auto' },
  { p: 'conic-gradient(rgba(255,255,255,.62) 0 25%, transparent 0 50%, rgba(255,255,255,.62) 0 75%, transparent 0)', s: '58px 58px' },
  { p: 'repeating-linear-gradient(-30deg, rgba(255,255,255,.5) 0 7px, transparent 7px 44px)', s: 'auto' },
];

function estiloPortada(slug) {
  const h = hash(slug);
  const h1 = HUES[h % HUES.length];
  let h2 = HUES[(h >>> 7) % HUES.length];
  if (Math.abs(h2 - h1) < 22) h2 = (h1 + 62) % 360;
  const pat = PATRONES[(h >>> 13) % PATRONES.length];
  const rot = ((h >>> 19) % 40) - 20;
  return `--h1:${h1}; --h2:${h2}; --pat:${pat.p}; --pat-size:${pat.s}; --pat-rot:${rot}deg;`;
}

/* La marca tipográfica va rellena o en contorno, según el artista. */
function portadaHTML(s) {
  const contorno = (hash(s.slug) >>> 23) % 2 === 0;
  const foto = window.FOTOS && FOTOS[s.slug];
  return `
    <div class="cover ${contorno ? 'linea' : ''} ${foto ? 'con-foto' : ''}" style="${estiloPortada(s.slug)}">
      <div class="marca">${iniciales(s.name)}</div>
      ${foto ? `<img src="artistas/${foto}" alt=""><div class="tinte"></div><div class="tinte-2"></div>` : ''}
      <div class="franja"></div>
    </div>`;
}

function iniciales(nombre) {
  const limpio = nombre.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, ' ').trim();
  const partes = limpio.split(/\s+/).filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

/* ===========================================================
   BIOS DE PARODIA
   =========================================================== */

const BIOS_GEN = [
  'No busco nada serio. Bueno, sí: que vengas.',
  'Aquí para pasar un buen rato, no para hablar.',
  'Mi ex también estará en el festival, ignórala.',
  'Si tengo que explicarte quién soy, no me merezco.',
  'Me gustan los paseos largos… hasta la barra.',
  'Fan del contacto físico en primera fila.',
  '1,5 h de sueño. Energía intacta.',
  'Busco a alguien que se sepa la letra.',
  'No hago segundas citas, esto es una vez y ya.',
  'Sin ganas de dramas, solo de graves.',
  'Te va a doler el cuello mañana, aviso.',
  'Cero red flags. Bueno, una: el horario.',
  'Prometo no dejarte en visto.',
  'Emocionalmente no disponible hasta que suene el drop.',
];

function bioDe(s) {
  const h = hash(s.id);
  const hIni = +s.start.split(':')[0];
  const especiales = [];
  if (s.mins <= 30)  especiales.push(`Solo ${s.mins} min. Es corto pero intenso, como todo lo bueno.`);
  if (s.mins >= 90)  especiales.push(`${Math.round(s.mins / 60 * 10) / 10} h seguidas. Yo sí me comprometo.`);
  if (hIni >= 4 && hIni < 12) especiales.push('Salgo cuando ya casi es de día. Solo gente valiente.');
  if (hIni >= 18 && hIni < 20) especiales.push('Abro yo. Alguien tiene que romper el hielo.');
  if (s.sub)         especiales.push(`Venimos en grupo: ${s.sub.toLowerCase()}. Sin complejos.`);
  if (especiales.length && (h % 3 !== 0)) return especiales[h % especiales.length];
  return BIOS_GEN[h % BIOS_GEN.length];
}

/* ===========================================================
   PAUSAS
   =========================================================== */

const PAUSAS = {
  corta: [
    'Meada rápida, no te duermas',
    'Fumercio exprés',
    'Agua. Un vaso. Ya.',
    'Ratazo de paja',
  ],
  media: [
    'Hidratación y fumercio extremo',
    'Cola del baño ahora que no hay',
    'Cerveza, cigarro y vuelta',
    'Buscar a los que se han perdido',
    'Roba un cubata',
  ],
  larga: [
    'Esto es una cena históricarica',
    'Siesta táctica en la hierba',
    'Hidratación y fumercio extremo',
    'Vuelta al camping a por chubasquero',
    'Tiempo suficiente para arrepentirte y volver',
  ],
};

function mensajePausa(mins, semilla) {
  const banda = mins < 25 ? 'corta' : mins < 75 ? 'media' : 'larga';
  const lista = PAUSAS[banda];
  return lista[hash(String(semilla)) % lista.length];
}

/* ===========================================================
   TIEMPO
   =========================================================== */

function fmtDur(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
function fmtCorto(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return { n: m, u: 'MIN' };
  return { n: Math.floor(m / 60), u: 'H', extra: m % 60 };
}
/* Cuenta atrás en vivo: devuelve el número grande y la línea de debajo.
   Con más de un día manda el día; por debajo, el reloj con segundos. */
function fmtCuenta(ms) {
  const tot = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(tot / 86400);
  const h = Math.floor(tot / 3600) % 24;
  const m = Math.floor(tot / 60) % 60;
  const sg = tot % 60;
  const dos = n => String(n).padStart(2, '0');
  // el número grande siempre lleva segundos: si no, parece que está parado
  if (d > 0) return { grande: `${dos(h)}:${dos(m)}:${dos(sg)}`, pie: `Y ${d} DÍA${d === 1 ? '' : 'S'} MÁS` };
  if (h > 0) return { grande: `${h}:${dos(m)}:${dos(sg)}`, pie: 'RESTANTE' };
  return { grande: `${dos(m)}:${dos(sg)}`, pie: 'RESTANTE' };
}


function fmtHora(ts) {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ===========================================================
   ALGORITMO DEL PLAN
   =========================================================== */

function chocan(a, b, andar) {
  const m = (a.stage === b.stage ? 0 : andar) * 60000;
  return a.from < b.to + m && b.from < a.to + m;
}

function construirPlan(diaId) {
  const andar = estado.ajustes.andar;
  const delDia = SETS.filter(s => s.day === diaId);
  const sisi  = delDia.filter(s => estado.prefs[s.id] === 2);
  const renta = delDia.filter(s => estado.prefs[s.id] === 1);

  const elegidos = [];
  const conflictos = [];

  // 1) los sagrados entran todos; si dos se pisan, lo decide el usuario
  sisi.forEach(s => {
    const choque = elegidos.find(c => chocan(c, s, 0));
    if (choque) conflictos.push([choque, s]);
    elegidos.push(s);
  });

  // 2) los "me renta" rellenan huecos, contando el paseo entre escenarios
  renta.forEach(s => {
    if (elegidos.some(c => chocan(c, s, andar))) return;
    elegidos.push(s);
  });

  elegidos.sort((a, b) => a.from - b.from);

  // 3) timeline con pausas y avisos de "vas justo"
  const items = [];
  elegidos.forEach((s, i) => {
    const prev = elegidos[i - 1];
    let justo = false;
    if (prev && prev.stage !== s.stage) {
      const hueco = (s.from - prev.to) / 60000;
      if (hueco >= 0 && hueco < andar) justo = true;
    }
    if (prev) {
      const huecoMin = (s.from - prev.to) / 60000;
      if (huecoMin >= estado.ajustes.pausaMin) {
        items.push({ tipo: 'pausa', from: prev.to, to: s.from, mins: Math.round(huecoMin), siguiente: s });
      }
    }
    items.push({ tipo: 'set', set: s, justo });
  });

  return { items, conflictos, elegidos, total: elegidos.length };
}

function planCompleto() {
  const todo = [];
  FEST.days.forEach(d => todo.push(...construirPlan(d.id).elegidos));
  return todo.sort((a, b) => a.from - b.from);
}

/* ===========================================================
   VISTA: FICHAR (la pila tipo Tinder)
   =========================================================== */

let baraja = [];
let arrastrando = null;

function reconstruirBaraja() {
  baraja = SETS.filter(s => estado.prefs[s.id] === undefined);
}

function nodoCarta(s, capa) {
  const el = document.createElement('div');
  el.className = 'carta' + (capa === 1 ? ' atras' : capa === 2 ? ' atras-2' : '');
  el.dataset.id = s.id;
  const hue = FEST.stages[s.stage].hue;
  const total = SETS.filter(x => x.day === s.day).length;
  const idx = SETS.filter(x => x.day === s.day).indexOf(s);

  el.innerHTML = `
    ${portadaHTML(s)}
    <div class="carta-barras">${Array.from({ length: Math.min(total, 10) }, (_, i) =>
      `<i class="${i === Math.min(idx, 9) ? 'on' : ''}"></i>`).join('')}</div>
    <div class="sello renta">Me renta</div>
    <div class="sello raya">Me raya</div>
    <div class="sello sisi">★ Sí o sí ★</div>
    <div class="carta-info">
      <div class="carta-nom ${s.name.length > 20 ? 'muy-largo' : s.name.length > 13 ? 'largo' : ''}">
        <span>${s.name}</span><span class="carta-edad">${s.mins}</span>
        <span class="verificado">✓</span>
      </div>
      ${s.sub ? `<div class="carta-sub">${s.sub}</div>` : ''}
      <div class="carta-meta">
        <span class="chip esc" style="--h:${hue}">${s.stageName}</span>
        <span class="chip">${s.dayLabel}</span>
        <span class="chip">${s.start} – ${s.end}</span>
      </div>
      <div class="carta-bio">“${bioDe(s)}”</div>
    </div>`;
  return el;
}

function pintarPila() {
  const pila = $('#pila');
  pila.innerHTML = '';

  if (!baraja.length) {
    const hechas = Object.keys(estado.prefs).length;
    pila.innerHTML = `
      <div class="vacio" style="position:absolute;inset:0;display:grid;align-content:center">
        <div class="ic">🫠</div>
        <div class="t">No queda nadie por aquí</div>
        <div class="d">Has fichado a los ${hechas} artistas del cartel.<br>
        Ve a <b>MI PLAN</b>, que ya te lo he montado.</div>
        <button class="btn-grande" style="animation:none;margin-top:26px" onclick="irA('plan')">VER MI PLAN</button>
        <button class="btn-txt" style="animation:none" onclick="reiniciarBaraja()">Volver a empezar</button>
      </div>`;
    actualizarProgreso();
    return;
  }

  // se pintan del fondo hacia delante para que el orden en el DOM sea correcto
  baraja.slice(0, 3).reverse().forEach((s, i, arr) => {
    pila.appendChild(nodoCarta(s, arr.length - 1 - i));
  });

  const top = pila.lastElementChild;
  if (top) engancharArrastre(top);
  actualizarProgreso();
}

function actualizarProgreso() {
  const hechas = SETS.length - baraja.length;
  $('#deck-prog i').style.width = (hechas / SETS.length * 100) + '%';
  $('#deck-cont').textContent = `${hechas}/${SETS.length}`;
  $('#deck-txt').textContent = baraja.length
    ? `${baraja.length} perfiles cerca de ti`
    : 'Se te acabó el cartel';
  const n = Object.values(estado.prefs).filter(v => v >= 1).length;
  const badge = $('#badge-plan');
  badge.textContent = n;
  badge.style.display = n ? 'grid' : 'none';
}

/* Un solo repintado por fotograma: escribir estilos en cada pointermove
   (que llegan más rápido que los fotogramas) es lo que hacía que se notara
   pastoso el arrastre. */
let rafArrastre = null;

window.pintarArrastre = pintarArrastre; // accesible para depurar
function pintarArrastre() {
  rafArrastre = null;
  if (!arrastrando) return;
  const { carta, dx, dy, signo } = arrastrando;

  const giro = (dx / 16) * signo;
  carta.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${giro}deg)`;

  const arriba = dy < -40 && Math.abs(dy) > Math.abs(dx) * 1.2;
  arrastrando.sRenta.style.opacity = arriba ? 0 : Math.min(1, Math.max(0, dx / 90));
  arrastrando.sRaya.style.opacity  = arriba ? 0 : Math.min(1, Math.max(0, -dx / 90));
  arrastrando.sSisi.style.opacity  = arriba ? Math.min(1, -dy / 110) : 0;

  // la carta de debajo va emergiendo conforme la de arriba se va
  const atras = arrastrando.atras;
  if (atras) {
    const p = Math.min(1, Math.max(Math.abs(dx) / 150, Math.abs(dy) / 170));
    atras.style.transform = `scale(${(0.94 + 0.06 * p).toFixed(4)}) translateY(${(16 - 16 * p).toFixed(2)}px)`;
    atras.style.opacity = (0.85 + 0.15 * p).toFixed(3);
  }
}

function engancharArrastre(carta) {
  carta.addEventListener('pointerdown', e => {
    if (arrastrando) return;
    try { carta.setPointerCapture(e.pointerId); } catch (_) { /* puntero sintético */ }
    carta.classList.remove('suave', 'volviendo');

    // agarrar por la mitad de abajo invierte el giro, como una carta de verdad
    const caja = carta.getBoundingClientRect();
    const signo = (e.clientY - caja.top) > caja.height * 0.5 ? -1 : 1;

    arrastrando = {
      carta, signo,
      x0: e.clientX, y0: e.clientY, dx: 0, dy: 0,
      t: performance.now(), px: e.clientX, py: e.clientY, vx: 0, vy: 0,
      sRenta: $('.sello.renta', carta),
      sRaya:  $('.sello.raya', carta),
      sSisi:  $('.sello.sisi', carta),
      atras:  carta.previousElementSibling,
    };
    document.body.classList.add('arrastrando');
  });

  carta.addEventListener('pointermove', e => {
    const a = arrastrando;
    if (!a || a.carta !== carta) return;

    const t = performance.now();
    // dt mínimo de 8 ms: con el hilo principal atascado pueden llegar varios
    // eventos juntos, y sin esto la velocidad se dispara y decide sola
    const dt = Math.max(8, t - a.t);
    const tope = x => Math.max(-2.5, Math.min(2.5, x));   // px/ms
    // velocidad suavizada: así un golpe seco y corto también cuenta
    a.vx = tope(a.vx * 0.7 + ((e.clientX - a.px) / dt) * 0.3);
    a.vy = tope(a.vy * 0.7 + ((e.clientY - a.py) / dt) * 0.3);
    a.t = t; a.px = e.clientX; a.py = e.clientY;

    a.dx = e.clientX - a.x0;
    a.dy = e.clientY - a.y0;
    if (!rafArrastre) rafArrastre = requestAnimationFrame(pintarArrastre);
  });

  const soltar = () => {
    const a = arrastrando;
    if (!a || a.carta !== carta) return;
    arrastrando = null;
    document.body.classList.remove('arrastrando');
    if (rafArrastre) { cancelAnimationFrame(rafArrastre); rafArrastre = null; }

    // adónde iría la carta si la sueltas: cuenta el gesto, no solo la distancia
    const PROY = 110;
    const px = a.dx + a.vx * PROY;
    const py = a.dy + a.vy * PROY;

    if (py < -150 && Math.abs(py) > Math.abs(px)) return decidir(2, carta, a);
    if (px > 130)  return decidir(1, carta, a);
    if (px < -130) return decidir(0, carta, a);

    // vuelve a su sitio con un rebote corto
    carta.classList.add('volviendo');
    carta.style.transform = '';
    [a.sRenta, a.sRaya, a.sSisi].forEach(s => s && (s.style.opacity = 0));
    if (a.atras) { a.atras.style.transform = ''; a.atras.style.opacity = ''; }
  };
  carta.addEventListener('pointerup', soltar);
  carta.addEventListener('pointercancel', soltar);
}

function decidir(valor, carta, gesto) {
  const s = baraja[0];
  if (!s) return;
  const nodo = carta || $('#pila').lastElementChild;

  estado.prefs[s.id] = valor;
  estado.historial.push(s.id);
  guardar();

  if (nodo) {
    nodo.classList.remove('volviendo');
    nodo.classList.add('saliendo');

    // la carta sale siguiendo el gesto, no por una trayectoria fija
    let x, y, giro;
    if (gesto) {
      const norma = Math.hypot(gesto.vx, gesto.vy) || 1;
      const impulso = Math.min(2.2, Math.max(1, norma * 0.9));
      x = gesto.dx + (valor === 2 ? 0 : (valor === 1 ? 1 : -1)) * 900 * impulso;
      y = valor === 2 ? gesto.dy - 1400 * impulso : gesto.dy + gesto.vy * 260 + 60;
      giro = (x / 16) * gesto.signo;
    } else {
      x = valor === 2 ? 0 : (valor === 1 ? 1 : -1) * 900;
      y = valor === 2 ? -1400 : 60;
      giro = valor === 2 ? -5 : (valor === 1 ? 22 : -22);
    }
    nodo.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${giro}deg)`;
    nodo.style.opacity = '0';

    const sello = $('.sello.' + (valor === 2 ? 'sisi' : valor === 1 ? 'renta' : 'raya'), nodo);
    if (sello) sello.style.opacity = 1;

    // la de debajo termina de subir mientras la otra se va
    const atras = nodo.previousElementSibling;
    if (atras) {
      atras.classList.add('emergiendo');
      atras.style.transform = 'scale(1) translateY(0)';
      atras.style.opacity = '1';
    }
  }

  if (valor === 2) mostrarMatch(s);

  setTimeout(() => { reconstruirBaraja(); pintarPila(); }, valor === 2 ? 60 : 300);
}

window.reiniciarBaraja = function () {
  estado.prefs = {}; estado.historial = [];
  guardar(); reconstruirBaraja(); pintarPila(); pintarPlan(); pintarCartel();
};

function rewind() {
  const id = estado.historial.pop();
  if (!id) return;
  delete estado.prefs[id];
  guardar();
  reconstruirBaraja(); pintarPila();
  const top = $('#pila').lastElementChild;
  if (top) {
    top.style.transform = 'translate3d(0,-30px,0) scale(1.04)';
    requestAnimationFrame(() => { top.classList.add('suave'); top.style.transform = ''; });
  }
}

/* ---- ¡ES UN MATCH! ---- */
function mostrarMatch(s) {
  const m = $('#match');
  $('#match-quien').textContent = s.name;
  $('#match-pie').textContent = `${s.dayLabel} · ${s.stageName} · ${s.start}`;
  m.classList.add('on');
  lanzarConfeti(m);
  clearTimeout(m._t);
  m._t = setTimeout(() => { m.classList.remove('on'); $$('.confeti', m).forEach(c => c.remove()); }, 1500);
}

function lanzarConfeti(cont) {
  const colores = ['#ff2e9a', '#a24bff', '#ffd23d', '#35e8ff', '#ffffff'];
  for (let i = 0; i < 26; i++) {
    const c = document.createElement('div');
    c.className = 'confeti';
    c.style.background = colores[i % colores.length];
    c.style.left = '50%'; c.style.top = '45%';
    cont.appendChild(c);
    const ang = (Math.PI * 2 * i) / 26 + Math.random() * .5;
    const dist = 130 + Math.random() * 230;
    c.animate([
      { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
      { transform: `translate(${Math.cos(ang) * dist - 50}%, ${Math.sin(ang) * dist + 240}%) rotate(${Math.random() * 900 - 450}deg)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
  }
}

/* ===========================================================
   VISTA: MI PLAN
   =========================================================== */

function pintarPlan() {
  const cont = $('#plan-lista');
  const { items, conflictos } = construirPlan(estado.dia);

  $$('.dia-btn').forEach(b => b.classList.toggle('on', b.dataset.dia === estado.dia));

  if (!items.length) {
    cont.innerHTML = `
      <div class="vacio">
        <div class="ic">📋</div>
        <div class="t">Plan vacío</div>
        <div class="d">No has fichado a nadie de este día.<br>Pásate por <b>FICHAR</b> y desliza.</div>
        <button class="btn-grande" style="animation:none;margin-top:24px" onclick="irA('fichar')">IR A FICHAR</button>
      </div>`;
    return;
  }

  let html = '';

  conflictos.forEach(([a, b]) => {
    html += `
      <div class="conflicto">
        <div class="tit">⚠ CHOQUE DE SAGRADOS</div>
        <div class="d"><b>${a.name}</b> (${a.start}) y <b>${b.name}</b> (${b.start}) se pisan.
        Los dos son "sí o sí", así que esta la decides tú.</div>
        <div class="ops">
          <button onclick="bajarPref('${a.id}')">ME QUEDO CON<br><b>${b.name}</b></button>
          <button onclick="bajarPref('${b.id}')">ME QUEDO CON<br><b>${a.name}</b></button>
        </div>
      </div>`;
  });

  const t = ahora();

  items.forEach((it, i) => {
    const retardo = `animation-delay:${Math.min(i * 45, 500)}ms`;
    if (it.tipo === 'pausa') {
      html += `
        <div class="tl-item" style="${retardo}">
          <div class="tl-hora">${fmtHora(it.from)}</div>
          <div class="tl-punto"></div>
          <div class="pausa">
            <div class="cab-p"><div class="tit">PAUSA</div><div class="dur">${fmtDur(it.to - it.from)}</div></div>
            <div class="msg">${mensajePausa(it.mins, it.from)}</div>
            <div class="luego">Vuelta a las <b>${fmtHora(it.siguiente.from)}</b> en ${it.siguiente.stageName} — ${it.siguiente.name}</div>
          </div>
        </div>`;
    } else {
      const s = it.set;
      const hue = FEST.stages[s.stage].hue;
      const esSisi = estado.prefs[s.id] === 2;
      const enCurso = t >= s.from && t < s.to;
      const pasado = t >= s.to;
      html += `
        <div class="tl-item" style="${retardo}">
          <div class="tl-hora">${s.start}<small>${s.mins}min</small></div>
          <div class="tl-punto" style="--h:${hue}"></div>
          <div class="tarjeta ${esSisi ? 'sisi' : ''} ${enCurso ? 'ahora' : ''} ${pasado ? 'pasado' : ''}" style="--h:${hue}">
            <div class="nom">${s.name}</div>
            ${s.sub ? `<div class="sb">${s.sub}</div>` : ''}
            <div class="bajo">
              <span class="chip esc" style="--h:${hue}">${s.stageName}</span>
              ${it.justo ? `<span class="chip aviso">⚡ VAS JUSTO</span>` : ''}
              ${enCurso ? `<span class="chip sonando">● SONANDO</span>` : ''}
            </div>
          </div>
        </div>`;
    }
  });

  cont.innerHTML = html;
}

window.bajarPref = function (id) {
  estado.prefs[id] = 1;
  guardar(); pintarPlan(); pintarCartel(); pintarAhora();
};

/* ===========================================================
   VISTA: AHORA
   =========================================================== */

function pintarAhora() {
  const cont = $('#ahora-cont');
  const t = ahora();
  const plan = planCompleto();
  const andar = estado.ajustes.andar;

  const primero = SETS[0].from;
  const ultimo = SETS[SETS.length - 1].to;

  let html = '';

  // ---- antes de que abra ----
  if (t < primero) {
    const m = medidaAhora(t);
    const c = fmtCuenta(m.restante);
    html += `
      <div class="ahora-hero" style="text-align:center">
        <div class="eyebrow">RIVERLAND ABRE EN</div>
        <div class="anillo" id="anillo" style="--deg:${gradosAnillo(m).toFixed(2)}deg">
          <div class="centro">
            <div class="queda" id="cd-grande">${c.grande}</div>
            <div class="queda-lbl" id="cd-pie">${c.pie}</div>
          </div>
        </div>
        <div class="ahora-nom" style="font-size:22px">VIERNES 21 · 19:10</div>
        <div class="ahora-meta"><span class="chip">PRIMERA: ${SETS[0].name}</span><span class="chip esc" style="--h:328">${SETS[0].stageName}</span></div>
      </div>`;

    const n = Object.values(estado.prefs).filter(v => v >= 1).length;
    html += n
      ? `<div class="sal-ya sereno">
           <div class="t">PLAN LISTO</div>
           <div class="d">Llevas <b>${n}</b> artistas fichados. Cuando abran puertas esta pantalla se convierte en tu copiloto.</div>
         </div>`
      : `<div class="sal-ya sereno">
           <div class="t">TE FALTA FICHAR</div>
           <div class="d">Todavía no has dicho a quién quieres ver. Dale a <b>FICHAR</b> y desliza el cartel.</div>
         </div>`;

    html += bloqueSimulacion();
    cont.innerHTML = html;
    estado._clave = claveAhora(t);
    return;
  }

  // ---- se acabó ----
  if (t > ultimo) {
    const vistos = plan.length;
    html = `
      <div class="vacio">
        <div class="ic">🌅</div>
        <div class="t">Se acabó Riverland</div>
        <div class="d">Tenías <b>${vistos}</b> artistas en el plan.<br>Ahora toca dormir tres días seguidos.</div>
      </div>` + bloqueSimulacion();
    cont.innerHTML = html;
    estado._clave = claveAhora(t);
    return;
  }

  // ---- durante el festival ----
  const actual = plan.find(s => t >= s.from && t < s.to);
  const siguiente = plan.find(s => s.from > t);

  if (actual) {
    const m = medidaAhora(t);
    const c = fmtCuenta(m.restante);
    const hue = FEST.stages[actual.stage].hue;
    html += `
      <div class="ahora-hero">
        <div class="eyebrow" style="text-align:center">AHORA ESTÁS VIENDO</div>
        <div class="anillo" id="anillo" style="--deg:${gradosAnillo(m).toFixed(2)}deg">
          <div class="centro">
            <div class="queda" id="cd-grande">${c.grande}</div>
            <div class="queda-lbl" id="cd-pie">${c.pie}</div>
          </div>
        </div>
        <div class="ahora-nom">${actual.name}</div>
        <div class="ahora-meta">
          <span class="chip esc" style="--h:${hue}">${actual.stageName}</span>
          <span class="chip">${actual.start} – ${actual.end}</span>
          ${estado.prefs[actual.id] === 2 ? `<span class="chip sagrado">★ SÍ O SÍ</span>` : ''}
        </div>
      </div>`;
  } else {
    const m = medidaAhora(t);
    const c = fmtCuenta(m.restante);
    const pausaMsg = siguiente ? mensajePausa(Math.round((siguiente.from - t) / 60000), siguiente.from) : 'Descanso';
    html += `
      <div class="ahora-hero" style="text-align:center">
        <div class="eyebrow">PAUSA · EMPIEZA EN</div>
        <div class="anillo" id="anillo" style="--deg:${gradosAnillo(m).toFixed(2)}deg">
          <div class="centro">
            <div class="queda" id="cd-grande">${c.grande}</div>
            <div class="queda-lbl" id="cd-pie">${c.pie}</div>
          </div>
        </div>
        <div class="ahora-nom pausa-msg">${pausaMsg}</div>
      </div>`;
  }

  // ---- siguiente + SAL YA ----
  if (siguiente) {
    const falta = siguiente.from - t;
    const distinto = !actual || actual.stage !== siguiente.stage;
    const margen = distinto ? andar * 60000 : 0;
    const salYa = falta <= margen + 120000;
    const hue = FEST.stages[siguiente.stage].hue;

    if (salYa && distinto) {
      html += `
        <div class="sal-ya">
          <div class="t">🏃 SAL YA HACIA ${siguiente.stageName}</div>
          <div class="d"><b>${siguiente.name}</b> empieza en ${fmtDur(falta)} y tienes ${andar} min de paseo. Si sales ahora llegas.</div>
        </div>`;
    }

    html += `
      <div style="margin-top:22px">
        <div class="eyebrow" style="margin-bottom:11px">A CONTINUACIÓN · EN <span id="cd-prox">${fmtDur(falta).toUpperCase()}</span></div>
        <div class="tarjeta" style="--h:${hue}">
          <div class="nom">${siguiente.name}</div>
          ${siguiente.sub ? `<div class="sb">${siguiente.sub}</div>` : ''}
          <div class="bajo">
            <span class="chip esc" style="--h:${hue}">${siguiente.stageName}</span>
            <span class="chip">${siguiente.start}</span>
            ${estado.prefs[siguiente.id] === 2 ? `<span class="chip sagrado">★ SÍ O SÍ</span>` : ''}
          </div>
        </div>
      </div>`;
  } else if (actual) {
    html += `<div style="margin-top:22px" class="eyebrow">ES LO ÚLTIMO DE TU PLAN. DISFRÚTALO.</div>`;
  }

  // ---- qué suena en el resto del festival ----
  const sonando = SETS.filter(s => t >= s.from && t < s.to);
  if (sonando.length) {
    html += `<div style="margin-top:30px"><div class="eyebrow" style="margin-bottom:11px">SONANDO AHORA EN TODO EL RECINTO</div><div class="rejilla">`;
    sonando.forEach(s => {
      const hue = FEST.stages[s.stage].hue;
      const queda = fmtDur(s.to - t);
      html += `
        <div class="linea" style="--h:${hue}" onclick="cicloPref('${s.id}')">
          <div class="h" style="color:hsl(${hue} 90% 74%)">${FEST.stages[s.stage].short}</div>
          <div class="n">${s.name}</div>
          <div class="h" style="min-width:56px;text-align:right" data-pct="${s.id}">${queda}</div>
        </div>`;
    });
    html += `</div></div>`;
  }

  html += bloqueSimulacion();
  cont.innerHTML = html;
  estado._clave = claveAhora(t);
}

/* ---- refresco en vivo, cada segundo ----
   Repintar la pantalla entera cada segundo perdería el scroll y reiniciaría las
   animaciones, así que solo se reescriben los números. La pantalla completa se
   vuelve a montar únicamente cuando cambia algo de fondo: empieza otro
   concierto, aparece el aviso de SAL YA, etc. */

/* Un único sitio donde se decide qué mide el anillo. Antes lo calculaban por
   separado la pantalla y el latido, y podían discrepar. */
function medidaAhora(t) {
  const plan = planCompleto();
  const primero = SETS[0].from, ultimo = SETS[SETS.length - 1].to;

  if (t < primero) {
    // el último día se ve cerrar; por encima de eso, lleno
    return { fase: 'antes', restante: primero - t, total: 86400000 };
  }
  if (t > ultimo) return { fase: 'despues' };

  const actual = plan.find(s => t >= s.from && t < s.to);
  const siguiente = plan.find(s => s.from > t);

  if (actual) {
    return { fase: 'set', actual, siguiente,
             restante: actual.to - t, total: actual.to - actual.from };
  }
  // en una pausa el anillo mide lo que queda de pausa
  const previo = [...plan].reverse().find(s => s.to <= t);
  const desde = previo ? previo.to : t;
  return { fase: 'pausa', siguiente, previo,
           restante: siguiente ? siguiente.from - t : 0,
           total: siguiente ? Math.max(60000, siguiente.from - desde) : 1 };
}

/* Grados del arco que SIGUE encendido: empieza en 360 y se va cerrando. */
function gradosAnillo(m) {
  if (!m || !m.total) return 0;
  const f = Math.max(0, Math.min(1, m.restante / m.total));
  return f * 360;
}

function claveAhora(t) {
  if (t < SETS[0].from) return 'antes';
  if (t > SETS[SETS.length - 1].to) return 'despues';
  const plan = planCompleto();
  const actual = plan.find(s => t >= s.from && t < s.to);
  const sig = plan.find(s => s.from > t);
  let salYa = false;
  if (sig) {
    const distinto = !actual || actual.stage !== sig.stage;
    salYa = distinto && (sig.from - t) <= estado.ajustes.andar * 60000 + 120000;
  }
  const sonando = SETS.filter(s => t >= s.from && t < s.to).map(s => s.id).join(',');
  return `${actual ? actual.id : '-'}|${sig ? sig.id : '-'}|${salYa ? 1 : 0}|${sonando}`;
}

function latido() {
  if (estado.vista !== 'ahora' || document.visibilityState !== 'visible') return;
  const t = ahora();

  if (claveAhora(t) !== estado._clave) { pintarAhora(); return; }

  // la misma medida que usa la pantalla, para que no puedan discrepar
  const m = medidaAhora(t);
  if (m.fase !== 'despues') {
    const c = fmtCuenta(m.restante);
    const g = $('#cd-grande'), pie = $('#cd-pie'), anillo = $('#anillo');
    if (g && g.innerHTML !== c.grande) g.innerHTML = c.grande;
    if (pie && pie.textContent !== c.pie) pie.textContent = c.pie;
    if (anillo) anillo.style.setProperty('--deg', gradosAnillo(m).toFixed(2) + 'deg');
  }

  const plan = planCompleto();
  const sig = plan.find(s => s.from > t);
  const prox = $('#cd-prox');
  if (sig && prox) {
    const falta = sig.from - t;
    // por debajo de cinco minutos se ve el segundero: es cuando importa
    const txt = falta < 300000 ? fmtCuenta(falta).grande : fmtDur(falta).toUpperCase();
    if (prox.textContent !== txt) prox.textContent = txt;
  }

  // lo que queda de cada set, no un porcentaje: el anillo es la única barra
  $$('[data-pct]').forEach(el => {
    const s = SETS_BY_ID[el.dataset.pct];
    if (!s) return;
    const q = fmtDur(s.to - t);
    if (el.textContent !== q) el.textContent = q;
  });
}

function bloqueSimulacion() {
  if (estado.sim === null) return '';
  return `
    <div class="sal-ya sereno aviso-sim">
      <div class="t">🕹 MODO SIMULACIÓN</div>
      <div class="d">Estás viendo la app como si fueran las <b>${fmtHora(ahora())}</b> del ${new Date(ahora()).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}, y el reloj corre desde ahí.
      <br><button class="btn-linea" style="margin-top:11px" onclick="salirSim()">VOLVER A LA HORA REAL</button></div>
    </div>`;
}

window.salirSim = function () { estado.sim = null; pintarAhora(); pintarPlan(); };

/* ===========================================================
   EL DAÑO — registro de consumo
   =========================================================== */

/* Los dos fijos llevan dibujo propio (clase); las que añada Fran, un emoji. */
const TIPOS_FIJOS = {
  cubata: { nombre: 'CUBATAS', sing: 'cubata', icono: '🥤', clase: 'ic-cubata', hue: 190 },
  porro:  { nombre: 'PORROS',  sing: 'porro',  icono: '🌿', clase: 'ic-porro',  hue: 140 },
};

const SUGERENCIAS = ['MDMA', 'Speed', 'Keta', 'Tussi', 'Coca', 'Birra', 'Chupito'];

function infoTipo(t) {
  if (TIPOS_FIJOS[t]) return TIPOS_FIJOS[t];
  return { nombre: t.toUpperCase(), sing: t.toLowerCase(), icono: '✦', hue: HUES[hash(t) % HUES.length] };
}

/* El dibujo va como máscara CSS, no como <img>: así toma el color del texto
   que lo rodea. En blanco fijo desaparecía en la diapositiva del wrapped,
   que va sobre fondo claro. La ruta del PNG vive en la hoja de estilos. */
function htmlIcono(info) {
  return info.clase ? `<span class="ic-sus ${info.clase}"></span>` : info.icono;
}

/* A qué actuación pertenece un momento dado. */
function setEnMomento(ts) {
  const dentro = SETS.filter(s => ts >= s.from && ts < s.to);
  if (!dentro.length) return null;
  // si suenan varios a la vez, gana el que tuvieras en el plan
  return dentro.find(s => estado.prefs[s.id] === 2)
      || dentro.find(s => estado.prefs[s.id] === 1)
      || dentro[0];
}

function apuntar(tipo) {
  estado.registro.push({ tipo, ts: ahora() });
  guardar();
  pintarContador();
  const s = setEnMomento(ahora());
  destello(infoTipo(tipo), s);
}

window.borrarUltimo = function () {
  if (!estado.registro.length) return;
  estado.registro.sort((a, b) => a.ts - b.ts).pop();
  guardar(); pintarContador();
};

window.limpiarPruebas = function () {
  estado.registro = estado.registro.filter(r => r.ts >= FEST_DESDE() && r.ts <= FEST_HASTA());
  guardar(); pintarContador();
};

window.borrarRegistro = function () {
  if (!confirm('¿Borrar todo el registro de consumo? Esto no se puede deshacer.')) return;
  estado.registro = [];
  guardar(); pintarContador();
};

/* Aviso visual al apuntar: confirma que se ha registrado y con qué artista. */
function destello(info, s) {
  const t = ahora();
  const enFest = t >= FEST_DESDE() && t <= FEST_HASTA();
  const d = document.createElement('div');
  d.className = 'destello';
  d.innerHTML = `<div class="ic">${htmlIcono(info)}</div>
    <div class="tx">+1 ${info.sing}</div>
    ${s ? `<div class="qn">con ${s.name}</div>`
      : enFest ? `<div class="qn">entre conciertos</div>`
      : `<div class="qn">ensayo</div>`}`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1400);
}

/* ---- estadísticas ---- */

const FEST_DESDE = () => SETS[0].from - 3600000;
const FEST_HASTA = () => SETS[SETS.length - 1].to;

/* Antes de que empiece el festival todo cuenta: si no, pulsas los botones para
   probar y el número no se mueve, que parece que la app está rota. Una vez
   arrancado, los apuntes de antes pasan a ser pruebas y dejan de contar. */
const enPruebas = () => ahora() < FEST_DESDE();

function estadisticas() {
  const todos = [...estado.registro].sort((a, b) => a.ts - b.ts);
  const pruebas = enPruebas();
  const reg = pruebas ? todos : todos.filter(r => r.ts >= FEST_DESDE() && r.ts <= FEST_HASTA());
  const fuera = pruebas ? 0 : todos.length - reg.length;
  const total = reg.length;

  const porTipo = {};
  reg.forEach(r => porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1);

  const porDia = {};
  const entradasDia = {};
  const porSet = {};
  let enConciertos = 0;

  reg.forEach(r => {
    const s = setEnMomento(r.ts);
    if (s) {
      enConciertos++;
      if (!porSet[s.id]) porSet[s.id] = { set: s, n: 0, tipos: {} };
      porSet[s.id].n++;
      porSet[s.id].tipos[r.tipo] = (porSet[s.id].tipos[r.tipo] || 0) + 1;
    }
    const dia = s ? s.day : diaDeTimestamp(r.ts);
    if (dia) {
      porDia[dia] = (porDia[dia] || 0) + 1;
      (entradasDia[dia] = entradasDia[dia] || []).push(r);
    }
  });

  // el concierto más castigado, y el más intenso por minuto
  const sets = Object.values(porSet);
  const masDrogado = sets.slice().sort((a, b) => b.n - a.n)[0] || null;
  const masIntenso = sets.slice()
    .filter(x => x.set.mins >= 20)
    .sort((a, b) => (b.n / b.set.mins) - (a.n / a.set.mins))[0] || null;

  // hora punta
  const porHora = {};
  reg.forEach(r => {
    const h = new Date(r.ts).getHours();
    porHora[h] = (porHora[h] || 0) + 1;
  });
  const horaPunta = Object.entries(porHora).sort((a, b) => b[1] - a[1])[0] || null;

  // la media hora más bestia
  let ventana = { n: 0, ts: null };
  reg.forEach((r, i) => {
    const n = reg.filter(x => x.ts >= r.ts && x.ts < r.ts + 1800000).length;
    if (n > ventana.n) ventana = { n, ts: r.ts };
  });

  const diaTop = Object.entries(porDia).sort((a, b) => b[1] - a[1])[0] || null;

  /* Ritmo medio: solo cuenta el tiempo de cada noche por separado. Medirlo de
     principio a fin del festival metería en la media las horas de sueño entre
     día y día, y saldría un número sin ningún sentido. */
  let msActivo = 0, tramos = 0;
  Object.values(entradasDia).forEach(rs => {
    if (rs.length < 2) return;
    msActivo += rs[rs.length - 1].ts - rs[0].ts;
    tramos += rs.length - 1;
  });
  const cada = tramos ? msActivo / tramos : 0;

  /* La racha sin nada tampoco puede cruzar de un día a otro. */
  let racha2 = { ms: 0, desde: null };
  Object.values(entradasDia).forEach(rs => {
    for (let i = 1; i < rs.length; i++) {
      const hueco = rs[i].ts - rs[i - 1].ts;
      if (hueco > racha2.ms) racha2 = { ms: hueco, desde: rs[i - 1].ts };
    }
  });

  return {
    reg, total, fuera, pruebas, porTipo, porDia, entradasDia, porSet, sets, enConciertos,
    masDrogado, masIntenso, horaPunta, ventana, racha: racha2, diaTop, cada, msActivo,
    ranking: sets.slice().sort((a, b) => b.n - a.n).slice(0, 5),
  };
}

function diaDeTimestamp(ts) {
  for (const d of FEST.days) {
    const ss = SETS.filter(s => s.day === d.id);
    if (ts >= ss[0].from - 3600000 && ts <= ss[ss.length - 1].to) return d.id;
  }
  return null;
}

/* ---- vista ---- */

function pintarContador() {
  const cont = $('#contador-cont');
  const e = estadisticas();
  const t = ahora();
  const sonando = setEnMomento(t);

  const tipos = [...Object.keys(TIPOS_FIJOS), ...estado.otras];

  let html = '';

  if (e.pruebas) {
    html += `
      <div class="aviso-prueba">
        <div class="t">🕹 Modo prueba</div>
        <div class="d">El festival aún no ha empezado, así que esto es un ensayo:
        los botones suman y puedes ver el wrapped, pero <b>el viernes estos apuntes
        dejarán de contar solos</b>.<br><br>
        Para probarlo con conciertos de verdad, entra en ⚙ y mueve el
        <b>modo simulación</b> a una hora del festival.</div>
        ${e.total ? `<button class="btn-linea" onclick="borrarRegistro()">BORRAR EL ENSAYO</button>` : ''}
      </div>`;
  }

  html += `
    <div class="ahora-mide">
      <div class="eyebrow">${sonando ? 'APUNTANDO MIENTRAS SUENA' : 'AHORA MISMO'}</div>
      <div class="mide-quien">${sonando ? sonando.name : (e.pruebas ? 'Todavía no hay festival' : 'Entre conciertos')}</div>
    </div>

    <div class="botonera">`;

  tipos.forEach(tp => {
    const info = infoTipo(tp);
    const n = e.porTipo[tp] || 0;
    html += `
      <button class="bot-sus" style="--h:${info.hue}" onclick="apuntar('${tp.replace(/'/g, "\\'")}')">
        <span class="bs-ic">${htmlIcono(info)}</span>
        <span class="bs-n">${n}</span>
        <span class="bs-lbl">${info.nombre}</span>
        <span class="bs-mas">+1</span>
      </button>`;
  });

  html += `
      <button class="bot-sus anadir" onclick="abrirSustancias()">
        <span class="bs-ic">＋</span>
        <span class="bs-lbl">OTRA<br>SUSTANCIA</span>
      </button>
    </div>`;

  if (e.fuera) {
    html += `
      <div class="aviso-prueba">
        <div class="t">${e.fuera} apunte${e.fuera === 1 ? '' : 's'} de prueba</div>
        <div class="d">Están fuera de las fechas del festival, así que no cuentan en
        las estadísticas ni en el wrapped. Bórralos antes del viernes.</div>
        <button class="btn-linea" onclick="limpiarPruebas()">BORRAR LAS PRUEBAS</button>
      </div>`;
  }

  if (e.total) {
    html += `<div class="fila-acc">
      <button class="btn-linea" onclick="borrarUltimo()">↺ QUITAR EL ÚLTIMO</button>
    </div>`;

    html += `<div class="eyebrow" style="margin:26px 0 12px">EL PARTE DE GUERRA</div><div class="rejilla">`;

    const dato = (k, v) => `<div class="dato"><div class="dk">${k}</div><div class="dv">${v}</div></div>`;

    html += dato('Total de sustancias', `${e.total}`);
    if (e.cada) html += dato('Ritmo medio', `una cada ${fmtDur(e.cada)}`);
    if (e.masDrogado) html += dato('Concierto más drogado', `${e.masDrogado.set.name} · ${e.masDrogado.n}`);
    if (e.horaPunta) html += dato('Hora punta', `${String(e.horaPunta[0]).padStart(2, '0')}:00 · ${e.horaPunta[1]}`);
    if (e.ventana.n > 1) html += dato('Media hora más bestia', `${e.ventana.n} desde las ${fmtHora(e.ventana.ts)}`);
    if (e.diaTop) {
      const d = FEST.days.find(x => x.id === e.diaTop[0]);
      html += dato('Peor día', `${d ? d.name : e.diaTop[0]} · ${e.diaTop[1]}`);
    }
    html += `</div>`;

    if (e.ranking.length) {
      html += `<div class="eyebrow" style="margin:26px 0 12px">RANKING DE ARTISTAS</div><div class="rejilla">`;
      const max = e.ranking[0].n;
      e.ranking.forEach((x, i) => {
        const hue = FEST.stages[x.set.stage].hue;
        html += `
          <div class="rank" style="--h:${hue}">
            <div class="rk-pos">${i + 1}</div>
            <div class="rk-cuerpo">
              <div class="rk-nom">${x.set.name}</div>
              <div class="rk-barra"><i style="width:${x.n / max * 100}%"></i></div>
            </div>
            <div class="rk-n">${x.n}</div>
          </div>`;
      });
      html += `</div>`;
    }

    html += `
      <button class="btn-grande wrapped-cta" style="animation:none" onclick="abrirWrapped()">
        VER MI WRAPPED
      </button>
      <button class="btn-linea peligro" style="margin-top:12px" onclick="borrarRegistro()">BORRAR TODO EL REGISTRO</button>`;
  } else {
    html += `
      <div class="vacio" style="padding:38px 20px">
        <div class="ic">📋</div>
        <div class="t">Aún no has apuntado nada</div>
        <div class="d">Dale a un botón cada vez que caiga algo.<br>
        Cada toque se guarda con el artista que esté sonando,<br>y de ahí sale el wrapped del final.</div>
      </div>`;
  }

  cont.innerHTML = html;
  $('#contador-sub').textContent = e.total
    ? `${e.total} EN TOTAL · ${e.enConciertos} EN CONCIERTOS`
    : 'LLEVANDO LA CUENTA';
}

/* ---- añadir sustancia ---- */

window.abrirSustancias = function () {
  const h = $('#hoja-sus');
  const yaEstan = new Set([...Object.keys(TIPOS_FIJOS), ...estado.otras.map(x => x.toLowerCase())]);
  $('#hoja-sus-panel').innerHTML = `
    <div class="asa"></div>
    <h3>Añadir sustancia</h3>
    <p class="hint" style="margin-bottom:16px">Se añade un botón nuevo al contador. Lo que escribas se queda en tu móvil.</p>
    <div class="chips-sus">
      ${SUGERENCIAS.filter(s => !yaEstan.has(s.toLowerCase()))
        .map(s => `<button class="chip-sus" onclick="nuevaSustancia('${s}')">${s}</button>`).join('')}
    </div>
    <input type="text" id="in-sus" placeholder="o escríbela tú…" maxlength="18" autocomplete="off">
    <button class="btn-linea" onclick="nuevaSustancia(document.getElementById('in-sus').value)">AÑADIR</button>
    ${estado.otras.length ? `
      <div class="eyebrow" style="margin:22px 0 10px">LAS TUYAS</div>
      ${estado.otras.map(s => `
        <div class="sus-fila">
          <span>${s}</span>
          <button onclick="quitarSustancia('${s.replace(/'/g, "\\'")}')">quitar</button>
        </div>`).join('')}` : ''}
  `;
  h.classList.add('on');
};

window.nuevaSustancia = function (nombre) {
  const n = (nombre || '').trim();
  if (!n) return;
  const existe = [...Object.keys(TIPOS_FIJOS), ...estado.otras]
    .some(x => x.toLowerCase() === n.toLowerCase());
  if (!existe) estado.otras.push(n);
  guardar();
  $('#hoja-sus').classList.remove('on');
  pintarContador();
};

window.quitarSustancia = function (nombre) {
  const usos = estado.registro.filter(r => r.tipo === nombre).length;
  if (usos && !confirm(`Tienes ${usos} apuntes de "${nombre}". Se borran también. ¿Seguir?`)) return;
  estado.otras = estado.otras.filter(x => x !== nombre);
  estado.registro = estado.registro.filter(r => r.tipo !== nombre);
  guardar();
  abrirSustancias(); pintarContador();
};

/* ===========================================================
   WRAPPED
   =========================================================== */

let wrIndice = 0;
let wrSlides = [];

function construirWrapped() {
  const e = estadisticas();
  const s = [];
  const dias = FEST.days;

  s.push({
    tono: 'intro',
    sup: 'RIVERLAND · ASTURIAS · 2026',
    grande: 'TU<br>WRAPPED',
    pie: 'Lo que ha pasado de verdad estos tres días',
  });

  s.push({
    tono: 'total',
    sup: 'EN TOTAL TE HAS METIDO',
    numero: e.total,
    grande: 'SUSTANCIAS',
    lista: Object.entries(e.porTipo).sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${htmlIcono(infoTipo(t))} ${n} ${infoTipo(t).nombre.toLowerCase()}`),
  });

  if (e.cada) {
    s.push({
      tono: 'ritmo',
      sup: 'ESO ES UNA SUSTANCIA CADA',
      grande: fmtDur(e.cada).toUpperCase(),
      pie: e.cada < 1800000
        ? 'Un ritmo difícil de sostener. Enhorabuena, supongo.'
        : 'Sorprendentemente responsable.',
    });
  }

  if (e.masDrogado) {
    const x = e.masDrogado;
    s.push({
      tono: 'artista',
      sup: 'TU CONCIERTO MÁS DROGADO',
      grande: x.set.name,
      numero: x.n,
      pie: `${x.n} sustancias en ${x.set.mins} minutos · ${x.set.stageName} · ${x.set.dayLabel}`,
      lista: Object.entries(x.tipos).map(([t, n]) => `${htmlIcono(infoTipo(t))} ${n} ${infoTipo(t).nombre.toLowerCase()}`),
      set: x.set,
    });
  }

  if (e.masIntenso && (!e.masDrogado || e.masIntenso.set.id !== e.masDrogado.set.id)) {
    const x = e.masIntenso;
    s.push({
      tono: 'artista',
      sup: 'Y EL MÁS INTENSO POR MINUTO',
      grande: x.set.name,
      pie: `${(x.n / x.set.mins * 60).toFixed(1)} por hora durante todo el set`,
      set: x.set,
    });
  }

  if (e.diaTop) {
    const d = dias.find(x => x.id === e.diaTop[0]);
    s.push({
      tono: 'dia',
      sup: 'TU PEOR NOCHE',
      grande: d ? d.name : e.diaTop[0],
      numero: e.diaTop[1],
      pie: `${e.diaTop[1]} sustancias en una sola noche`,
      lista: dias.map(x => `${x.short} · ${e.porDia[x.id] || 0}`),
    });
  }

  if (e.horaPunta) {
    s.push({
      tono: 'hora',
      sup: 'TU HORA PUNTA',
      grande: `${String(e.horaPunta[0]).padStart(2, '0')}:00`,
      pie: `${e.horaPunta[1]} sustancias en esa franja. Todos sabemos lo que pasó ahí.`,
    });
  }

  if (e.ventana.n > 2) {
    s.push({
      tono: 'bestia',
      sup: 'TU MEDIA HORA MÁS BESTIA',
      numero: e.ventana.n,
      grande: 'EN 30 MIN',
      pie: `A partir de las ${fmtHora(e.ventana.ts)}`,
    });
  }

  if (e.ranking.length > 1) {
    s.push({
      tono: 'ranking',
      sup: 'TU TOP DE ARTISTAS',
      grande: 'POR DAÑO<br>CAUSADO',
      ranking: e.ranking,
    });
  }

  if (e.racha.ms > 3600000) {
    s.push({
      tono: 'racha',
      sup: 'TU RACHA MÁS LARGA SIN NADA',
      grande: fmtDur(e.racha.ms).toUpperCase(),
      pie: `Desde las ${fmtHora(e.racha.desde)}. Alguien estuvo durmiendo.`,
    });
  }

  s.push({
    tono: 'final',
    sup: 'VEREDICTO',
    grande: veredicto(e),
    pie: `${e.total} sustancias · ${e.sets.length} conciertos afectados · Riverland 2026`,
  });

  return s;
}

function veredicto(e) {
  const t = e.total;
  if (t >= 60) return 'NO SÉ<br>CÓMO<br>SIGUES<br>VIVO';
  if (t >= 35) return 'FUISTE<br>A POR<br>TODAS';
  if (t >= 20) return 'UN<br>FESTIVAL<br>COMO<br>DIOS<br>MANDA';
  if (t >= 8)  return 'IBAS<br>SERVIDO';
  return 'CASI<br>UN<br>MONJE';
}

window.abrirWrapped = function () {
  wrSlides = construirWrapped();
  wrIndice = 0;
  $('#wrapped').classList.add('on');
  pintarWrapped();
};
window.cerrarWrapped = () => $('#wrapped').classList.remove('on');
window.wrappedMover = function (d) {
  const n = wrIndice + d;
  if (n < 0) return;
  if (n >= wrSlides.length) return cerrarWrapped();
  wrIndice = n;
  pintarWrapped();
};

function pintarWrapped() {
  const s = wrSlides[wrIndice];
  const cont = $('#wr-slide');

  $('#wr-barras').innerHTML = wrSlides
    .map((_, i) => `<i class="${i <= wrIndice ? 'on' : ''}"></i>`).join('');

  const fondo = s.set
    ? `<div class="wr-fondo">${portadaHTML(s.set)}</div>`
    : '';

  let html = fondo + `<div class="wr-cuerpo">`;
  if (s.sup) html += `<div class="wr-sup">${s.sup}</div>`;
  if (s.numero !== undefined) html += `<div class="wr-num">${s.numero}</div>`;
  if (s.grande) html += `<div class="wr-grande">${s.grande}</div>`;
  if (s.lista) html += `<div class="wr-lista">${s.lista.map(l => `<div>${l}</div>`).join('')}</div>`;
  if (s.ranking) {
    const max = s.ranking[0].n;
    html += `<div class="wr-rank">` + s.ranking.map((x, i) => `
      <div class="wr-rk">
        <span class="p">${i + 1}</span>
        <span class="n">${x.set.name}</span>
        <span class="b"><i style="width:${x.n / max * 100}%"></i></span>
        <span class="c">${x.n}</span>
      </div>`).join('') + `</div>`;
  }
  if (s.pie) html += `<div class="wr-pie">${s.pie}</div>`;
  html += `</div>`;

  cont.className = 'wr-slide tono-' + s.tono;
  cont.innerHTML = html;
  cont.style.animation = 'none';
  void cont.offsetWidth;
  cont.style.animation = '';
}

/* ===========================================================
   VISTA: CARTEL
   =========================================================== */

const ICONO_PREF = { 2: '★', 1: '♥', 0: '✕' };

function pintarCartel() {
  const cont = $('#cartel-lista');
  $$('.dia-btn-c').forEach(b => b.classList.toggle('on', b.dataset.dia === estado.dia));

  let html = '';
  Object.entries(FEST.stages).forEach(([id, esc]) => {
    const lista = SETS.filter(s => s.day === estado.dia && s.stage === id);
    if (!lista.length) return;
    html += `<div class="fila-esc" style="--h:${esc.hue}"><h3>${esc.name}</h3><div class="rejilla">`;
    lista.forEach(s => {
      const p = estado.prefs[s.id];
      html += `
        <div class="linea ${p !== undefined ? 'p' + p : ''}" onclick="cicloPref('${s.id}')">
          <div class="h">${s.start}</div>
          <div class="n">${s.name}${s.sub ? `<span style="display:block;font-size:9px;opacity:.55;font-weight:400;letter-spacing:.1em;margin-top:3px">${s.sub}</span>` : ''}</div>
          <div class="p">${ICONO_PREF[p] ?? '·'}</div>
        </div>`;
    });
    html += `</div></div>`;
  });
  cont.innerHTML = html;
}

window.cicloPref = function (id) {
  const actual = estado.prefs[id];
  const siguiente = actual === undefined ? 1 : actual === 1 ? 2 : actual === 2 ? 0 : undefined;
  if (siguiente === undefined) delete estado.prefs[id];
  else estado.prefs[id] = siguiente;
  guardar();
  reconstruirBaraja();
  pintarCartel(); pintarPlan(); pintarAhora(); actualizarProgreso();
};

/* ===========================================================
   NAVEGACIÓN
   =========================================================== */

const ORDEN_VISTAS = ['ahora', 'plan', 'fichar', 'contador'];
let transicion = 0;

function refrescarVista(v) {
  if (v === 'plan') { pintarPlan(); pintarCartel(); }
  if (v === 'ahora') pintarAhora();
  if (v === 'contador') pintarContador();
  if (v === 'fichar') { reconstruirBaraja(); pintarPila(); }
}

/* Deslizamiento estilo iOS: la vista nueva entra entera desde un lado y la
   anterior se retira a un tercio de velocidad, que es lo que da sensación de
   profundidad en vez de un simple corte. */
window.irA = function (v, inmediato) {
  const entrante = $('#v-' + v);
  const saliente = $('.vista.activa');
  if (!entrante) return;

  const previa = estado.vista;
  estado.vista = v;
  $$('.nav-btn').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  refrescarVista(v);

  /* Invalida cualquier transición pendiente, también en el camino inmediato:
     si no, el temporizador de una anterior se despertaba después y desactivaba
     la vista que acababa de ponerse, dejando la pantalla en blanco. */
  const id = ++transicion;

  if (!saliente || saliente === entrante || inmediato) {
    $$('.vista').forEach(x => {
      x.classList.toggle('activa', x === entrante);
      x.classList.remove('entra', 'sale');
      x.style.transform = '';
      x.style.zIndex = '';
    });
    return;
  }

  const dir = ORDEN_VISTAS.indexOf(v) > ORDEN_VISTAS.indexOf(previa) ? 1 : -1;

  // limpia cualquier transición a medias (toques rápidos seguidos)
  $$('.vista').forEach(x => {
    if (x !== entrante && x !== saliente) {
      x.classList.remove('activa', 'entra', 'sale');
      x.style.transform = '';
      x.style.opacity = '';
      x.style.zIndex = '';
    }
  });

  // la que entra SIEMPRE por delante, vaya hacia adelante o hacia atrás
  entrante.style.zIndex = '2';
  saliente.style.zIndex = '1';

  entrante.classList.add('activa');
  entrante.classList.remove('entra', 'sale');
  entrante.style.transform = `translate3d(${dir * 100}%,0,0)`;
  entrante.style.opacity = '';
  saliente.classList.remove('entra', 'sale');
  saliente.style.opacity = '';

  // Fuerza el cálculo de estilo para que el navegador vea la posición de
  // partida antes de animar. Con requestAnimationFrame esto no ocurría si la
  // pestaña estaba en segundo plano y la vista aparecía de golpe.
  void entrante.offsetWidth;

  entrante.classList.add('entra');
  entrante.style.transform = 'translate3d(0,0,0)';
  saliente.classList.add('sale');
  saliente.style.transform = `translate3d(${-dir * 30}%,0,0)`;

  setTimeout(() => {
    if (id !== transicion) return;
    saliente.classList.remove('activa', 'sale');
    saliente.style.transform = '';
    saliente.style.zIndex = '';
    entrante.classList.remove('entra');
    entrante.style.transform = '';
    entrante.style.zIndex = '';
  }, 440);
};

function cambiarModoPlan(m) {
  estado.modoPlan = m;
  $$('.con-btn').forEach(b => b.classList.toggle('on', b.dataset.modo === m));
  $('#plan-lista').hidden = m !== 'plan';
  $('#cartel-lista').hidden = m !== 'cartel';
  if (m === 'plan') pintarPlan(); else pintarCartel();
}

function cambiarDia(d) {
  estado.dia = d; guardar();
  pintarPlan(); pintarCartel();
}

/* ===========================================================
   AJUSTES
   =========================================================== */

function abrirAjustes() {
  const h = $('#hoja');
  const min = SETS[0].from, max = SETS[SETS.length - 1].to;
  const val = estado.sim !== null ? ahora() : Math.max(min, Math.min(max, Date.now()));
  $('#hoja-panel').innerHTML = `
    <div class="asa"></div>
    <h3>Ajustes</h3>

    <div class="ajuste">
      <div class="lbl">Tiempo entre escenarios · <span class="val" id="val-andar">${estado.ajustes.andar}</span> min</div>
      <div class="hint">Lo que tardas en ir de un escenario a otro. La app lo descuenta al montar el plan y para avisarte de "SAL YA".</div>
      <input type="range" min="0" max="20" value="${estado.ajustes.andar}" id="in-andar">
    </div>

    <div class="ajuste">
      <div class="lbl">Hueco mínimo para PAUSA · <span class="val" id="val-pausa">${estado.ajustes.pausaMin}</span> min</div>
      <div class="hint">A partir de este hueco libre, la app te propone pausa en vez de dejarte un agujero en blanco.</div>
      <input type="range" min="10" max="90" step="5" value="${estado.ajustes.pausaMin}" id="in-pausa">
    </div>

    <div class="ajuste">
      <div class="lbl">Modo simulación · <span class="val" id="val-sim">${fmtHora(val)}</span></div>
      <div class="hint">Mueve la hora para ver cómo se comportará la app durante el festival. Solo para probar.</div>
      <input type="range" min="${min}" max="${max}" step="300000" value="${val}" id="in-sim">
      <button class="btn-linea" onclick="salirSim();cerrarHoja()">VOLVER A LA HORA REAL</button>
    </div>

    <button class="btn-linea peligro" onclick="if(confirm('¿Borrar todas tus elecciones?')){reiniciarBaraja();cerrarHoja()}">BORRAR TODO Y EMPEZAR DE CERO</button>

    <div class="version" id="version-app">comprobando versión…</div>
  `;
  mostrarVersion();
  h.classList.add('on');

  $('#in-andar').oninput = e => {
    estado.ajustes.andar = +e.target.value;
    $('#val-andar').textContent = e.target.value;
    guardar(); pintarPlan(); pintarAhora();
  };
  $('#in-pausa').oninput = e => {
    estado.ajustes.pausaMin = +e.target.value;
    $('#val-pausa').textContent = e.target.value;
    guardar(); pintarPlan();
  };
  $('#in-sim').oninput = e => {
    estado.sim = +e.target.value - Date.now();   // desfase, para que siga corriendo
    $('#val-sim').textContent = fmtHora(ahora());
    estado._clave = null;
    pintarAhora(); pintarPlan();
  };
}
window.cerrarHoja = () => $('#hoja').classList.remove('on');

/* Qué versión tiene realmente este móvil. Si un día la app se ve rara,
   aquí se ve enseguida si se quedó con una versión vieja. */
async function mostrarVersion() {
  const el = $('#version-app');
  if (!el) return;
  const partes = [`${SETS.length} sets · ${Object.keys(window.FOTOS || {}).length} fotos`];
  try {
    const ks = await caches.keys();
    const mia = ks.find(k => k.startsWith('riverlapp-'));
    partes.push(mia ? `caché ${mia}` : 'sin caché (no funcionará sin cobertura)');
    if (ks.length > 1) partes.push('⚠ hay más de una caché');
  } catch (_) {
    partes.push('sin service worker');
  }
  el.textContent = partes.join(' · ');
}

/* ===========================================================
   ARRANQUE
   =========================================================== */

/* Si existe cabeza.png, sustituye el icono de EL DAÑO y suelta la cabeza a
   volar por esa pantalla. Si no está, se queda la calavera y no pasa nada. */
function activarCara() {
  const img = new Image();
  img.onload = () => {
    document.documentElement.style.setProperty('--cara', "url('cabeza.png')");
    document.body.classList.add('hay-cara');
    const ic = $('#ic-dano');
    if (ic) { ic.textContent = ''; ic.classList.add('cara'); }
  };
  img.src = 'cabeza.png';
}

function animarLogo() {
  const cont = $('#logo-anim');
  const txt = 'RIVERLAPP';
  cont.innerHTML = [...txt].map((c, i) =>
    `<span class="${i >= 5 ? 'hl' : ''}" style="animation-delay:${i * 60}ms">${c}</span>`).join('');
}

function iniciar() {
  cargar();
  animarLogo();
  activarCara();
  reconstruirBaraja();

  // día por defecto: el que toque si estamos en festival
  const t = Date.now();
  const hoy = FEST.days.find(d => {
    const ss = SETS.filter(s => s.day === d.id);
    return t >= ss[0].from && t <= ss[ss.length - 1].to;
  });
  if (hoy) estado.dia = hoy.id;

  $$('.dia-btn').forEach(b => b.onclick = () => cambiarDia(b.dataset.dia));
  $$('.con-btn').forEach(b => b.onclick = () => cambiarModoPlan(b.dataset.modo));
  $$('.nav-btn').forEach(b => b.onclick = () => irA(b.dataset.v));
  $('#btn-no').onclick     = () => decidir(0);
  $('#btn-si').onclick     = () => decidir(1);
  $('#btn-top').onclick    = () => decidir(2);
  $('#btn-rewind').onclick = rewind;
  $$('.btn-ajustes').forEach(b => b.onclick = abrirAjustes);
  $('#hoja').onclick = e => { if (e.target.id === 'hoja') cerrarHoja(); };
  $('#hoja-sus').onclick = e => { if (e.target.id === 'hoja-sus') e.currentTarget.classList.remove('on'); };
  cambiarModoPlan(estado.modoPlan);

  $('#btn-empezar').onclick = () => {
    estado.intro = false; guardar();
    $('#intro').classList.add('fuera');
    setTimeout(() => $('#intro').remove(), 700);
    irA(Object.keys(estado.prefs).length ? 'ahora' : 'fichar');
  };
  $('#btn-saltar').onclick = () => {
    estado.intro = false; guardar();
    $('#intro').classList.add('fuera');
    setTimeout(() => $('#intro').remove(), 700);
    irA('plan');
  };

  if (!estado.intro) $('#intro').remove();

  irA(estado.intro ? 'fichar' : (Object.keys(estado.prefs).length ? 'ahora' : 'fichar'));
  pintarPila(); pintarPlan(); pintarCartel(); pintarAhora(); pintarContador();

  // reloj: el segundero solo mueve números; el resto se refresca despacio
  setInterval(latido, 1000);
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (estado.vista === 'contador') pintarContador();
  }, 20000);
  // al volver a la app desde segundo plano, ponerse al día de golpe
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && estado.vista === 'ahora') pintarAhora();
  });

  // en localhost no se registra, para no servir versiones viejas mientras se desarrolla
  // (con ?sw=1 se fuerza, para poder probar el modo sin cobertura)
  const esLocal = ['localhost', '127.0.0.1'].includes(location.hostname)
    && !location.search.includes('sw=1');
  if ('serviceWorker' in navigator && !esLocal) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', iniciar);
