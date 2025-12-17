(function () {
  const DEFAULT_THEME = 'christmas';
  const THEME_BACKGROUNDS = {
    classic: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
    light: 'linear-gradient(135deg, #f6f7fb 0%, #e5e7eb 100%)',
    christmas: 'linear-gradient(135deg, #1a2b3c 0%, #0d1a26 100%)'
  };

  const THEME_CLASSES = ['classic-theme', 'light-theme', 'christmas-theme'];

  function setBackground(body, bgValue) {
    if (!body || !bgValue) return;

    // Clear existing inline values before applying new ones
    body.style.backgroundImage = '';
    body.style.backgroundColor = '';
    body.style.backgroundSize = '';
    body.style.backgroundPosition = '';
    body.style.backgroundAttachment = '';

    if (bgValue.startsWith('url')) {
      body.style.backgroundImage = bgValue;
      body.style.backgroundSize = 'cover';
      body.style.backgroundPosition = 'center';
      body.style.backgroundAttachment = 'fixed';
    } else if (bgValue.startsWith('linear-gradient')) {
      body.style.backgroundImage = bgValue;
      body.style.backgroundSize = 'cover';
      body.style.backgroundAttachment = 'fixed';
    } else {
      body.style.backgroundColor = bgValue;
    }
  }

  function applyBackground() {
    const body = document.body;
    if (!body) return;

    const savedBg = localStorage.getItem('customBackground');
    const savedTheme = localStorage.getItem('selectedTheme') || DEFAULT_THEME;

    // Remove theme classes to avoid stale styles on pages that define them
    body.classList.remove(...THEME_CLASSES);

    if (savedBg) {
      setBackground(body, savedBg);
      return;
    }

    const themeBackground = THEME_BACKGROUNDS[savedTheme] || THEME_BACKGROUNDS[DEFAULT_THEME];
    setBackground(body, themeBackground);

    // Add theme class in case the page defines theme-specific styles
    body.classList.add(`${savedTheme}-theme`);
  }

  document.addEventListener('DOMContentLoaded', applyBackground);
  window.addEventListener('storage', (event) => {
    if (['customBackground', 'bgType', 'selectedTheme'].includes(event.key)) {
      applyBackground();
    }
  });

  // Expose for pages that want to re-run after their own UI interactions
  window.applyUserBackground = applyBackground;
})();

