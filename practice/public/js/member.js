import { checkStatus, logOutUser } from "../utils/loginOutAndRegister.js";
import { date } from "../utils/date.js";
async function init() {
  const payload = await checkStatus();
  await getUserInfo();
  if (payload) {
    logoRetrun();
    await updateName();
    await updateEmail();
    updatePassword();
    await userImg();
    logOutUser();
    date();
  }
}

init();

// logo
function logoRetrun() {
  const logo = document.querySelector(".logo");
  logo.addEventListener("click", (e) => {
    window.location.href = "/";
  });
}

let userInfo;
// get userInfo
async function getUserInfo() {
  let response = await fetch("/api/user/auth", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("session")}`,
    },
  });
  let data = await response.json();
  userInfo = data.payload;
  console.log(userInfo);
  return true;
}

// update name
async function saveName(newName) {
  if (!newName.trim()) {
    Swal.fire("新姓名不能為空值!");
    return;
  }

  let token = localStorage.getItem("session");
  let response = await fetch("/api/user/userInfo", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name: newName }),
  });
  token = await response.json();
  return token;
}

function cancelNameEdit(el) {
  document.querySelector(".user-name-edit").removeChild(el);
  document.querySelector(".user-name-edit > img").classList.remove("hidden");
  document.querySelector(".user-name-edit > div").classList.remove("hidden");
}

async function updateName() {
  document.querySelector(".name").textContent = userInfo.userName;
  document
    .querySelector(".user-name-edit > img")
    .addEventListener("click", async () => {
      // 修改 checkLoginStatus
      userInfo = await checkStatus();
      document.querySelector(".user-name-edit > img").classList.add("hidden");
      document.querySelector(".user-name-edit > div").classList.add("hidden");

      let editNameDiv = document.createElement("div");
      editNameDiv.className = "edit-name-input-container";

      let input = document.createElement("input");
      input.className = "input-value";
      input.type = "text";
      console.log(userInfo);
      input.value = userInfo.payload.userName;

      let btnContainer = document.createElement("div");
      btnContainer.className = "button-container";

      let saveButton = document.createElement("button");
      saveButton.textContent = "更新姓名";
      saveButton.onclick = async () => {
        let jwtToken = await saveName(input.value);

        if (jwtToken) {
          localStorage.setItem("session", jwtToken.token);
          localStorage.setItem("username", jwtToken.username);
          document.querySelector(".name").textContent = document.querySelector(
            ".edit-name-input-container > .input-value"
          ).value;
          document.querySelector(".user-name-edit").removeChild(editNameDiv);
          document
            .querySelector(".user-name-edit > img")
            .classList.remove("hidden");
          document
            .querySelector(".user-name-edit > div")
            .classList.remove("hidden");
        }
      };

      let cancelButton = document.createElement("button");
      cancelButton.textContent = "取消";
      cancelButton.onclick = () => cancelNameEdit(editNameDiv);

      btnContainer.appendChild(saveButton);
      btnContainer.appendChild(cancelButton);

      editNameDiv.appendChild(input);
      editNameDiv.appendChild(btnContainer);

      document.querySelector(".user-name-edit").appendChild(editNameDiv);
    });
}

// update email
function validateEmail(email) {
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
}

async function saveEmail(newEmail) {
  if (!newEmail.trim()) {
    Swal.fire("新 Email 不能為空值!");
    return;
  }
  if (validateEmail(newEmail)) {
    let token = localStorage.getItem("session");
    let response = await fetch("/api/user/userInfo", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: newEmail }),
    });
    token = await response.json();
    console.log(token);
    if (token.error) {
      Swal.fire(token.message);
      return false;
    }
    return token;
  } else {
    Swal.fire("請輸入有效的電子郵件");
  }
}

function cancelEmailEdit(el) {
  document.querySelector(".user-email-edit").removeChild(el);
  document.querySelector(".user-email-edit > img").classList.remove("hidden");
  document.querySelector(".user-email-edit > div").classList.remove("hidden");
}

async function updateEmail() {
  document.querySelector(".email").textContent = userInfo.userEmail;
  document
    .querySelector(".user-email-edit > img")
    .addEventListener("click", async () => {
      // 修改 checkLoginStatus
      userInfo = await checkStatus();
      document.querySelector(".user-email-edit > img").classList.add("hidden");
      document.querySelector(".user-email-edit > div").classList.add("hidden");

      let editEmailDiv = document.createElement("div");
      editEmailDiv.className = "edit-email-input-container";

      let input = document.createElement("input");
      input.className = "input-value";
      input.type = "text";
      input.value = userInfo.payload.userEmail;

      let btnContainer = document.createElement("div");
      btnContainer.className = "button-container";

      let saveButton = document.createElement("button");
      saveButton.textContent = "更新 Email";
      saveButton.onclick = async () => {
        let jwtToken = await saveEmail(input.value);
        console.log(jwtToken);
        if (jwtToken) {
          localStorage.setItem("session", jwtToken.token);
          document.querySelector(".email").textContent = document.querySelector(
            ".edit-email-input-container > .input-value"
          ).value;
          document.querySelector(".user-email-edit").removeChild(editEmailDiv);
          document
            .querySelector(".user-email-edit > img")
            .classList.remove("hidden");
          document
            .querySelector(".user-email-edit > div")
            .classList.remove("hidden");
        }
      };

      let cancelButton = document.createElement("button");
      cancelButton.textContent = "取消";
      cancelButton.onclick = () => cancelEmailEdit(editEmailDiv);

      btnContainer.appendChild(saveButton);
      btnContainer.appendChild(cancelButton);

      editEmailDiv.appendChild(input);
      editEmailDiv.appendChild(btnContainer);

      document.querySelector(".user-email-edit").appendChild(editEmailDiv);
    });
}

// update password
function validatePassword(password, passwordValidate) {
  if (!password.trim() || !passwordValidate.trim()) {
    Swal.fire("新密碼不能為空值!");
    return;
  }
  return password === passwordValidate;
}

function cancelPasswordEdit(el) {
  document.querySelector(".password-container").removeChild(el);
  document
    .querySelector(".user-password-edit > img")
    .classList.remove("hidden");
}

async function savePassword() {
  const newPasswordInput = document.querySelector(".new-password").value;
  const newPasswordInputValidate = document.querySelector(
    ".new-password-validate"
  ).value;

  if (validatePassword(newPasswordInput, newPasswordInputValidate)) {
    let token = localStorage.getItem("session");
    let response = await fetch("/api/user/userInfo", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password: newPasswordInput }),
    });
    let fetchStatus = await response.json();
    console.log(fetchStatus);
    if (fetchStatus.ok) {
      Swal.fire("密碼更新成功");
      return true;
    }
  } else {
    Swal.fire("兩次密碼輸入不相同");
    return false;
  }
}

function updatePassword() {
  document
    .querySelector(".user-password-edit > img")
    .addEventListener("click", () => {
      document
        .querySelector(".user-password-edit > img")
        .classList.add("hidden");

      let html = `<div class="password-update-form">
                  <div class="new-password-container">
                      <label>請輸入新的密碼：</label>
                      <input type="password" class="new-password">
                  </div>
                  <div>
                      <label>請再輸入一次新的密碼：</label>
                      <input type="password" class="new-password-validate">
                  </div>
                  <div class="button-container"><button class="password-update-btn">更新密碼</button><button class="password-cancel-btn">取消</button></div>
              </div>`;

      document
        .querySelector(".password-container")
        .insertAdjacentHTML("beforeend", html);

      document
        .querySelector(".password-cancel-btn")
        .addEventListener("click", (e) => {
          const editPasswordDiv = document.querySelector(
            ".password-update-form"
          );
          cancelPasswordEdit(editPasswordDiv);
        });

      document
        .querySelector(".password-update-btn")
        .addEventListener("click", async (e) => {
          const editPasswordDiv = document.querySelector(
            ".password-update-form"
          );
          const response = await savePassword();
          console.log(response);

          //   if (response) {
          //     document
          //       .querySelector(".password-container")
          //       .removeChild(editPasswordDiv);
          //     document
          //       .querySelector(".user-password-edit > img")
          //       .classList.remove("hidden");
          //   }
        });
    });
}

// upload Image
async function uploadImage(event) {
  let file = event.target.files[0];
  let token = localStorage.getItem("session");
  if (!file) {
    Swal.fire("No file selected.");
    return;
  }

  let fileType = file.type;
  console.log(fileType);
  if (
    fileType !== "image/jpeg" &&
    fileType !== "image/jpg" &&
    fileType !== "image/png"
  ) {
    Swal.fire("只能上傳 JPG 或 PNG 檔案圖片!");
    return;
  }

  let formData = new FormData();
  formData.append("file", file);
  try {
    let response = await fetch("/api/userImg", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    let getUploadInfo = await response.json();
    if (!response.ok) {
      console.error("HTTP error", response.status);

      Swal.fire(getUploadInfo.message);
      return;
    } else {
      console.log("getUploadInfo: ", getUploadInfo);
      Swal.fire(getUploadInfo.message);
      localStorage.setItem("proImg", getUploadInfo.url);
      //   修改
      window.location.href = `/member`;
    }
  } catch (err) {
    console.error("Error:", err);
    Swal.fire("Failed to upload file.");
  }
}

document.getElementById("fileInput").addEventListener("change", uploadImage);

async function userImg() {
  let sessionImgURL = localStorage.getItem("proImg");

  if (sessionImgURL) {
    document.querySelector(".photo > img").src = sessionImgURL;
  } else {
    let response = await fetch("/api/userImg", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("session")}`,
      },
    });
    let url = await response.json();
    console.log(url);
    if (url.message !== "File not found" && !url.url) {
      localStorage.setItem("proImg", url.url);
      document.querySelector(".photo > img").src = url.url;
    }
  }
}
