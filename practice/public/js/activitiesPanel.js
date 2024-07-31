// activities
function activitiesPanel() {
  const activitiesButton = document.querySelector(".activities");
  const activitiesPanel = document.getElementById("activities-panel");
  const closeActivitiesButton = document.getElementById("close-activities");
  const body = document.body;

  activitiesButton.addEventListener("click", () => {
    activitiesPanel.classList.add("show");
    body.classList.add("panel-open");
  });

  closeActivitiesButton.addEventListener("click", () => {
    activitiesPanel.classList.remove("show");
    body.classList.remove("panel-open");
  });
}

activitiesPanel();
