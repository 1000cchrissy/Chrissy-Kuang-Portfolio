const shoots = [
  { slug: "in-the-blue-montmartre", title: "In the Blue", location: "Montmartre", images: ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"] },
  { slug: "8pm-place-des-vosges", title: "8PM", location: "Place des Vosges", images: ["1.jpg", "2.jpg", "3.jpg", "4.jpg"] },
  { slug: "amelie-montmartre", title: "Amélie", location: "Montmartre", images: ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg"] },
  { slug: "bw-le-marais", title: "B&W", location: "Le Marais", images: ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg"] },
  { slug: "gaze-le-marais", title: "Gaze", location: "Le Marais", images: ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"] },
];

const list = document.getElementById("shoot-list");
const stack = document.getElementById("shoots");
const covers = [];
const mobileQuery = window.matchMedia("(max-width: 768px)");
const preloaded = new Set();

const viewer = document.createElement("div");
viewer.className = "viewer";
viewer.setAttribute("role", "dialog");
viewer.setAttribute("aria-modal", "true");
viewer.setAttribute("aria-hidden", "true");
viewer.inert = true;

const photo = document.createElement("img");
photo.className = "viewer-photo";
photo.alt = "";

const cursor = document.createElement("p");
cursor.className = "viewer-cursor";
cursor.setAttribute("aria-hidden", "true");
cursor.hidden = true;

const closeButton = document.createElement("button");
closeButton.type = "button";
closeButton.className = "viewer-close";
closeButton.textContent = "(close)";

const counter = document.createElement("p");
counter.className = "viewer-count";

viewer.append(photo, cursor, closeButton, counter);
document.body.appendChild(viewer);

let sources = [];
let frame = 0;
let openAlt = "";
let suppressClick = false;
let swipe = null;

function preload(src) {
  if (preloaded.has(src)) return;
  preloaded.add(src);
  const image = new Image();
  image.src = src;
}

function makeImage(src, alt) {
  const img = document.createElement("img");
  img.alt = alt;
  img.decoding = "async";
  img.src = src;
  img.addEventListener("load", syncLines);
  img.addEventListener("error", () => {
    const block = document.createElement("div");
    block.className = "placeholder";
    block.setAttribute("role", "img");
    block.setAttribute("aria-label", alt);
    img.replaceWith(block);
    syncLines();
  });
  return img;
}

shoots.forEach((shoot, index) => {
  const line = document.createElement("p");
  line.className = "shoot-line";
  if (index === 0) line.classList.add("is-in");

  const lineTitle = document.createElement("span");
  lineTitle.className = "shoot-title";
  lineTitle.textContent = shoot.title;
  const lineLocation = document.createElement("span");
  lineLocation.className = "shoot-location";
  lineLocation.textContent = shoot.location;
  line.append(lineTitle, lineLocation);
  list.appendChild(line);

  const article = document.createElement("article");
  article.className = "shoot";
  const alt = `${shoot.title}, ${shoot.location}`;
  const base = `../assets/projects/paris-photography/${shoot.slug}`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "cover";
  button.appendChild(makeImage(`${base}/main.jpg`, alt));
  button.addEventListener("click", () => {
    openViewer([`${base}/main.jpg`, ...shoot.images.map((file) => `${base}/${file}`)], alt);
  });

  const caption = document.createElement("p");
  caption.className = "shoot-caption";
  const captionTitle = document.createElement("span");
  captionTitle.className = "shoot-title";
  captionTitle.textContent = shoot.title;
  const captionLocation = document.createElement("span");
  captionLocation.className = "shoot-location";
  captionLocation.textContent = shoot.location;
  caption.append(captionTitle, captionLocation);

  article.append(button, caption);
  stack.appendChild(article);
  covers.push(button);
});

function renderFrame() {
  const src = sources[frame];
  photo.classList.remove("is-missing");
  photo.classList.add("is-loading");
  photo.alt = openAlt;
  photo.onload = () => {
    if (photo.src.endsWith(src.split("/").pop()) || photo.currentSrc.endsWith(encodeURI(src.split("/").pop()))) {
      photo.classList.remove("is-loading");
    }
  };
  photo.onerror = () => {
    photo.classList.remove("is-loading");
    photo.classList.add("is-missing");
  };
  photo.src = src;
  if (photo.complete && photo.naturalWidth) photo.classList.remove("is-loading");
  counter.textContent = `${frame + 1} / ${sources.length}`;
  const count = sources.length;
  preload(sources[(frame + 1) % count]);
  preload(sources[(frame - 1 + count) % count]);
}

function step(delta) {
  const count = sources.length;
  frame = (frame + delta + count) % count;
  renderFrame();
}

function openViewer(nextSources, alt) {
  sources = nextSources;
  openAlt = alt;
  frame = 0;
  viewer.setAttribute("aria-label", alt);
  viewer.setAttribute("aria-hidden", "false");
  viewer.inert = false;
  viewer.classList.add("is-open");
  document.documentElement.classList.add("is-locked");
  renderFrame();
  closeButton.focus();
}

function closeViewer() {
  if (!viewer.classList.contains("is-open")) return;
  viewer.classList.remove("is-open");
  viewer.setAttribute("aria-hidden", "true");
  viewer.inert = true;
  cursor.hidden = true;
  document.documentElement.classList.remove("is-locked");
}

closeButton.addEventListener("click", (event) => {
  event.stopPropagation();
  closeViewer();
});

viewer.addEventListener("click", (event) => {
  if (event.target === viewer) closeViewer();
});

photo.addEventListener("pointerdown", (event) => {
  swipe = { x: event.clientX, y: event.clientY };
});

photo.addEventListener("pointerup", (event) => {
  if (!swipe) return;
  const dx = event.clientX - swipe.x;
  const dy = event.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) >= 30 && Math.abs(dx) > Math.abs(dy)) {
    suppressClick = true;
    step(dx < 0 ? 1 : -1);
  }
});

photo.addEventListener("pointermove", (event) => {
  if (mobileQuery.matches) return;
  const rect = photo.getBoundingClientRect();
  const onLeft = event.clientX < rect.left + rect.width / 2;
  cursor.textContent = onLeft ? "(<prev)" : "(next>)";
  cursor.hidden = false;
  cursor.style.transform = `translate(${event.clientX + 16}px, ${event.clientY + 16}px)`;
});

photo.addEventListener("pointerleave", () => {
  cursor.hidden = true;
});

photo.addEventListener("click", (event) => {
  event.stopPropagation();
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  const rect = photo.getBoundingClientRect();
  step(event.clientX < rect.left + rect.width / 2 ? -1 : 1);
});

document.addEventListener("keydown", (event) => {
  if (!viewer.classList.contains("is-open")) return;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeViewer();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    step(1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    step(-1);
  }
}, true);

function syncLines() {
  const mid = window.innerHeight / 2;
  const lines = list.querySelectorAll(".shoot-line");
  covers.forEach((cover, index) => {
    if (index === 0) return;
    const rect = cover.getBoundingClientRect();
    const waiting = rect.height < 2 && window.scrollY < 10;
    const reached = !waiting && rect.top <= mid;
    lines[index].classList.toggle("is-in", reached);
  });
}

let ticking = false;
function requestSync() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    syncLines();
    ticking = false;
  });
}

window.addEventListener("scroll", requestSync, { passive: true });
window.addEventListener("resize", requestSync);
syncLines();
