function validatePortal(event) {
  event.preventDefault(); 

  var portalInput = document.getElementById('portalCode').value.trim();
  var messageEl = document.getElementById('portalMsg');

  if (portalInput === 'LT') {
    messageEl.innerText = "Good one, sir. Time we get back.";
    window.location.href = "index-2.html";
  } else if (portalInput === 'cake') {
    messageEl.innerText = "... is a lie, the pw is not portal-related.";
  } else if (portalInput === 'portal') {
    messageEl.innerText = "Unoriginal. Try harder.";
  } else if (portalInput === 'glados') {
    messageEl.innerText = "The irony is that you were almost at the last test. ";
  } else if (portalInput === 'chell') {
    messageEl.innerText = "Not from the game.";
  } else if (portalInput === 'wheatley') {
    messageEl.innerText = "I AM NOT A MORON!!";
  } else if (portalInput === ' ') {
    messageEl.innerText = "Lazy bastard.";
  } else if (portalInput === 'loopy') {
    messageEl.innerText = "How do you even know that?!?";
  } else if (portalInput === 'corina') {
    messageEl.innerText = "Why do you put my name in lowercase ):";
  } else if (portalInput === 'Corina') {
    messageEl.innerText = "Not this time, luv.";
  } else {
    messageEl.innerText = "Wrong Password.";
  }
}



document.getElementById('portalCode').addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault(); 
    validatePortal(e);  
  }
});
