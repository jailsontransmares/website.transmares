
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const dropdown = document.querySelector(".dropdown");
const dropdownButton = document.querySelector(".dropdown button");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    mainNav.classList.toggle("is-open");
  });
}

if (dropdown && dropdownButton) {
  dropdownButton.addEventListener("click", (event) => {
    if (window.innerWidth <= 860) {
      event.preventDefault();
      dropdown.classList.toggle("is-open");
    }
  });
}

document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    if (window.innerWidth <= 860 && mainNav) {
      mainNav.classList.remove("is-open");
    }
  });
});
