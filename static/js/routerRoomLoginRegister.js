import { checkStatus } from "https://static.connectnow.website/connectnow/static/utils/loginOutAndRegister.js";

const BASE_URL =
  window.location.protocol == "https:"
    ? "https://www.connectnow.website"
    : "http://127.0.0.1:8080";

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
    document.querySelector(".login-error-message").textContent = "";
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
    const response = await fetch(`${BASE_URL}/api/user`, {
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
      registerErrorDiv.style.color = "green";
      registerErrorDiv.textContent = data.message;
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
  localStorage.clear();
  document.querySelector(".modal-container").classList.remove("hidden");
  document.querySelector(".overlay").classList.remove("hidden");
  window.location.reload();
}

// handle login
function handleLogin() {
  const loginEmail = document.querySelector("#login-email");
  const loginPassword = document.querySelector("#login-password");
  const loginForm = document.querySelector(".login-form");

  const loginUser = async (email, password) => {
    const response = await fetch(`${BASE_URL}/api/user/auth`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      loginErrorDiv.style.color = "red";
      loginErrorDiv.textContent = errorData.details;
    } else {
      const data = await response.json();
      // Set the localStorage items here
      localStorage.setItem("session", data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("userId", data.userId); // Assuming data contains userId
      document.querySelector(".modal-container").classList.add("hidden");
      document.querySelector(".overlay").classList.add("hidden");
      // Then reload the page
      window.location.reload();
      return data;
    }
  };

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await loginUser(loginEmail.value, loginPassword.value);
  });
}

let loginStatus = await checkStatus();

if (loginStatus?.payload) {
} else {
  login.addEventListener("click", loginEvent);
  handleLogin();
}

// handle logout

document.querySelector(".google-login").addEventListener("click", (e) => {
  e.preventDefault();
  const protocol =
    window.location.protocol === "https:" ? "https://" : "http://";
  window.location.href = `${protocol}www.connectnow.website/auth/google`;
});
