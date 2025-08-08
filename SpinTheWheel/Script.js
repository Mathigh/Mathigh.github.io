const wheelCanvas = document.getElementById("wheel");
const ctx = wheelCanvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const result = document.getElementById("result");
const modal = document.getElementById("winnerModal");
const winnerNameEl = document.getElementById("winnerName");
const modalOkBtn = document.getElementById("modalOkBtn");
const resultsModal = document.getElementById("resultsModal");
const resultsList = document.getElementById("resultsList");
const resultsOkBtn = document.getElementById("resultsOkBtn");

let winnersOrder = [];
let modalOpen = false;

// Names
let segments = [
  "Brent Almond", "Carly Atkisson", "Ryan Baker", "Tom Bazemore",
  "Jimmy Brady", "Mary Beth Brown", "Bart Cannon", "Phil Collins",
  "Jacob Denney", "Brian Donald", "Maggie Donlon", "Jennifer Egbe",
  "Bob Girardeau", "John Herndon", "Paul Malek", "Logan Manthey",
  "Owen Mattox", "Stewart McCloud", "Elizabeth McCoy", "Chloe McGuire",
  "Woods Parker", "Caitlin Rittenhouse", "Greg Schuck", "Jennifer Segers",
  "Jim Shaw", "John Isaac Southerland", "Gordon Sproule", "Lorel Stano",
  "Allen Sydnor", "Alan Thomas", "Will Thompson", "Morgan Turner",
  "Lillian Yeager", "Jan Humphries", "Mary Kay Hill", "Darlene Garrison",
  "Jane Wilkinson", "Michele Brantley", "Pam Reynolds", "Kelly NIelsen",
  "Kathy Findley", "Mindy Gandy", "Christina Clements", "Artley Young",
  "Maddie Bryan", "Austin McDowell", "McKenzie Ludvik", "Madeline Freeman",
  "Alyson Burroughs", "Gracie Greer", "Cat Tumlin", "Takera Davis",
  "Kelsey Martin", "Teresa Burton", "Amorice Law", "Kara Lamar",
  "Allison Riihimaa", "Kristina Kelley", "Conni Barber / Michele Brantley / Angela",
  "Ashaunte Bailey", "Sara Edelman"
];

// Monochrome palette
function generateColors(num) {
  // Cohesive deep-navy palette (HSL around hue ~220)
  const cycle = [
    "hsl(220, 45%, 18%)", // deep navy
    "hsl(220, 42%, 22%)",
    "hsl(220, 40%, 26%)",
    "hsl(220, 38%, 30%)"
  ];

  const colors = [];
  for (let i = 0; i < num; i++) {
    colors.push(cycle[i % cycle.length]);
  }
  return colors;
}
let colors = generateColors(segments.length);

// Spin state
let startAngle = 0;
let spinAngle = 0;
let spinTime = 0;
let spinTimeTotal = 0;

// Responsive sizing
let centerX = 0;
let centerY = 0;
let outsideRadius = 0;
let textRadius = 0;
let insideRadius = 0;

// Audio tick setup
let audioCtx = null;
let lastTickIndex = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTick() {
  // Short click using Web Audio
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.value = 1100; // Hz
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.06);
}

// Canvas auto-scale by DPR and viewport
function setupCanvas() {
  const pad = 40; // breathing room
  const minSide = Math.min(window.innerWidth, window.innerHeight) - pad * 2;
  const cssSize = Math.max(420, Math.min(760, minSide)); // clamp to a reasonable range

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  wheelCanvas.style.width = cssSize + "px";
  wheelCanvas.style.height = cssSize + "px";
  wheelCanvas.width = Math.floor(cssSize * dpr);
  wheelCanvas.height = Math.floor(cssSize * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

  centerX = cssSize / 2;
  centerY = cssSize / 2;
  outsideRadius = cssSize * 0.44;
  textRadius = cssSize * 0.355;
  insideRadius = Math.max(32, cssSize * 0.06);

  drawWheel();
}

window.addEventListener("resize", () => {
  setupCanvas();
});

// Draw the wheel
function drawWheel() {
  ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;

  // Dynamic font size
  const fontSize = Math.max(12, Math.min(22, 260 / Math.max(1, segments.length)));
  ctx.font = `${fontSize}px Arial`;

  for (let i = 0; i < segments.length; i++) {
    const angle = startAngle + (i * 2 * Math.PI) / segments.length;
    ctx.fillStyle = colors[i];

    ctx.beginPath();
    ctx.arc(centerX, centerY, outsideRadius, angle, angle + (2 * Math.PI) / segments.length, false);
    ctx.arc(centerX, centerY, insideRadius, angle + (2 * Math.PI) / segments.length, angle, true);
    ctx.stroke();
    ctx.fill();

    ctx.save();
   ctx.fillStyle = "#e9eef7"; // soft white that matches the theme
    ctx.translate(
      centerX + Math.cos(angle + Math.PI / segments.length) * textRadius,
      centerY + Math.sin(angle + Math.PI / segments.length) * textRadius
    );
    ctx.rotate(angle + Math.PI / segments.length);
    const label = segments[i];
    ctx.fillText(label, -ctx.measureText(label).width / 2, 0);
    ctx.restore();
  }
}

// Spin animation
function rotateWheel() {
  spinTime += 30;
  if (spinTime >= spinTimeTotal) {
    stopRotateWheel();
    return;
  }

  const spinAngleChange = easeOut(spinTime, 0, spinAngle, spinTimeTotal);
  startAngle += (spinAngleChange * Math.PI) / 180;

  // Tick when crossing segment under pointer
  const degrees = (startAngle * 180) / Math.PI + 90;
  const arcDeg = 360 / segments.length;
  const currentIndex = Math.floor((360 - (degrees % 360)) / arcDeg);
  if (currentIndex !== lastTickIndex) {
    // Avoid ticks going crazy at very high speeds by throttling a bit
    playTick();
    lastTickIndex = currentIndex;
  }

  drawWheel();
  requestAnimationFrame(rotateWheel);
}

// Stop and choose winner
function stopRotateWheel() {
  const degrees = (startAngle * 180) / Math.PI + 90;
  const arc = 360 / segments.length;
  const index = Math.floor((360 - (degrees % 360)) / arc);
  const winner = segments[index];

  winnersOrder.push(winner);

  setTimeout(() => {
    showWinnerModal(winner);

    // Remove winner and refresh colors
    segments.splice(index, 1);
    colors = generateColors(segments.length);

    if (segments.length === 0) {
      setTimeout(showResultsModal, 1500);
      spinBtn.disabled = true;
    } else {
      startAngle = 0;
      lastTickIndex = null;
      setTimeout(drawWheel, 800);
    }
  }, 800);
}

// Modal controls
function showWinnerModal(name) {
  document.body.classList.add("modal-open");
  modal.style.display = "flex";
  modalOpen = true;

  // Typewriter name
  winnerNameEl.textContent = "";
  let i = 0;
  const typeInterval = setInterval(() => {
    winnerNameEl.textContent += name[i] || "";
    i++;
    if (i >= name.length) clearInterval(typeInterval);
  }, 80);
}

function closeModal() {
  modal.style.display = "none";
  document.body.classList.remove("modal-open");
  modalOpen = false;
}

modalOkBtn.addEventListener("click", closeModal);

// Easing
function easeOut(t, b, c, d) {
  const ts = (t /= d) * t;
  const tc = ts * t;
  return b + c * (tc + -3 * ts + 3 * t);
}

// Input handlers
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (modalOpen) {
      closeModal();
    } else {
      startSpin();
    }
  }
});

spinBtn.addEventListener("click", startSpin);

function startSpin() {
  if (segments.length === 0) return;
  ensureAudio(); // user gesture starts audio context cleanly
  spinAngle = Math.floor(Math.random() * 3000) + 2000;
  spinTime = 0;
  spinTimeTotal = Math.random() * 3000 + 4000;
  lastTickIndex = null;
  rotateWheel();
}

// Final results modal
function showResultsModal() {
  resultsList.innerHTML = "";
  winnersOrder.forEach((name, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${name}`;
    resultsList.appendChild(li);
  });

  resultsModal.style.display = "flex";
  modalOpen = true;
}

function closeResultsModal() {
  resultsModal.style.display = "none";
  modalOpen = false;
}

resultsOkBtn.addEventListener("click", closeResultsModal);

// Initial size + draw
setupCanvas();
