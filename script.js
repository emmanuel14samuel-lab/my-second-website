'use strict';
// SETTINGS: change the international WhatsApp number here only (no + or spaces).
const WHATSAPP_NUMBER = '2348034507313';
const SLIDE_DURATION = 6000; // Milliseconds per destination.
const DEFAULT_MESSAGE = "Hello Tolkabis, I'd like to make an enquiry.";
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const whatsappUrl = message => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
// A single runtime data attribute exposes the same setting without duplicating it.
document.body.dataset.whatsappNumber = WHATSAPP_NUMBER;
document.querySelectorAll('[data-whatsapp]').forEach(link => { link.href = whatsappUrl(DEFAULT_MESSAGE); });
document.getElementById('year').textContent = new Date().getFullYear();
// Keep the designed fallback surfaces when image files have not been supplied yet.
document.querySelectorAll('img').forEach(image => {
  const markMissing = () => image.classList.add('image-missing');
  image.addEventListener('error', markMissing);
  image.addEventListener('load', () => image.classList.remove('image-missing'));
  if (image.complete && !image.naturalWidth) markMissing();
});
// Mobile navigation: link, outside click, Escape and breakpoint dismissal.
const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
function closeMenu(restoreFocus = false) {
  mobileMenu.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open menu');
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const opening = mobileMenu.hidden;
  mobileMenu.hidden = !opening;
  menuButton.setAttribute('aria-expanded', String(opening));
  menuButton.setAttribute('aria-label', opening ? 'Close menu' : 'Open menu');
});
mobileMenu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('click', event => { if (!header.contains(event.target)) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileMenu.hidden) closeMenu(true); });
window.matchMedia('(min-width: 769px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
// Header, scroll spy and transform-only hero parallax share one animation frame.
const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('.desktop-nav a, .mobile-menu a')];
const heroImage = document.querySelector('.hero-image');
const hero = document.querySelector('.hero');
let scrollQueued = false;
function updateScroll() {
  header.classList.toggle('scrolled', window.scrollY > 30);
  let active = 'home';
  sections.forEach(section => { if (section.getBoundingClientRect().top <= 180) active = section.id; });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 5) active = 'contact';
  navLinks.forEach(link => {
    const selected = link.hash === `#${active}`;
    link.classList.toggle('active', selected);
    if (selected) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
  });
  heroImage.style.transform = !motionPreference.matches ? `translateY(${Math.min(window.scrollY, hero.offsetHeight) * .12}px)` : '';
  scrollQueued = false;
}
window.addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); } }, { passive: true });
updateScroll();
document.getElementById('back-to-top').addEventListener('click', () => { window.scrollTo({ top: 0, behavior: motionPreference.matches ? 'instant' : 'smooth' }); });
// Reveal once; content stays visible when JS or IntersectionObserver is unavailable.
const reveals = [...document.querySelectorAll('.reveal')];
let revealObserver;
if ('IntersectionObserver' in window && !motionPreference.matches) {
  revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.remove('is-pending'); revealObserver.unobserve(entry.target); }
  }), { threshold: .08 });
  reveals.forEach((item, index) => { item.classList.add('is-pending', `stagger-${index % 4}`); revealObserver.observe(item); });
}
// Counters: suffixes remain stable and all values share a baseline.
const counters = [...document.querySelectorAll('[data-count]')];
const counterFrames = new Map();
function finishCounters() {
  counterFrames.forEach(frame => cancelAnimationFrame(frame));
  counterFrames.clear();
  counters.forEach(counter => { counter.textContent = counter.dataset.count + counter.dataset.suffix; });
}
function countUp(element) {
  const target = Number(element.dataset.count);
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / 1400, 1);
    element.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))) + element.dataset.suffix;
    if (progress < 1 && !motionPreference.matches) counterFrames.set(element, requestAnimationFrame(tick));
    else { element.textContent = target + element.dataset.suffix; counterFrames.delete(element); }
  }
  counterFrames.set(element, requestAnimationFrame(tick));
}
let countObserver;
if ('IntersectionObserver' in window && !motionPreference.matches) {
  countObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { countUp(entry.target); countObserver.unobserve(entry.target); }
  }), { threshold: .8 });
  counters.forEach(counter => countObserver.observe(counter));
}
// Service and city links fill the relevant fields before native anchor scrolling.
const form = document.getElementById('enquiry-form');
document.querySelectorAll('[data-service], [data-destination]').forEach(link => link.addEventListener('click', () => {
  const name = link.dataset.service ? 'service' : 'destination';
  const field = form.elements[name];
  field.value = link.dataset.service || link.dataset.destination;
  clearError(field);
}));
// Accessible, pausable destination carousel: keyboard, swipe, progress and preloading.
const panel = document.querySelector('.showcase');
const slides = [...panel.querySelectorAll('.slide')];
const bars = [...panel.querySelectorAll('.progress')];
const pauseButton = panel.querySelector('.pause-slider');
const status = document.getElementById('slide-status');
let current = 0;
let elapsed = 0;
let lastFrame = 0;
let sliderFrame = 0;
let hovered = false;
let focusWithin = false;
let userPaused = false;
let touchStart = null;
let barAnimation;
function paused() { return motionPreference.matches || document.hidden || hovered || focusWithin || userPaused; }
function progressAnimation() {
  if (barAnimation) barAnimation.cancel();
  if (!motionPreference.matches && bars[current].firstElementChild.animate) {
    barAnimation = bars[current].firstElementChild.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: SLIDE_DURATION, fill: 'forwards', easing: 'linear' });
    barAnimation.pause();
    barAnimation.currentTime = elapsed;
  }
}
function preloadNext() {
  const nextImage = slides[(current + 1) % slides.length].querySelector('img');
  nextImage.loading = 'eager';
}
function showSlide(index, announce = true) {
  current = (index + slides.length) % slides.length;
  elapsed = 0;
  lastFrame = 0;
  slides.forEach((slide, position) => {
    const active = position === current;
    slide.classList.toggle('active', active);
    slide.setAttribute('aria-hidden', String(!active));
    slide.querySelector('a').tabIndex = active ? 0 : -1;
    bars[position].classList.toggle('active', active);
    bars[position].setAttribute('aria-pressed', String(active));
  });
  if (announce) status.textContent = slides[current].getAttribute('aria-label');
  progressAnimation();
  preloadNext();
  restartClock();
}
function animateSlider(now) {
  sliderFrame = 0;
  if (paused()) { lastFrame = 0; return; }
  if (lastFrame) elapsed += now - lastFrame;
  lastFrame = now;
  if (elapsed >= SLIDE_DURATION) { showSlide(current + 1); return; }
  if (barAnimation) barAnimation.currentTime = elapsed;
  sliderFrame = requestAnimationFrame(animateSlider);
}
function restartClock() {
  cancelAnimationFrame(sliderFrame);
  sliderFrame = 0;
  lastFrame = 0;
  if (!paused()) sliderFrame = requestAnimationFrame(animateSlider);
}
document.getElementById('previous-slide').addEventListener('click', () => showSlide(current - 1));
document.getElementById('next-slide').addEventListener('click', () => showSlide(current + 1));
bars.forEach((bar, index) => bar.addEventListener('click', () => showSlide(index)));
panel.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = true; restartClock(); } });
panel.addEventListener('pointerleave', () => { hovered = false; restartClock(); });
panel.addEventListener('focusin', () => { focusWithin = true; restartClock(); });
panel.addEventListener('focusout', event => { focusWithin = panel.contains(event.relatedTarget); restartClock(); });
panel.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); showSlide(current + (event.key === 'ArrowRight' ? 1 : -1)); }
});
panel.addEventListener('touchstart', event => { touchStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }; }, { passive: true });
panel.addEventListener('touchend', event => {
  if (!touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) showSlide(current + (dx < 0 ? 1 : -1));
  touchStart = null;
}, { passive: true });
pauseButton.addEventListener('click', () => {
  userPaused = !userPaused;
  pauseButton.textContent = userPaused ? 'Play' : 'Pause';
  pauseButton.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
  pauseButton.setAttribute('aria-pressed', String(userPaused));
  restartClock();
});
document.addEventListener('visibilitychange', restartClock);
motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) {
    if (revealObserver) revealObserver.disconnect();
    if (countObserver) countObserver.disconnect();
    reveals.forEach(item => item.classList.remove('is-pending'));
    finishCounters();
  }
  pauseButton.hidden = motionPreference.matches;
  progressAnimation();
  restartClock();
  updateScroll();
});
pauseButton.hidden = motionPreference.matches;
showSlide(0, false);
// Form validation is local. Submission opens a WhatsApp draft; it never sends automatically.
const dateField = form.elements.date;
const today = new Date();
const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
dateField.min = localDate;
function clearError(field) {
  field.removeAttribute('aria-invalid');
  document.getElementById(`${field.name}-error`).textContent = '';
}
function validate(field) {
  const value = field.value.trim();
  let error = '';
  if (!value) error = { name: 'Please enter your full name.', phone: 'Please enter a phone number.', destination: 'Where would you like to travel?', date: 'Please choose your travel date.', service: 'Please choose a service.' }[field.name];
  else if (field.name === 'phone' && (!/^[+\d\s().-]+$/.test(value) || value.replace(/\D/g, '').length < 7 || value.replace(/\D/g, '').length > 15)) error = 'Please enter a valid phone number, including your country code if needed.';
  else if (field.name === 'date' && value < localDate) error = 'Please choose today or a future travel date.';
  clearError(field);
  if (error) { field.setAttribute('aria-invalid', 'true'); document.getElementById(`${field.name}-error`).textContent = error; }
  return !error;
}
const fields = [...form.querySelectorAll('input, select')];
fields.forEach(field => {
  field.addEventListener('input', () => { if (field.hasAttribute('aria-invalid')) validate(field); });
  field.addEventListener('change', () => { if (field.hasAttribute('aria-invalid')) validate(field); });
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const results = fields.map(validate);
  const note = document.getElementById('form-status');
  note.replaceChildren();
  if (results.includes(false)) { fields[results.indexOf(false)].focus(); return; }
  const data = new FormData(form);
  const message = `Hello Tolkabis, I'd like to plan a trip.\n\nFull name: ${data.get('name').trim()}\nPhone number: ${data.get('phone').trim()}\nDestination: ${data.get('destination').trim()}\nTravel date: ${data.get('date')}\nService: ${data.get('service')}`;
  const url = whatsappUrl(message);
  window.open(url, '_blank', 'noopener');
  note.append('Your enquiry is ready. Review it and tap Send in WhatsApp. ');
  const fallback = document.createElement('a');
  fallback.href = url; fallback.target = '_blank'; fallback.rel = 'noopener'; fallback.textContent = 'Open WhatsApp if it did not open.';
  note.append(fallback);
});
