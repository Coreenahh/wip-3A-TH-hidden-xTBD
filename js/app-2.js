function validateLogin(event) {
    event.preventDefault(); 

    var passwordInput = document.getElementById('password').value;

    if (passwordInput === 'Shemagh') {
        document.getElementById('accessMessage').innerText = "Access Granted!";
        window.location.href = "nier.html";
    } else if (passwordInput === 'Corinne') {
        document.getElementById('accessMessage').innerText = "You Are A Monster!";
    } else if (passwordInput === 'password') {
        document.getElementById('accessMessage').innerText = "No creativity???";
    } else if (passwordInput === 'corina') {
        document.getElementById('accessMessage').innerText = "Is your caps lock broken???";
    } else if (passwordInput === 'Colchester') {
        document.getElementById('accessMessage').innerText = "Be patient, damn. Not the place, nor the time.";
    } else if (passwordInput === 'Lieutenant') {
        document.getElementById('accessMessage').innerText = "Yes, sir! o7.";
    } else if (passwordInput === '2077') {
        document.getElementById('accessMessage').innerText = "I hate CDProjektRED";
    } else if (passwordInput === '1994') {
        document.getElementById('accessMessage').innerText = "Grandpa";
    } else if (passwordInput === ' ') {
        document.getElementById('accessMessage').innerText = "Lazy bastard.";
    } else if (passwordInput === 'shemagh') {
        document.getElementById('accessMessage').innerText = "Capitalisation is sexy.";
    } else if (passwordInput === 'Corina') {
        document.getElementById('accessMessage').innerText = "Been there, done that.";
    } else {
        messageEl.innerText = "Wrong Password.";
      }
}

