// Harness settings for Kirtipur Map (see _engine/tests/harness.mjs)
export default {
  minutes: 20,
  progress: (d) => [`D${d.day.n}`, d.day.hour.toFixed(1), Math.round(d.stats.metres), d.stats.visits],
  summarize(feed) {
    const count = (re) => feed.filter((l) => re.test(l)).length;
    return { lines: feed.length, watchdogs: count(/WATCHDOG|stuck/i) };
  },
  moments: [
    ['morning', (d) => d.day.hour > 8 && d.day.hour < 8.3],
    ['busy', (d) => d.walkers.filter((p) => !p.hidden && p.pi < p.path.length).length >= 10],
    ['dusk', (d) => d.day.hour > 18.5 && d.day.hour < 19]
  ]
};
