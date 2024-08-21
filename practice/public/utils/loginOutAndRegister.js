function registerUser() {
  const registerForm = document.querySelector(".register-form");
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    let registerName = e.target["register-name"].value;
    let registerEmail = e.target["register-email"].value;
    let registerPassword = e.target["register-password"].value;
    let response = await fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      }),
    });
    if (!response.ok) {
      const message = await response.json();
      console.log(message);
      if (message.message === "此 email 已註冊過") {
        alert("此 Email 已註冊過");
      } else {
        alert(message);
      }
    } else {
      window.location.href = "/";
    }
  });
}

function loginUser() {
  const loginForm = document.querySelector(".login-form");
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    let loginEmail = e.target["login-email"].value;
    let loginPassword = e.target["login-password"].value;
    let response = await fetch("/api/user/auth", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: loginEmail,
        password: loginPassword,
      }),
    });
    let token = await response.json();
    if (!response.ok) {
      alert(token.details);
    }
    localStorage.setItem("session", token.token);
    localStorage.setItem("username", token.username);
    localStorage.setItem("username", token.userId);
  });
}

function logOutUser() {
  const logoutBtn = document.querySelector(".logout");
  logoutBtn.addEventListener("click", (e) => {
    localStorage.removeItem("session");
    localStorage.removeItem("username");
    localStorage.removeItem("proImg");
    window.location.href = "/";
  });
}

async function checkStatus() {
  const token = localStorage.getItem("session");

  if (token) {
    try {
      const response = await fetch("/api/user/auth", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Response status:", response.status); // 確認 response status

      if (!response.ok) {
        console.error("Error:", response.statusText);
        localStorage.clear();
        return null;
      } else {
        const payload = await response.json();
        return payload;
      }
    } catch (error) {
      console.error("Fetch error:", error);
      return null;
    }
  } else {
    console.error("No token found in localStorage");
    localStorage.clear();
    return null;
  }
}

export { checkStatus, logOutUser, registerUser, loginUser };
