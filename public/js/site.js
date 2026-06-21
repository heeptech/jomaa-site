const navToggle = document.querySelector(".nav-toggle");
const mainNav = document.querySelector(".main-nav");

if (navToggle && mainNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll("[data-copy-link]").forEach((button) => {
  button.addEventListener("click", async () => {
    const link = button.getAttribute("data-copy-link");
    try {
      await navigator.clipboard.writeText(link);
      button.textContent = "تم النسخ";
      setTimeout(() => {
        button.textContent = "نسخ الرابط";
      }, 1600);
    } catch (error) {
      window.prompt("انسخ الرابط:", link);
    }
  });
});

document.querySelectorAll("form[data-confirm]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    if (!window.confirm(form.getAttribute("data-confirm"))) {
      event.preventDefault();
    }
  });
});
