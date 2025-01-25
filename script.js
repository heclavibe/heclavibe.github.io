const canvas = document.getElementById("hero-bg");
const ctx = canvas.getContext("2d");

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

let particles = [];

// Generate random particles
function initParticles() {
  particles = [];
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 50 + 20,
      dx: (Math.random() - 0.5) * 2,
      dy: (Math.random() - 0.5) * 2,
      color: `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})`, // Subtle glow
    });
  }
}

// Draw particles with a soft blur effect
function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw particles
  particles.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 30; // Soft glow effect
    ctx.fill();
    ctx.closePath();

    // Update position
    p.x += p.dx;
    p.y += p.dy;

    // Bounce off edges
    if (p.x - p.radius < 0 || p.x + p.radius > canvas.width) p.dx *= -1;
    if (p.y - p.radius < 0 || p.y + p.radius > canvas.height) p.dy *= -1;
  });

  // Apply fade-out effect with a blur at the bottom
  ctx.save(); // Save current context
  ctx.filter = "blur(15px)"; // Apply blur filter
  const gradient = ctx.createLinearGradient(0, canvas.height - 150, 0, canvas.height);
  gradient.addColorStop(0, "rgba(224, 224, 224, 0.8)");
  gradient.addColorStop(1, "rgba(224, 224, 224, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, canvas.height - 150, canvas.width, 150);
  ctx.restore(); // Restore context to avoid blurring other elements
}

// Resize canvas on window resize
window.addEventListener("resize", () => {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  canvas.width = window.innerWidth;
  initParticles();
});

// Animation loop
function animate() {
  drawParticles();
  requestAnimationFrame(animate);
}

// Initialize
initParticles();
animate();

// Select all menu links
const navLinks = document.querySelectorAll('.nav-links a');

// Add the animation class with a delay for each link
window.addEventListener('load', () => {
  navLinks.forEach((link, index) => {
    setTimeout(() => {
      link.classList.add('animate');
    }, index * 200); // Add delay for each link
  });
});

// Select all text elements inside the menu
const menuText = document.querySelectorAll('.nav-links .text');

// Add the animation class with a delay for each text span
window.addEventListener('load', () => {
  menuText.forEach((text, index) => {
    setTimeout(() => {
      text.classList.add('animate');
    }, index * 200); // Add delay for each menu item
  });
});
