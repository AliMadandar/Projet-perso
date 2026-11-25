(() => {
  const dayStart = 7;
  const nightStart = 20;
  const storageKey = 'rivqo-theme-preference';
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let preference = 'auto';
  let timer;

  function updateTheme() {
    clearTimeout(timer);
    const now = new Date();
    const hour = now.getHours();
    const nighttime = hour < dayStart || hour >= nightStart;
    const dark = preference === 'dark' || (preference === 'auto' && nighttime);
    root.dataset.theme = dark ? 'dark' : 'light';
    if (themeColor) themeColor.content = dark ? '#181917' : '#f7f5ef';

    if (preference !== 'auto') return;
    const next = new Date(now);
    if (hour >= nightStart) next.setDate(next.getDate() + 1);
    next.setHours(dark ? dayStart : nightStart, 0, 0, 0);
    // Recheck the device clock after sleep or a change of time zone.
    timer = setTimeout(updateTheme, Math.min(next - now, 60_000));
  }

  function usePreference(value) {
    preference = value === 'light' || value === 'dark' ? value : 'auto';
    updateTheme();
    window.dispatchEvent(new Event('rivqo:appearance'));
  }

  window.rivqoTheme = {
    get preference() {
      return preference;
    },
    setPreference(value) {
      usePreference(value);
      try {
        localStorage.setItem(storageKey, preference);
        return true;
      } catch {
        return false;
      }
    }
  };

  let saved;
  try { saved = localStorage.getItem(storageKey); } catch {}
  usePreference(saved);
  window.addEventListener('storage', event => {
    if (event.storageArea === localStorage && (event.key === storageKey || event.key === null)) {
      usePreference(event.newValue);
    }
  });
  window.addEventListener('pageshow', updateTheme);
  window.addEventListener('focus', updateTheme);
  document.addEventListener('visibilitychange', updateTheme);
})();
