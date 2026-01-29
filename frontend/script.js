const data = {
  Physics: [
    {
      q: "If force = mass × acceleration, find force when m = 2 kg and a = 5 m/s².",
      s: "F = ma = 2 × 5 = 10 N"
    },
    {
      q: "A body moves with constant velocity. What is the net force on it?",
      s: "Net force = 0 (Newton’s First Law)"
    }
  ],
  Chemistry: [
    {
      q: "What is the atomic number of Oxygen?",
      s: "Atomic number of Oxygen = 8"
    },
    {
      q: "Define molarity.",
      s: "Molarity = moles of solute / liters of solution"
    }
  ],
  Maths: [
    {
      q: "What is the derivative of x²?",
      s: "d/dx (x²) = 2x"
    },
    {
      q: "If sinθ = 1/2 and θ is acute, find cosθ.",
      s: "cosθ = √(1 - sin²θ) = √(1 - 1/4) = √(3/4) = √3/2"
    }
  ]
};

function render(subject) {
  const box = document.getElementById("questions");
  const items = data[subject] || [];
  let html = `<h3>${subject} PYQs (Sample)</h3>`;

  items.forEach((item, idx) => {
    html += `
      <div class="qbox">
        <b>Q${idx + 1}.</b> ${item.q}<br>
        <b>Solution:</b> ${item.s}
      </div>
      <hr>
    `;
  });

  box.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", () => {
  render("Physics"); // default

  document.getElementById("btnPhysics").addEventListener("click", () => render("Physics"));
  document.getElementById("btnChemistry").addEventListener("click", () => render("Chemistry"));
  document.getElementById("btnMaths").addEventListener("click", () => render("Maths"));
});
