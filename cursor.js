(function () {
  const dot = document.createElement("div");
  dot.className = "cursor-dot";
  const ring = document.createElement("div");
  ring.className = "cursor-ring";
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let x = 0, y = 0;
  let rx = 0, ry = 0;

  function show() {
    dot.style.opacity = "1";
    ring.style.opacity = "1";
  }

  window.addEventListener("mousemove", (e) => {
    x = e.clientX;
    y = e.clientY;
    show();
    dot.style.left = x + "px";
    dot.style.top = y + "px";
  });

  // Smooth “flow” follow for ring
  function tick() {
    rx += (x - rx) * 0.12;
    ry += (y - ry) * 0.12;
    ring.style.left = rx + "px";
    ring.style.top = ry + "px";
    requestAnimationFrame(tick);
  }
  tick();

  // Make ring “active” on hover on interactive elements
  const selector = "a,button,.btn,.btnOutline,.chip,input,select,textarea";
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(selector)) document.body.classList.add("cursor-active");
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(selector)) document.body.classList.remove("cursor-active");
  });
})();
