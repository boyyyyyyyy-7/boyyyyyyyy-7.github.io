// Function to save settings to localStorage
function saveBackgroundSetting(name, value) {
    try {
        localStorage.setItem(name, JSON.stringify(value));
    } catch (e) {
        console.error("Error saving setting '" + name + "':", e);
    }
}

// Function to load settings from localStorage
function loadBackgroundSetting(name) {
    try {
        const value = localStorage.getItem(name);
        return value ? JSON.parse(value) : null;
    } catch (e) {
        console.error("Error loading setting '" + name + "':", e);
        return null;
    }
}

// Use window.onload to ensure all elements are fully loaded, including images
window.onload = () => {
    console.log("settings-manager.js: Window loaded. Initializing settings.");

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

    // Check if critical elements exist
    if (!settingsBtn) console.error("settings-manager.js: settingsBtn not found!");
    if (!settingsMenu) console.error("settings-manager.js: settingsMenu not found!");
    if (!closeSettings) console.error("settings-manager.js: closeSettings not found!");

    // Update toggle switch visual states
    function updateToggleStates() {
        console.log("settings-manager.js: Updating toggle states.");
        if (darkModeToggle) darkModeToggle.classList.toggle('active', darkModeCheckbox.checked);
        if (injectionToggle) injectionToggle.classList.toggle('active', injectionCheckbox.checked);
        if (christmasModeToggle) christmasModeToggle.classList.toggle('active', christmasModeCheckbox.checked);
    }

    // Toggle settings menu
    function toggleSettings() {
        console.log("settings-manager.js: Toggling settings menu.");
        if (settingsMenu) settingsMenu.classList.toggle('active');
    }

    // Close settings menu
    function closeSettingsMenu() {
        console.log("settings-manager.js: Closing settings menu.");
        if (settingsMenu) settingsMenu.classList.remove('active');
    }

    // About:Blank injection function
    function openAboutBlank() {
        console.log("settings-manager.js: Attempting to open about:blank.");
        const newTab = window.open('about:blank', '_blank');
        
        if (newTab) {
            newTab.document.write('<html><head><title>Brayden-is-tall-games</title></head><body style="margin:0; padding:0; overflow:hidden;">');
            newTab.document.write('<iframe src="https://braydenistallgames.online" style="border:none; width:100vw; height:100vh;"></iframe>');
            newTab.document.write('</body></html>');
            newTab.document.close();
            console.log("settings-manager.js: about:blank opened successfully.");
        } else {
            alert('Popup blocked! Please allow popups for this site.');
            console.warn("settings-manager.js: Popup blocked for about:blank.");
        }
    }

    // Auto-open about:blank when toggle is enabled
    function checkAndOpenAboutBlank() {
        console.log("settings-manager.js: Checking if about:blank auto-injection is enabled.");
        if (injectionCheckbox && injectionCheckbox.checked && !window.frameElement) {
            openAboutBlank();
        }
    }

    // Event listeners
    if (settingsBtn) {
        settingsBtn.addEventListener('click', toggleSettings);
        console.log("settings-manager.js: settingsBtn click listener attached.");
    }
    if (closeSettings) {
        closeSettings.addEventListener('click', closeSettingsMenu);
        console.log("settings-manager.js: closeSettings click listener attached.");
    }
    
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
            console.log("settings-manager.js: Dark mode toggled to " + darkModeCheckbox.checked);
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
            console.log("settings-manager.js: Injection toggled to " + injectionCheckbox.checked);
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
            console.log("settings-manager.js: Christmas mode toggled to " + christmasModeCheckbox.checked);
        });
    }

    if (openInjectionBtn) {
        openInjectionBtn.addEventListener('click', openAboutBlank);
        console.log("settings-manager.js: openInjectionBtn click listener attached.");
    }

    // Load settings on page load
    console.log("settings-manager.js: Loading saved settings.");
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
    console.log("settings-manager.js: Settings initialized.");
};
