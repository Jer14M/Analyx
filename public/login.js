document.addEventListener("DOMContentLoaded", function () {
  // Toggle tra form di login e registrazione
  const loginToggle = document.getElementById("login-toggle");
  const registerToggle = document.getElementById("register-toggle");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  loginToggle.addEventListener("click", function () {
    loginToggle.classList.add("active");
    registerToggle.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
  });

  registerToggle.addEventListener("click", function () {
    registerToggle.classList.add("active");
    loginToggle.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  });

  // Gestione login
  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const errorElement = document.getElementById("login-error");

    // Invia richiesta di login al server
    fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Mostra messaggio di benvenuto con conteggio accessi
          if (data.loginCount) {
            alert(`Benvenuto ${data.username}!`);
          }
          // Salva l'utente loggato e reindirizza alla pagina principale
          localStorage.setItem(
            "eredita_user",
            JSON.stringify({
              username: data.username,
              loginCount: data.loginCount,
            }),
          );
          window.location.href = "/";
        } else {
          errorElement.textContent = data.message || "Errore durante il login";
        }
      })
      .catch((error) => {
        errorElement.textContent = "Errore di connessione al server";
        console.error("Errore:", error);
      });
  });

  // Gestione registrazione
  document
    .getElementById("registerForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();

      const username = document.getElementById("register-username").value;
      const password = document.getElementById("register-password").value;
      const confirmPassword = document.getElementById(
        "register-confirm-password",
      ).value;
      const errorElement = document.getElementById("register-error");

      // Verifica che le password coincidano
      if (password !== confirmPassword) {
        errorElement.textContent = "Le password non coincidono";
        return;
      }

      // Invia richiesta di registrazione al server
      fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Mostra messaggio di successo e reindirizza al login
            alert("Registrazione completata! Ora puoi accedere.");
            loginToggle.click();
          } else {
            errorElement.textContent =
              data.message || "Errore durante la registrazione";
          }
        })
        .catch((error) => {
          errorElement.textContent = "Errore di connessione al server";
          console.error("Errore:", error);
        });
    });
});
