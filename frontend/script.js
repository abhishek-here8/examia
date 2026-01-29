const data = {
  "JEE Main": {
    "2023": {
      Physics: [
        { q: "A body moves with constant velocity. What is the net force on it?", s: "Net force = 0 (Newton’s First Law)" }
      ],
      Chemistry: [
        { q: "What is the atomic number of Oxygen?", s: "Atomic number of Oxygen = 8" }
      ],
      Maths: [
        { q: "What is the derivative of x²?", s: "d/dx (x²) = 2x" }
      ]
    },
    "2022": {
      Physics: [
        { q: "If m = 2 kg and a = 5 m/s², find force.", s: "F = ma = 2 × 5 = 10 N" }
      ],
      Chemistry: [
        { q: "Define molarity.", s: "Molarity = moles of solute / liters of solution" }
      ],
      Maths: [
        { q: "If sinθ = 1/2 and θ is acute, find cosθ.", s: "cosθ = √(1 − 1/4) = √3/2" }
      ]
    },
    "2021": {
      Physics: [
        { q: "What is SI unit of power?", s: "Watt (W)" }
      ],
      Chemistry: [
        { q: "What is Avogadro’s number?", s: "6.022 × 10^23 mol⁻¹" }
      ],
      Maths: [
        { q: "Solve: 2x = 10", s: "x = 5" }
      ]
    }
  },

  "JEE Advanced": {
    "2023": {
      Physics: [
        { q: "State work-energy theorem.", s: "Net work done equals change in kinetic energy." }
      ],
      Chemistry: [
        { q: "What is hybridization in CH4?", s: "sp3" }
      ],
      Maths: [
        { q: "If f(x)=x^3, find f'(x).", s: "f'(x)=3x^2" }
      ]
    },
    "2022": {
      Physics: [
        { q: "In SHM, what is relation between acceleration and displacement?", s: "a = −ω²x" }
      ],
      Chemistry: [
        { q: "What is pH of neutral water at 25°C?", s: "pH = 7" }
      ],
      Maths: [
        { q: "Derivative of sinx?", s: "cosx" }
      ]
    },
    "2021": {
      Physics: [
        { q: "What is dimensional formula of angular momentum?", s: "ML²T⁻¹" }
      ],
      Chemistry: [
        { q: "Define standard electrode potential.", s: "Potential of electrode under standard conditions." }
      ],
      Maths: [
        { q: "Integrate ∫ x dx", s: "x²/2 + C" }
      ]
    }
  }
};

let currentSubject = "Physics";

function render() {
  const exam = document.getElementById("examSelect").value;
  const year = document.getElementById("yearSelect").value;

  const box = document.getElementById("questions");
  const items = (data[exam] && data[exam][year] && data[exam][year][currentSubject]) ? data[exam][year][currentSubject] : [];

  let html = `<h3>${currentSubject} PYQs (${exam} ${year})</h3>`;

  if (items.length === 0) {
    html += `<p>No questions available yet.</p>`;
    box.innerHTML = html;
    return;
  }

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
  // Buttons
  document.getElementById("btnPhysics").addEventListener("click", () => { currentSubject = "Physics"; render(); });
  document.getElementById("btnChemistry").addEventListener("click", () => { currentSubject = "Chemistry"; render(); });
  document.getElementById("btnMaths").addEventListener("click", () => { currentSubject = "Maths"; render(); });

  // Dropdowns
  document.getElementById("examSelect").addEventListener("change", render);
  document.getElementById("yearSelect").addEventListener("change", render);

  render(); // first load
});
