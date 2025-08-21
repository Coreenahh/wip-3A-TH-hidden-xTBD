function validateLogin(event) {
    if (event) event.preventDefault(); 
  
    const inputEl   = document.getElementById('password');
    const messageEl = document.getElementById('accessMessage');
    if (!inputEl || !messageEl) return;
  
    const passwordInput = (inputEl.value || "").trim();
  
    if (passwordInput === 'Corina') {
      messageEl.innerText = "Access Granted!";
      window.location.href = "portal.html";
    } else if (passwordInput === '2002') {
      messageEl.innerText = "Access Granted!";
      window.location.href = "nier.html";
    } else if (passwordInput === 'IDENTITY') {
      messageEl.innerText = "Generating Identity...";
      window.location.href = "cyberpunk.html";
    } else if (passwordInput === 'Corinne') {
      messageEl.innerText = "You Are A Monster!";
    } else if (passwordInput === 'password') {
      messageEl.innerText = "No creativity???";
    } else if (passwordInput === 'corina') {
      messageEl.innerText = "Is your caps lock broken???";
    } else if (passwordInput === 'Colchester') {
      messageEl.innerText = "Be patient, damn. Not the place, nor the time.";
    } else if (passwordInput === 'Lieutenant') {
      messageEl.innerText = "Yes, sir! o7.";
    } else if (passwordInput === '2077') {
      messageEl.innerText = "I hate CDProjektRED";
    } else if (passwordInput === '1994') {
      messageEl.innerText = "Grandpa";
    } else if (passwordInput === '') {
      messageEl.innerText = "Lazy bastard.";
    } else {
      messageEl.innerText = "Wrong Password.";
    }
  }
  

  (function wireLoginEnter() {
    const inputEl = document.getElementById('password');
    if (!inputEl) return;
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        validateLogin(e);
      }
    });
  })();
  