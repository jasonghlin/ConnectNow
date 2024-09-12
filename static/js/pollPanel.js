import { socket, roomId } from "./script.js";

const pollButton = document.querySelector(".poll");
const pollPanel = document.querySelector(".poll-panel");
const closePollButton = document.getElementById("close-poll");
const body = document.body;
const pollForm = document.getElementById("poll-form");
const addOptionButton = document.getElementById("add-option");
const pollResults = document.getElementById("poll-results");
const resultsContainer = document.getElementById("results-container");
const pollQuestionDisplay = document.getElementById("poll-question-display");
const pollOptionsDisplay = document.getElementById("poll-options-display");
let optionCount = 2;
let pollActive = false;

// 添加返回按鈕
const returnButton = document.createElement("button");
returnButton.textContent = "返回創建投票";
returnButton.id = "return-to-poll-creation";
returnButton.style.display = "none";
pollPanel.appendChild(returnButton);

pollButton.addEventListener("click", () => {
  pollPanel.classList.add("show");
});

closePollButton.addEventListener("click", () => {
  pollPanel.classList.remove("show");
});

// Create a Mutation Observer to monitor the poll-options container
// 定義 MutationObserver 的回調函數
const pollOptionObserverCallback = function (mutationsList, observer) {
  for (let mutation of mutationsList) {
    if (mutation.type === "childList") {
      // 檢查是否有 'add-option' 按鈕被加入
      const addedNodes = mutation.addedNodes;
      addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.id === "add-option") {
          // 為 'add-option' 按鈕添加 event listener
          node.addEventListener("click", () => {
            optionCount++;
            const newOption = document.createElement("div");
            newOption.classList.add("option-container");
            newOption.classList.add(`option-${optionCount}-container`);
            newOption.innerHTML = `
                  <label for="option-${optionCount}">選項 ${optionCount}：</label>
                  <input type="text" id="option-${optionCount}" name="options" required>
              `;
            document.getElementById("poll-options").appendChild(newOption);
          });
        }
      });
    }
  }
};

// 創建 MutationObserver 例項
const pollOptionObserver = new MutationObserver(pollOptionObserverCallback);
// 開始監聽 pollForm 內的變動
pollOptionObserver.observe(pollForm, {
  childList: true,
  subtree: true, // 如果表單內有多層結構，這個參數允許監聽到子元素的變動
});

addOptionButton?.addEventListener("click", () => {
  optionCount++;
  const newOption = document.createElement("div");
  newOption.classList.add("option-container");
  newOption.classList.add(`option-${optionCount}-container`);
  newOption.innerHTML = `
        <label for="option-${optionCount}">選項 ${optionCount}：</label>
        <input type="text" id="option-${optionCount}" name="options" required>
    `;
  document.getElementById("poll-options").appendChild(newOption);
});

pollForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (pollActive) {
    Swal.fire("目前有一個投票正在進行，請稍後再試。");
    return;
  }

  const formData = new FormData(pollForm);
  const question = formData.get("poll-question");
  const options = formData.getAll("options");

  pollResults.classList.add("hidden");
  resultsContainer.innerHTML = "";

  pollActive = true;

  console.log("Sending start-poll event", { question, options });
  socket.emit("start-poll", { question, options }, roomId);

  pollForm.style.display = "none";
  console.log("Poll form hidden");

  setTimeout(() => {
    console.log("Sending end-poll event");
    socket.emit("end-poll", roomId);
  }, 60000);
});

socket.on("show-poll", ({ question, options }) => {
  console.log("Received show-poll event", { question, options });
  pollQuestionDisplay.textContent = question;
  pollOptionsDisplay.innerHTML = "";
  options.forEach((option, index) => {
    const optionElement = document.createElement("div");
    optionElement.className = "poll-option";
    optionElement.innerHTML = `
        <input type="radio" name="poll" id="poll-option-${index}" value="${option}">
        <label for="poll-option-${index}">${option}</label>
      `;
    pollOptionsDisplay.appendChild(optionElement);
  });
  pollPanel.classList.add("show");
  pollForm.style.display = "none";
  pollOptionsDisplay.style.display = "block";
  pollOptionsDisplay.classList.remove("hidden");
  returnButton.style.display = "none";
  console.log("Poll options displayed");
});

pollOptionsDisplay.addEventListener("change", (event) => {
  if (event.target.name === "poll") {
    console.log("Sending vote event", event.target.value);
    socket.emit("vote", event.target.value, roomId);
    const radioButtons = pollOptionsDisplay.querySelectorAll(
      'input[type="radio"]'
    );
    radioButtons.forEach((radio) => (radio.disabled = true));
  }
});

socket.on("show-results", (results) => {
  console.log("Received show-results event", results);
  updateResults(results);
  pollActive = false;
  pollResults.classList.remove("hidden");
  pollOptionsDisplay.style.display = "none";
  returnButton.style.display = "block"; // 顯示返回按鈕
  console.log("Poll results displayed, return button shown");
});

socket.on("update-results", (results) => {
  console.log("Received update-results event", results);
  updateResults(results);
  pollResults.classList.remove("hidden");
});

function updateResults(results) {
  resultsContainer.innerHTML = "";
  results.forEach((result) => {
    const resultOption = document.createElement("div");
    resultOption.className = "result-option";
    resultOption.innerHTML = `
        <span>${result.option}</span>
        <div class="progress-bar">
          <div class="progress" style="width: ${result.percentage}%"></div>
        </div>
        <span>${result.percentage}%</span>
      `;
    resultsContainer.appendChild(resultOption);
  });
}

// 返回按鈕點擊事件
returnButton.addEventListener("click", () => {
  console.log("返回創建投票按鈕被點擊");
  pollForm.style.display = "block";
  pollResults.classList.add("hidden");
  pollOptionsDisplay.style.display = "none";
  pollQuestionDisplay.style.display = "none";
  returnButton.style.display = "none";
  pollActive = false;
  console.log("Returned to poll creation, poll form shown");
});
