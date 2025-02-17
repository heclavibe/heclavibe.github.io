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
      stopped: false, // New property to track if the particle is stopped
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

    // Update position only if the particle isn't stopped
    if (!p.stopped) {
      p.x += p.dx;
      p.y += p.dy;

      // Bounce off edges
      if (p.x - p.radius < 0 || p.x + p.radius > canvas.width) p.dx *= -1;
      if (p.y - p.radius < 0 || p.y + p.radius > canvas.height) p.dy *= -1;
    }
  });
}

// Check if a particle is touched
canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  particles.forEach((p) => {
    const distance = Math.sqrt((clickX - p.x) ** 2 + (clickY - p.y) ** 2);
    if (distance < p.radius) {
      p.stopped = !p.stopped; // Toggle the stopped state
    }
  });
});

// Resize canvas on window resize
window.addEventListener("resize", () => {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
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

window.addEventListener("resize", () => {
  if (window.innerWidth <= 768) {
      canvas.width = window.innerWidth; // Set canvas width for mobile
      canvas.height = window.innerHeight; // Set canvas height for mobile
      initParticles(); // Reinitialize particles
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const video = document.querySelector(".scroll-video");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          video.play();
        } else {
          video.pause();
        }
      });
    },
    { threshold: 0.5 } // Play when at least 50% of the video is visible
  );

  observer.observe(video);
});
