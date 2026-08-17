/* RIVERLAND 2026 — cartel completo
   Horarios transcritos de los tres timetables oficiales.
   Los sets que empiezan antes de las 12:00 pertenecen a la madrugada del día siguiente. */

const FEST = {
  name: 'RIVERLAND',
  place: 'ASTURIAS',
  year: 2026,
  stages: {
    valle:  { name: 'EL VALLE',  short: 'VALLE',  hue: 328 },
    bosque: { name: 'EL BOSQUE', short: 'BOSQUE', hue: 210 },
    carpa:  { name: 'LA CARPA',  short: 'CARPA',  hue: 276 },
  },
  days: [
    { id: 'vie', name: 'VIERNES', short: 'VIE', date: '2026-08-21', label: 'VIE 21' },
    { id: 'sab', name: 'SÁBADO',  short: 'SÁB', date: '2026-08-22', label: 'SÁB 22' },
    { id: 'dom', name: 'DOMINGO', short: 'DOM', date: '2026-08-23', label: 'DOM 23' },
  ],
};

/* [nombre, inicio, fin, subtítulo] */
const LINEUP = {
  vie: {
    valle: [
      ['D.PALERMO',        '19:10', '19:40'],
      ['SHAKEDABLOCK!',    '19:50', '20:20'],
      ['TARCHI',           '20:30', '21:20'],
      ['D.VALENTINO',      '22:00', '23:00'],
      ['STICKY M.A.',      '00:00', '00:50'],
      ['GLOOSITO',         '01:30', '02:20'],
      ['SIX SEX',          '03:00', '03:50'],
      ['8BELIAL',          '04:30', '05:20'],
      ['SELECTA',          '05:30', '06:30'],
    ],
    bosque: [
      ['BBY DEMON',        '19:20', '19:50'],
      ['SEMON',            '20:00', '20:30'],
      ['LG1DO',            '21:20', '22:10'],
      ['UÑA Y CARNE',      '22:50', '00:00'],
      ['ULTRALONE',        '00:40', '01:30'],
      ['STEREO MADNESS',   '02:10', '03:00'],
      ['MARCE Y DLOMALO',  '03:40', '04:30'],
      ['CASA PEPA',        '04:40', '06:30', 'BATANERO · DA ROSSI'],
    ],
    carpa: [
      ['CECILIO G',        '21:30', '22:20'],
      ['TOMMY BLANCO',     '22:30', '22:55'],
      ['VEI HABACHE',      '22:55', '23:20'],
      ['CYBERNENE',        '23:30', '00:20'],
      ['TK MAMI',          '00:30', '01:20'],
      ['ALEESHA',          '01:30', '02:20'],
      ['RALY',             '02:30', '03:20'],
      ["L'HAINE",          '03:30', '04:20'],
      ['OLIVIA BABE Y GIGI284', '04:30', '05:30'],
      ['JOHNNYFUU',        '05:30', '06:30'],
    ],
  },
  sab: {
    valle: [
      ['NICO',             '18:30', '19:00'],
      ['IZA TKM',          '19:10', '19:40'],
      ['AMORE',            '20:00', '20:50'],
      ['NATALIA LACUNZA',  '21:30', '22:20'],
      ['RALPHIE CHOO',     '23:00', '23:50'],
      ['MVRK',             '00:30', '01:20'],
      ['JUICY BAE',        '02:00', '02:50'],
      ['SOTO ASA',         '03:30', '04:20'],
      ['SKINYZ',           '04:30', '06:30'],
    ],
    bosque: [
      ['YUNG BRANDY',      '19:30', '20:00'],
      ['VAMPI',            '20:10', '20:40'],
      ['DIRTY SUC',        '20:50', '21:40'],
      ['VRENO YG',         '22:10', '23:00'],
      ['UGLY',             '23:40', '00:30'],
      ['JESSE BAEZ',       '01:10', '02:00'],
      ['REBE',             '02:40', '03:30'],
      ['DELARUE',          '04:00', '04:50'],
      ['CASA PEPA',        '05:00', '06:30', 'JOAN CORTÉS · BETTY BUNNY'],
    ],
    carpa: [
      ['FANTA ROSARIO',    '20:30', '21:20'],
      ['FACEBROOKLYN',     '21:30', '22:20'],
      ['GUXO',             '22:30', '23:20'],
      ['KRISTINA',         '23:30', '00:20'],
      ['TAICHU',           '00:30', '01:20'],
      ['JAY DIME',         '01:30', '02:20'],
      ['BIBERON',          '02:30', '03:20'],
      ['YYY891',           '03:30', '04:20'],
      ['ARCEX',            '04:30', '05:30'],
      ['BLUNTZ B2B TASUIK','05:30', '06:30'],
    ],
  },
  dom: {
    valle: [
      ['AMORYODIO',        '18:40', '19:10'],
      ['NERDBELLAKO',      '19:20', '19:50'],
      ['L0RNA',            '20:00', '20:50'],
      ['RAUL CLYDE',       '21:30', '22:20'],
      ['AKRIILA',          '23:00', '23:50'],
      ['HOKE',             '00:30', '01:20'],
      ['ABHIR',            '02:00', '02:50'],
      ['METRIKA',          '03:30', '04:20'],
      ['KABASAKI',         '04:30', '05:30'],
      ['XINA MORA',        '05:30', '06:30'],
    ],
    bosque: [
      ['MAIN COSTA',       '18:50', '19:20'],
      ['TAWA',             '19:30', '20:00'],
      ['LEÏTI',            '20:40', '21:30'],
      ['ÉBANO',            '22:10', '23:00'],
      ['NICO MISERIA',     '23:40', '00:30'],
      ['ROOMTRASH',        '01:10', '02:00'],
      ['BEN YART',         '02:40', '03:30'],
      ['ANB',              '04:00', '04:50'],
      ['CASA PEPA',        '05:00', '06:30', 'LUCÍA REINA'],
    ],
    carpa: [
      ['GATTI',            '21:30', '22:20'],
      ['C MARÍ',           '22:30', '23:20'],
      ['EL BUGG',          '23:30', '00:20'],
      ['LA MUSA',          '00:30', '01:20'],
      ['BEA PELEA',        '01:30', '02:20'],
      ['LADIFERENCIA 2006','02:30', '03:20'],
      ['ZELL',             '03:30', '04:20'],
      ['SNEAKY WH',        '04:30', '05:30'],
      ['KID GUMMY',        '05:30', '06:30'],
    ],
  },
};

/* ---- normalización ---- */

function slugify(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* Convierte "HH:MM" del día D en un instante real.
   Antes de las 12:00 => madrugada del día siguiente. */
function toDate(dateStr, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(h, m, 0, 0);
  if (h < 12) d.setDate(d.getDate() + 1);
  return d;
}

const SETS = [];
FEST.days.forEach((day, di) => {
  Object.keys(FEST.stages).forEach(stageId => {
    (LINEUP[day.id][stageId] || []).forEach((row, i) => {
      const [name, start, end, sub] = row;
      const from = toDate(day.date, start);
      const to = toDate(day.date, end);
      SETS.push({
        id: `${day.id}-${stageId}-${i}`,
        name,
        sub: sub || null,
        slug: slugify(name),
        day: day.id,
        dayIndex: di,
        dayLabel: day.label,
        stage: stageId,
        stageName: FEST.stages[stageId].name,
        start, end,
        from: from.getTime(),
        to: to.getTime(),
        mins: Math.round((to - from) / 60000),
      });
    });
  });
});

SETS.sort((a, b) => a.from - b.from);

const SETS_BY_ID = Object.fromEntries(SETS.map(s => [s.id, s]));
