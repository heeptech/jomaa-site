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

document.querySelectorAll("[data-clear-image]").forEach((button) => {
  button.addEventListener("click", () => {
    const flagName = button.getAttribute("data-clear-image");
    const inputName = button.getAttribute("data-clear-input");
    const previewSelector = button.getAttribute("data-clear-preview");
    const form = button.closest("form");
    if (!form) return;

    const flag = form.querySelector(`[name="${flagName}"]`);
    const input = form.querySelector(`[name="${inputName}"]`);
    const preview = previewSelector ? form.querySelector(previewSelector) : null;

    if (flag) flag.value = "1";
    if (input) input.value = "";
    if (preview) preview.remove();
  });
});

[
  ["coverImage", "removeCoverImage"],
  ["coverImageUrl", "removeCoverImage"],
  ["logoFile", "removeLogo"],
  ["logoUrl", "removeLogo"],
  ["heroImageFile", "removeHeroImage"],
  ["heroImageUrl", "removeHeroImage"]
].forEach(([inputName, flagName]) => {
  document.querySelectorAll(`[name="${inputName}"]`).forEach((input) => {
    input.addEventListener("input", () => {
      const form = input.closest("form");
      const flag = form ? form.querySelector(`[name="${flagName}"]`) : null;
      if (flag) flag.value = "";
    });
    input.addEventListener("change", () => {
      const form = input.closest("form");
      const flag = form ? form.querySelector(`[name="${flagName}"]`) : null;
      if (flag) flag.value = "";
    });
  });
});

const inlineImageInput = document.querySelector("[data-inline-image-input]");
const articleBody = document.querySelector("[data-article-body]");

if (inlineImageInput && articleBody) {
  inlineImageInput.addEventListener("change", () => {
    if (!inlineImageInput.files || !inlineImageInput.files.length) return;
    const marker = "\n\n[[INLINE_IMAGE]]\n\n";
    const start = articleBody.selectionStart || articleBody.value.length;
    const end = articleBody.selectionEnd || articleBody.value.length;
    articleBody.value = `${articleBody.value.slice(0, start)}${marker}${articleBody.value.slice(end)}`;
    const cursor = start + marker.length;
    articleBody.focus();
    articleBody.setSelectionRange(cursor, cursor);
  });
}
