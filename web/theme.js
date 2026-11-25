(() => {
  const dayStart = 7;
  const nightStart = 20;
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let timer;

  function updateTheme() {
    const now = new Date();
    const hour = now.getHours();
    const dark = hour < dayStart || hour >= nightStart;
    root.dataset.theme = dark ? 'dark' : 'light';
    if (themeColor) themeColor.content = dark ? '#181420' : '#fbf9fd';

    const next = new Date(now);
    if (hour >= nightStart) next.setDate(next.getDate() + 1);
    next.setHours(dark ? dayStart : nightStart, 0, 0, 0);
    clearTimeout(timer);
    // Recheck the device clock after sleep or a change of time zone.
    timer = setTimeout(updateTheme, Math.min(next - now, 60_000));
  }

  updateTheme();
  window.addEventListener('pageshow', updateTheme);
  window.addEventListener('focus', updateTheme);
  document.addEventListener('visibilitychange', updateTheme);
})();
