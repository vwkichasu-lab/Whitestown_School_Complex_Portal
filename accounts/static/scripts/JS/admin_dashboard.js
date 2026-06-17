const dateElement = document.getElementById("current-date");
const now = new Date();

const options = { year: "numeric", month: "long", day: "numeric" };

dateElement.textContent = now.toLocaleDateString("en-US", options);