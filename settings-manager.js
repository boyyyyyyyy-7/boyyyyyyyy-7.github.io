// Function to save settings to localStorage
function saveBackgroundSetting(name, value) {
    localStorage.setItem(name, JSON.stringify(value));
}

// Function to load settings from localStorage
function loadBackgroundSetting(name) {
    const value = localStorage.getItem(name);
    return value ? JSON.parse(value) : null;
}

document.addEventListener('DOMContentLoaded', () => {
    // Get references to elements
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsMenu = document.getElementById('settingsMenu');
    const closeSettings = document.getElementById('closeSettings');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const injectionToggle = document.getElementById('injectionToggle');
    const christmasModeToggle = document.getElementById('christmasModeToggle');
    const darkModeCheckbox = document.getElementById('darkModeCheckbox');
    const injectionCheckbox = document.getElementById('injectionCheckbox');
    const christmasModeCheckbox = document.getElementById('christmasModeCheckbox');
    const openInjectionBtn = document.getElementById('openInjectionBtn');

    // Update toggle switch visual states
    function updateToggleStates() {
        darkModeToggle.classList.toggle('active', darkModeCheckbox.checked);
        injectionToggle.classList.toggle('active', injectionCheckbox.checked);
        christmasModeToggle.classList.toggle('active', christmasModeCheckbox.checked);
    }

    // Toggle settings menu
    function toggleSettings() {
        settingsMenu.classList.toggle('active');
    }

    // Close settings menu
    function closeSettingsMenu() {
        settingsMenu.classList.remove('active');
    }

    // About:Blank injection function
    function openAboutBlank() {
        const newTab = window.open('about:blank', '_blank');
        
        if (newTab) {
            newTab.document.write('<html><head><title>Brayden-is-tall-games</title></head><body style="margin:0; padding:0; overflow:hidden;">');
            newTab.document.write('<iframe src="https://braydenistallgames.online" style="border:none; width:100vw; height:100vh;"></iframe>');
            newTab.document.write('</body></html>');
            newTab.document.close();
        } else {
            alert('Popup blocked! Please allow popups for this site.');
        }
    }

    // Auto-open about:blank when toggle is enabled
    function checkAndOpenAboutBlank() {
        if (injectionCheckbox.checked) {
            openAboutBlank();
        }
    }

    // Event listeners
    if (settingsBtn) settingsBtn.addEventListener('click', toggleSettings);
    if (closeSettings) closeSettings.addEventListener('click', closeSettingsMenu);
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (settingsMenu && settingsBtn && !settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
            closeSettingsMenu();
        }
    });
    
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            darkModeCheckbox.checked = !darkModeCheckbox.checked;
            updateToggleStates();
            saveBackgroundSetting('darkMode', darkModeCheckbox.checked);
            
            if (darkModeCheckbox.checked) {
                document.body.classList.remove('light-mode');
                document.body.classList.add('dark-mode');
                document.body.classList.remove('christmas-mode');
            } else {
                document.body.classList.remove('dark-mode');
                document.body.classList.add('light-mode');
                document.body.classList.remove('christmas-mode');
            }
        });
    }
    
    if (injectionToggle) {
        injectionToggle.addEventListener('click', function() {
            injectionCheckbox.checked = !injectionCheckbox.checked;
            updateToggleStates();
            saveBackgroundSetting('injection', injectionCheckbox.checked);
            
            if (injectionCheckbox.checked && !window.frameElement) {
                openAboutBlank();
            }
        });
    }

    if (christmasModeToggle) {
        christmasModeToggle.addEventListener('click', function() {
            christmasModeCheckbox.checked = !christmasModeCheckbox.checked;
            updateToggleStates();
            saveBackgroundSetting('christmasMode', christmasModeCheckbox.checked);

            if (christmasModeCheckbox.checked) {
                document.body.classList.add('christmas-mode');
            } else {
                document.body.classList.remove('christmas-mode');
            }
        });
    }

    if (openInjectionBtn) openInjectionBtn.addEventListener('click', openAboutBlank);

    // Load settings on page load
    const savedDarkMode = loadBackgroundSetting('darkMode');
    if (savedDarkMode !== null) {
        darkModeCheckbox.checked = savedDarkMode;
        if (darkModeCheckbox.checked) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.add('light-mode');
        }
    }

    const savedInjection = loadBackgroundSetting('injection');
    if (savedInjection !== null) {
        injectionCheckbox.checked = savedInjection;
        // Immediately check and open about:blank if injection is enabled on page load
        if (injectionCheckbox.checked && !window.frameElement) {
            openAboutBlank();
        }
    }
    
    const savedChristmasMode = loadBackgroundSetting('christmasMode');
    if (savedChristmasMode !== null) {
        christmasModeCheckbox.checked = savedChristmasMode;
        if (christmasModeCheckbox.checked) {
            document.body.classList.add('christmas-mode');
        }
    }
    updateToggleStates();
});
