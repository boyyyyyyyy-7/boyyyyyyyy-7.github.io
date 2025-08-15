// Ezoic Ads.txt Manager Redirect
// This script redirects ads.txt requests to Ezoic's managed version

(function() {
    'use strict';
    
    // Check if this is an ads.txt request
    if (window.location.pathname === '/ads.txt' || window.location.pathname.endsWith('/ads.txt')) {
        // Redirect to Ezoic Ads.txt Manager
        window.location.replace('https://srv.adstxtmanager.com/19390/braydenistallgames.online');
    }
})();
