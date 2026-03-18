const cards = document.querySelectorAll('.interactive-card');

cards.forEach((card) => {
  const updateGlow = (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;

    card.style.setProperty('--pointer-x', `${x}px`);
    card.style.setProperty('--pointer-y', `${y}px`);
  };

  card.addEventListener('mousemove', updateGlow);
  card.addEventListener('mouseenter', () => card.classList.add('is-active'));
  card.addEventListener('mouseleave', () => card.classList.remove('is-active'));
  card.addEventListener('focus', () => card.classList.add('is-active'));
  card.addEventListener('blur', () => card.classList.remove('is-active'));
});
