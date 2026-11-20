const BATCHES = [
  { images: ["1.jpg", "2.png", "3.png"], heights: [14.4, 14.4, 10.2] },
  { images: ["4.png", "5.jpg", "6.jpg"], heights: [12.8, 14.2, 11.6] },
  { images: ["7.png", "8.jpg", "9.JPG"], heights: [11, 15.3, 12.8] }
];

// desktop photos are drawn this much taller than the base heights below
const DESKTOP_HEIGHT_SCALE = 1.45;

const EXTENSIONS = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG", "WEBP"];

const stage = document.getElementById("about-stage");
const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileQuery = window.matchMedia("(max-width: 768px)");

function capabilityLabels() {
  const seen = [];
  (window.PROJECTS || []).forEach((project) => {
    (project.labels || []).forEach((label) => {
      if (!seen.includes(label)) seen.push(label);
    });
  });
  return seen;
}

const capabilities = document.getElementById("capabilities");
capabilityLabels().forEach((label) => {
  const line = document.createElement("p");
  line.textContent = label;
  capabilities.appendChild(line);
});

function candidates(file) {
  const stem = file.replace(/\.[^.]+$/, "");
  const listed = file.slice(stem.length + 1);
  const list = [file];
  EXTENSIONS.forEach((ext) => {
    if (ext !== listed) list.push(stem + "." + ext);
  });
  return list;
}

function probe(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve("");
    img.src = src;
  });
}

async function findSrc(file) {
  const options = candidates(file);
  for (let i = 0; i < options.length; i += 1) {
    const src = "assets/about/" + options[i];
    const found = await probe(src);
    if (found) return found;
  }
  console.warn("About image not found: " + file);
  return "";
}

const MOBILE_RATIOS = [
  [1.31, 1.31, 0.93],
  [1.16, 1.29, 1.05],
  [1, 1.39, 1.16]
];

function measureChrome() {
  if (!mobileQuery.matches) {
    document.documentElement.style.removeProperty("--top-h");
    document.documentElement.style.removeProperty("--bar-h");
    return;
  }
  const name = document.querySelector(".about-name");
  const topH = name.getBoundingClientRect().bottom + window.innerWidth * 0.04;
  document.documentElement.style.setProperty("--top-h", topH + "px");
}

const EASE = "cubic-bezier(.65, 0, .35, 1)";

const group = document.createElement("div");
group.className = "about-group";
const slots = [0, 1, 2].map(() => {
  const el = document.createElement("div");
  el.className = "about-slot";
  const images = BATCHES.map(() => {
    const img = document.createElement("img");
    img.className = "about-photo";
    img.alt = "";
    el.appendChild(img);
    return img;
  });
  group.appendChild(el);
  return { el, images, batch: -1, phase: "idle", timer: 0, onEnd: null, token: null };
});
stage.appendChild(group);

function heightFor(batchIndex, slotIndex) {
  if (mobileQuery.matches) {
    const width = slots[slotIndex].el.getBoundingClientRect().width;
    return (width * MOBILE_RATIOS[batchIndex][slotIndex]) + "px";
  }
  return (BATCHES[batchIndex].heights[slotIndex] * DESKTOP_HEIGHT_SCALE) + "vw";
}

function applyHeights() {
  if (!mobileQuery.matches) {
    let max = 0;
    BATCHES.forEach((batch) => {
      batch.heights.forEach((height) => {
        if (height > max) max = height;
      });
    });
    document.documentElement.style.setProperty("--about-bar", (max * DESKTOP_HEIGHT_SCALE) + "vw");
  } else {
    const width = slots[0].el.getBoundingClientRect().width;
    let max = 0;
    MOBILE_RATIOS.forEach((ratios) => {
      ratios.forEach((ratio) => {
        const height = width * ratio;
        if (height > max) max = height;
      });
    });
    document.documentElement.style.setProperty("--bar-h", (max + 12) + "px");
  }
  slots.forEach((slot, slotIndex) => {
    if (slot.phase === "idle" && slot.batch >= 0) {
      slot.el.style.transition = "none";
      slot.el.style.height = heightFor(slot.batch, slotIndex);
    }
  });
  measureChrome();
}

applyHeights();

let targetBatch = -1;
let timers = [];

function endIntro() {
  document.documentElement.classList.remove("is-about-intro", "is-about-play");
}

function showImage(slot, batch) {
  slot.images.forEach((img, index) => {
    img.classList.toggle("is-on", index === batch);
  });
}

function clearArm(slot) {
  if (slot.timer) {
    window.clearTimeout(slot.timer);
    slot.timer = 0;
  }
  if (slot.onEnd) {
    slot.el.removeEventListener("transitionend", slot.onEnd);
    slot.onEnd = null;
  }
}

function arm(slot, slotIndex, ms, phase) {
  clearArm(slot);
  const token = {};
  slot.token = token;
  const done = () => {
    if (slot.token !== token || slot.phase !== phase) return;
    slot.token = null;
    clearArm(slot);
    if (phase === "collapse") afterCollapse(slot, slotIndex);
    else afterGrow(slot, slotIndex);
  };
  slot.onEnd = (event) => {
    if (event.propertyName !== "height") return;
    done();
  };
  slot.el.addEventListener("transitionend", slot.onEnd);
  slot.timer = window.setTimeout(done, ms);
}

function collapse(slot, slotIndex) {
  slot.phase = "collapse";
  slot.el.style.transition = "none";
  slot.el.style.height = heightFor(slot.batch, slotIndex);
  slot.el.offsetHeight;
  slot.el.style.transition = "height 300ms " + EASE;
  slot.el.style.height = "0px";
  arm(slot, slotIndex, 400, "collapse");
}

function grow(slot, slotIndex) {
  slot.phase = "grow";
  slot.el.style.transition = "height 400ms " + EASE;
  slot.el.offsetHeight;
  slot.el.style.height = heightFor(slot.batch, slotIndex);
  arm(slot, slotIndex, 400, "grow");
}

function afterCollapse(slot, slotIndex) {
  showImage(slot, targetBatch);
  slot.batch = targetBatch;
  slot.el.style.transition = "none";
  slot.el.style.height = "0px";
  slot.el.offsetHeight;
  grow(slot, slotIndex);
}

function afterGrow(slot, slotIndex) {
  slot.phase = "idle";
  slot.el.style.transition = "none";
  slot.el.style.height = heightFor(slot.batch, slotIndex);
  if (slot.batch !== targetBatch) kick(slot, slotIndex);
}

function settle(slot, slotIndex, batch) {
  clearArm(slot);
  slot.token = null;
  showImage(slot, batch);
  slot.batch = batch;
  slot.phase = "idle";
  slot.el.style.transition = "none";
  slot.el.style.height = heightFor(batch, slotIndex);
}

function kick(slot, slotIndex) {
  if (slot.phase === "collapse" || slot.phase === "grow" || slot.phase === "wait") return;
  if (slot.batch === targetBatch) return;
  if (reduceQuery.matches) {
    settle(slot, slotIndex, targetBatch);
    return;
  }
  if (slot.batch < 0) {
    showImage(slot, targetBatch);
    slot.batch = targetBatch;
    slot.el.style.transition = "none";
    slot.el.style.height = "0px";
    slot.phase = "wait";
    slot.timer = window.setTimeout(() => {
      slot.timer = 0;
      if (slot.phase !== "wait") return;
      if (slot.batch !== targetBatch) {
        showImage(slot, targetBatch);
        slot.batch = targetBatch;
      }
      grow(slot, slotIndex);
    }, slotIndex * 60);
    return;
  }
  slot.phase = "wait";
  slot.timer = window.setTimeout(() => {
    slot.timer = 0;
    if (slot.phase !== "wait") return;
    if (slot.batch === targetBatch) {
      slot.phase = "idle";
      slot.el.style.transition = "none";
      slot.el.style.height = heightFor(slot.batch, slotIndex);
      return;
    }
    collapse(slot, slotIndex);
  }, slotIndex * 60);
}

function showBatch(index) {
  if (index === targetBatch) return;
  const first = targetBatch < 0;
  targetBatch = index;
  if (!first) endIntro();
  slots.forEach((slot, slotIndex) => kick(slot, slotIndex));
}

const sections = Array.from(document.querySelectorAll(".about-section"));
const seen = new Map();
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const index = Number(entry.target.dataset.batch);
    if (entry.isIntersecting) seen.set(index, entry);
    else seen.delete(index);
  });
  if (!seen.size) return;
  let best = 0;
  let bestHeight = -1;
  seen.forEach((entry, index) => {
    const height = entry.intersectionRect.height;
    if (height > bestHeight) {
      best = index;
      bestHeight = height;
    }
  });
  showBatch(best, true);
}, { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });

Promise.all(slots.map((slot, slotIndex) => Promise.all(BATCHES.map(async (batch, batchIndex) => {
  const file = batch.images[slotIndex];
  const src = await findSrc(file);
  if (!src) return;
  const img = slot.images[batchIndex];
  img.src = src;
  if (img.decode) {
    try {
      await img.decode();
    } catch (error) {
      console.warn("About image not found: " + file);
      img.removeAttribute("src");
    }
  }
})))).then(() => {
  showBatch(0);
  sections.forEach((section) => observer.observe(section));
  if (!reduceQuery.matches) {
    document.documentElement.classList.add("is-about-intro");
    window.requestAnimationFrame(() => {
      document.documentElement.classList.add("is-about-play");
    });
    timers.push(window.setTimeout(endIntro, 1200));
  }
});

// On phones, Safari fires "resize" every time the address bar shows/hides
// while scrolling. Only redo the layout when the width really changes.
let lastWidth = window.innerWidth;
function onResize() {
  if (mobileQuery.matches && window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  applyHeights();
}

window.addEventListener("resize", onResize);
mobileQuery.addEventListener("change", onResize);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(measureChrome);
}
