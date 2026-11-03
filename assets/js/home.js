/*
  File role: Homepage-only behavior: fills copy from INSPIRE_HOME_CONTENT, the
  animated hero logo, and the INSPIRE letter / word-flip intro.
  Project relation: Loaded by index.html and nl/index.html. Kept in a file
  rather than inline so the Content-Security-Policy can forbid inline scripts.
*/

function getHomeContentValue(path) {
  return path.split('.').reduce((value, key) => {
    if (value && Object.prototype.hasOwnProperty.call(value, key)) {
      return value[key];
    }

    return null;
  }, window.INSPIRE_HOME_CONTENT || {});
}

function applyHomeContent() {
  document.querySelectorAll('[data-copy]').forEach((element) => {
    const value = getHomeContentValue(element.dataset.copy);
    if (typeof value === 'string') {
      element.textContent = value;
    }
  });

  document.querySelectorAll('[data-copy-html]').forEach((element) => {
    const value = getHomeContentValue(element.dataset.copyHtml);
    if (typeof value === 'string') {
      element.innerHTML = value;
    }
  });
}

function initHeroLogo() {
  const stage = document.getElementById('heroLogoStage');
  const canvas = document.getElementById('heroLogoCanvas');

  if (!stage || !canvas) {
    return;
  }

  const ctx = canvas.getContext('2d');
  const angles = [0, 51.4, 85.7, 128.6, 180, 231.4, 308.6];
  const color = '#1B2C45';
  const deviceScale = () => window.devicePixelRatio || 1;
  const rgb = {
    r: parseInt(color.slice(1, 3), 16),
    g: parseInt(color.slice(3, 5), 16),
    b: parseInt(color.slice(5, 7), 16)
  };
  let particles = [];
  let raf = null;
  let isRunning = false;
  let stopTimer = null;

  function resizeHeroCanvas() {
    const rect = stage.getBoundingClientRect();
    const scale = deviceScale();
    canvas.width = Math.max(1, Math.round(rect.width * scale));
    canvas.height = Math.max(1, Math.round(rect.height * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function emitParticles() {
    const rect = stage.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    angles.forEach((degrees) => {
      const radians = (degrees - 90) * Math.PI / 180;
      const burstCount = Math.floor(Math.random() * 3) + 3;

      for (let index = 0; index < burstCount; index += 1) {
        const spread = radians + (Math.random() - 0.5) * 0.42;
        const speed = 1.2 + Math.random() * 2.4;
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(spread) * speed,
          vy: Math.sin(spread) * speed,
          life: 1,
          decay: 0.032 + Math.random() * 0.024,
          size: 1 + Math.random() * 2.1,
          trail: []
        });
      }
    });
  }

  function tickParticles() {
    const scale = deviceScale();
    const width = canvas.width / scale;
    const height = canvas.height / scale;
    ctx.clearRect(0, 0, width, height);
    particles = particles.filter((particle) => particle.life > 0);

    particles.forEach((particle) => {
      particle.trail.push({ x: particle.x, y: particle.y });
      if (particle.trail.length > 6) {
        particle.trail.shift();
      }

      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.94;
      particle.vy *= 0.94;
      particle.life -= particle.decay;

      if (particle.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
        particle.trail.slice(1).forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${particle.life * 0.2})`;
        ctx.lineWidth = particle.size * 0.48;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${particle.life * 0.82})`;
      ctx.fill();
    });

    if (particles.length > 0) {
      raf = window.requestAnimationFrame(tickParticles);
    } else {
      isRunning = false;
      raf = null;
    }
  }

  function fireParticles() {
    window.clearTimeout(stopTimer);
    resizeHeroCanvas();
    emitParticles();

    if (!isRunning) {
      isRunning = true;
      tickParticles();
    }
  }

  function stopParticles() {
    window.clearTimeout(stopTimer);
    stopTimer = window.setTimeout(() => {
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
      particles = [];
      resizeHeroCanvas();
      ctx.clearRect(0, 0, canvas.width / deviceScale(), canvas.height / deviceScale());
      isRunning = false;
      raf = null;
    }, 800);
  }

  stage.addEventListener('mouseenter', fireParticles);
  stage.addEventListener('mouseleave', stopParticles);
  stage.addEventListener('click', fireParticles);
  stage.addEventListener('focus', fireParticles);
  stage.addEventListener('blur', stopParticles);
  window.addEventListener('resize', resizeHeroCanvas);

  resizeHeroCanvas();
}

function initIndexPage() {
  applyHomeContent();
  initHeroLogo();

  const letters = document.querySelectorAll('#ihInspire .ih-letter');
  const wordflipWrap = document.getElementById('ihWordflipWrap');
  const flipword = document.getElementById('ihFlipword');
  // Per-language words live in components/home-content(.nl).js.
  const wordplayWords = getHomeContentValue('hero.wordplayWords') || ['leaders.', 'creators.', 'builders.', 'thinkers.', 'founders.', 'teachers.', 'you.'];
  let wordplayIndex = 0;

  letters.forEach((el, i) => {
    el.style.opacity = '0';
    const verticalOffset = i % 2 === 0 ? -88 : 74;
    const rotationOffset = i % 2 === 0 ? -7 : 6;
    el.style.transform = `translateY(${verticalOffset}px) rotate(${rotationOffset}deg) scale(0.94)`;
    el.style.transition = 'transform 0.84s cubic-bezier(0.22,1,0.36,1), color 0.3s, opacity 0.5s';

    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      if (i === letters.length - 1 && wordflipWrap && flipword) {
        setTimeout(() => {
          wordflipWrap.style.opacity = '1';
          startWordplayFlip();
        }, 620);
      }
    }, 260 + i * 140);
  });

  function startWordplayFlip() {
    if (!flipword || flipword.dataset.flipReady === 'true') {
      return;
    }

    flipword.dataset.flipReady = 'true';

    window.setInterval(() => {
      flipword.style.transition = 'transform 0.3s cubic-bezier(.4,0,.2,1), opacity 0.3s';
      flipword.style.transform = 'translateY(-110%)';
      flipword.style.opacity = '0';

      window.setTimeout(() => {
        wordplayIndex = (wordplayIndex + 1) % wordplayWords.length;
        flipword.textContent = wordplayWords[wordplayIndex];
        flipword.style.transition = 'none';
        flipword.style.transform = 'translateY(110%)';

        window.setTimeout(() => {
          flipword.style.transition = 'transform 0.38s cubic-bezier(.34,1.2,.64,1), opacity 0.38s';
          flipword.style.transform = 'translateY(0)';
          flipword.style.opacity = '0.6';
        }, 20);
      }, 310);
    }, 2600);
  }

  document.querySelectorAll('.ih-sr').forEach((el) => {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('ih-in');
      }
    }, { threshold: 0.08 }).observe(el);
  });

  document.querySelectorAll('.ih-sr6').forEach((el) => {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('ih-in');
      }
    }, { threshold: 0.08 }).observe(el);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIndexPage, { once: true });
} else {
  initIndexPage();
}

const sandboxSpotlight = document.getElementById('sandboxSpotlight');
if (sandboxSpotlight) {
  let spotlightX = window.innerWidth * 0.5;
  let spotlightY = window.innerHeight * 0.24;

  const moveSpotlight = (x, y) => {
    spotlightX += (x - spotlightX) * 0.18;
    spotlightY += (y - spotlightY) * 0.18;
    sandboxSpotlight.style.transform = `translate(${spotlightX - 210}px, ${spotlightY - 210}px)`;
  };

  moveSpotlight(spotlightX, spotlightY);

  document.addEventListener('mousemove', (event) => {
    moveSpotlight(event.clientX, event.clientY);
  });
}

const magneticGrid = document.querySelector('[data-magnetic-grid]');
if (magneticGrid) {
  const magneticCards = magneticGrid.querySelectorAll('.ih-post-card');
  const columns = magneticGrid.querySelectorAll('.ih-latest-column');

  columns.forEach((column) => {
    column.addEventListener('mouseenter', () => {
      magneticGrid.classList.add('is-engaged');
      column.classList.add('is-active');
    });

    column.addEventListener('mouseleave', () => {
      column.classList.remove('is-active');
      if (!magneticGrid.querySelector('.ih-latest-column.is-active')) {
        magneticGrid.classList.remove('is-engaged');
      }
    });
  });

  magneticCards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      const siblings = card.parentElement ? card.parentElement.querySelectorAll('.ih-post-card') : [];
      siblings.forEach((sibling) => {
        if (sibling !== card) sibling.classList.add('is-neighbor');
      });
    });

    card.addEventListener('mouseleave', () => {
      const siblings = card.parentElement ? card.parentElement.querySelectorAll('.ih-post-card') : [];
      siblings.forEach((sibling) => sibling.classList.remove('is-neighbor'));
      card.style.transform = '';
    });

    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const offsetX = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
      const offsetY = ((event.clientY - rect.top) / rect.height - 0.5) * -10;
      card.style.transform = `translateY(-8px) rotateX(${offsetY}deg) rotateY(${offsetX}deg)`;
    });
  });
}
