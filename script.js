// footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// PYQ year switching
const chips = document.querySelectorAll(".chip");
const yearLabels = document.querySelectorAll(".yearLabel");

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    chips.forEach(c => c.classList.remove("active"));
    chip.classList.add("active");

    const y = chip.dataset.year;
    yearLabels.forEach(l => l.textContent = y);
  });
});
