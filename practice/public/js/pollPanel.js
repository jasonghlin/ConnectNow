import { socket } from "./script.js";

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

pollButton.addEventListener("click", () => {
  pollPanel.classList.add("show");
  body.classList.add("panel-open");
});

closePollButton.addEventListener("click", () => {
  pollPanel.classList.remove("show");
  body.classList.remove("panel-open");
});

addOptionButton.addEventListener("click", () => {
  optionCount++;
  const newOption = document.createElement("div");
  newOption.innerHTML = `
      <label for="option-${optionCount}">選項 ${optionCount}：</label>
      <input type="text" id="option-${optionCount}" name="options" required>
    `;
  document.getElementById("poll-options").appendChild(newOption);
});

pollForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (pollActive) {
    alert("目前有一個投票正在進行，請稍後再試。");
    return;
  }

  const formData = new FormData(pollForm);
  const question = formData.get("poll-question");
  const options = formData.getAll("options");

  pollResults.classList.add("hidden");
  resultsContainer.innerHTML = "";

  pollActive = true;

  console.log("Sending start-poll event", { question, options });
  socket.emit("start-poll", { question, options });

  // Hide the poll creation form
  pollForm.style.display = "none";

  setTimeout(() => {
    console.log("Sending end-poll event");
    socket.emit("end-poll");
  }, 60000);
});

socket.on("show-poll", ({ question, options }) => {
  console.log("Received show-poll event", { question, options });
  pollQuestionDisplay.textContent = question;
  pollOptionsDisplay.innerHTML = ""; // Clear previous options
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
  pollForm.style.display = "none"; // Hide the poll creation form for all users
  pollOptionsDisplay.style.display = "block"; // Show voting options
});

pollOptionsDisplay.addEventListener("change", (event) => {
  if (event.target.name === "poll") {
    console.log("Sending vote event", event.target.value);
    socket.emit("vote", event.target.value);
    // Disable voting after user has voted
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
  pollOptionsDisplay.style.display = "none"; // Hide voting options
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
