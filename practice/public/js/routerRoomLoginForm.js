const logo = document.querySelector(".logo-container");
const login = document.querySelector(".login-register");
const modalContainer = document.querySelector(".modal-container");
const loginForm = document.querySelector(".login-container");
const loginEmailInput = document.querySelector("#login-email");
const loginEmailPassword = document.querySelector("#login-password");
const loginErrorDiv = document.querySelector(".login-error-message");
const registerForm = document.querySelector(".register-container");
const registerErrorDiv = document.querySelector(".register-error-message");
const loginExit = document.querySelector(".login-form-exit");
const registerExit = document.querySelector(".register-form-exit");
const overlay = document.querySelector(".overlay");
const formExit = document.querySelectorAll(".form-exit");
const toRegisterLink = document.querySelector(".to-register-link");
const toLoginLink = document.querySelector(".to-login-link");

logo.addEventListener("click", () => {
  window.location = "/";
});

function modalControl(param) {
  if (param === "hidden") {
    overlay.classList.add("hidden");
    // gradientBar.classList.remove("hidden");
    loginForm.classList.add("hidden");
    modalContainer.classList.add("hidden");
  } else if (param === "block") {
    overlay.classList.remove("hidden");
    // gradientBar.classList.remove("hidden");
    loginForm.classList.remove("hidden");
    modalContainer.classList.remove("hidden");
    modalContainer.style.animation = "slideInFromTop 0.5s ease-out forwards";
  }
}

function loginEvent() {
  modalControl("block");
}

login.addEventListener("click", loginEvent);

toRegisterLink.addEventListener("click", () => {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
});

toLoginLink.addEventListener("click", () => {
  document.querySelector("#register-name").value = "";
  document.querySelector("#register-email").value = "";
  document.querySelector("#register-password").value = "";
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
});

formExit.forEach((el) => {
  el.addEventListener("click", () => {
    overlay.classList.add("hidden");
    // gradientBar.classList.add("hidden");
    loginForm.classList.add("hidden");
    registerForm.classList.add("hidden");
    modalContainer.classList.add("hidden");
    document.querySelector("#register-name").value = "";
    document.querySelector("#register-email").value = "";
    document.querySelector("#register-password").value = "";
    document.querySelector("#login-email").value = "";
    document.querySelector("#login-password").value = "";
    document.querySelector("#loginErrorDiv").textContent = "";
    document.querySelector("#registerErrorDiv").textContent = "";
  });
});

// handle register
function handleRegister() {
  const registerName = document.querySelector("#register-name");
  const registerEmail = document.querySelector("#register-email");
  const registerPassword = document.querySelector("#register-password");
  const registerForm = document.querySelector(".register-form");

  const registerUser = async (name, email, password) => {
    const response = await fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // console.error("Error:", errorData);
      registerErrorDiv.style.color = "red";
      registerErrorDiv.textContent = errorData.message;
    } else {
      const data = await response.json();
      console.log("Success:", data);
      return data;
    }
  };

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = await registerUser(
      registerName.value,
      registerEmail.value,
      registerPassword.value
    );
    if (result.ok) {
      registerErrorDiv.style.color = "green";
      registerErrorDiv.textContent = "註冊成功";
    }
  });
}

handleRegister();

function logoutEvent() {
  login.removeEventListener("click", logoutEvent);
  login.textContent = "登入/註冊";
  login.addEventListener("click", loginEvent);
  localStorage.removeItem("session");
  localStorage.removeItem("proImg");
  window.location.reload();
}

// handle login
function handleLogin() {
  const loginEmail = document.querySelector("#login-email");
  const loginPassword = document.querySelector("#login-password");
  const loginForm = document.querySelector(".login-form");
  const loginUser = async (email, password) => {
    const response = await fetch("/api/user/auth", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      loginErrorDiv.style.color = "red";
      loginErrorDiv.textContent = errorData.message;
    } else {
      const data = await response.json();
      window.location.reload();
      return data;
    }
  };

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const jwtToken = await loginUser(loginEmail.value, loginPassword.value);
    localStorage.setItem("session", jwtToken.token);
  });
}

handleLogin();
