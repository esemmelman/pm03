// Device detection is intentionally platform-specific; small desktop/iOS screens keep Calendar startup.
window.soloPlatform={android:/Android/i.test(navigator.userAgent)||navigator.userAgentData?.platform==='Android'};
if(window.soloPlatform.android)document.documentElement.classList.add('android-command-first');
