const SLOT_HOLD_MS = 900;
const SLOT_FADE_MS = 250;
document.documentElement.style.setProperty("--slot-fade", `${SLOT_FADE_MS}ms`);

const projects = window.PROJECTS || [];

function savedProjectIndex() {
  let slug = "";
  try {
    slug = sessionStorage.getItem("lastProject") || "";
  } catch (error) {
    slug = "";
  }
  const index = projects.findIndex((project) => project.slug === slug);
  return index >= 0 ? index : 0;
}

if (history.scrollRestoration) history.scrollRestoration = "manual";

const snap = document.getElementById("snap");
const names = document.getElementById("names");
const count = document.getElementById("count");
const mobileQuery = window.matchMedia("(max-width: 768px)");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (sessionStorage.getItem("page-arrive") === "1") {
  sessionStorage.removeItem("page-arrive");
  if (!reduce) {
    document.body.classList.add("is-arriving");
    window.setTimeout(() => document.body.classList.remove("is-arriving"), 700);
  }
}

const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const cursor = document.createElement("p");
cursor.className = "open-cursor";
cursor.textContent = "(open>)";
cursor.setAttribute("aria-hidden", "true");
document.body.appendChild(cursor);

let cursorX = 0;
let cursorY = 0;
let targetX = 0;
let targetY = 0;
let cursorOn = false;
let cursorSeen = false;
let cursorFrame = 0;

function placeCursor() {
  cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
}

function cursorTick() {
  cursorFrame = 0;
  const dx = targetX - cursorX;
  const dy = targetY - cursorY;
  if (reduce || (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5)) {
    cursorX = targetX;
    cursorY = targetY;
  } else {
    cursorX += dx * 0.2;
    cursorY += dy * 0.2;
  }
  placeCursor();
  if (cursorOn && (Math.abs(targetX - cursorX) > 0.5 || Math.abs(targetY - cursorY) > 0.5)) {
    cursorFrame = requestAnimationFrame(cursorTick);
  }
}

function showCursor(x, y) {
  targetX = x + 12;
  targetY = y + 12;
  if (!cursorSeen) {
    cursorX = targetX;
    cursorY = targetY;
    cursorSeen = true;
    placeCursor();
  }
  cursorOn = true;
  cursor.classList.add("is-on");
  if (!cursorFrame) cursorFrame = requestAnimationFrame(cursorTick);
}

function hideCursor() {
  cursorOn = false;
  cursor.classList.remove("is-on");
}

function cursorAllowed(event) {
  if (!finePointer.matches || mobileQuery.matches) return false;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (target.closest(".site-header, .nav, .index-open")) return false;
  return !!target.closest(".slide");
}

document.addEventListener("pointermove", (event) => {
  if (!cursorAllowed(event)) {
    hideCursor();
    return;
  }
  showCursor(event.clientX, event.clientY);
});
document.documentElement.addEventListener("pointerleave", hideCursor);

let slides = [];
let active = 0;

function fileUrl(project, file) {
  if (!file) return `assets/projects/${project.slug}/main.jpg`;
  if (file.startsWith("assets/")) return file;
  return `assets/projects/${project.slug}/${file}`;
}

function isVideoFile(file) {
  return typeof file === "string" && /\.mp4$/i.test(file);
}

function flatPictures(list) {
  const files = [];
  list.forEach((item) => {
    if (item && typeof item === "object") {
      const group = Array.isArray(item.pairs) ? item.pairs : Array.isArray(item.slideshow) ? item.slideshow : null;
      if (group) {
        group.forEach((file) => {
          if (!isVideoFile(file)) files.push(file);
        });
        return;
      }
      if (typeof item.video === "string") return;
      if (typeof item.file === "string") {
        if (!isVideoFile(item.file)) files.push(item.file);
        return;
      }
    }
    if (!isVideoFile(item)) files.push(item);
  });
  return files;
}

function picturesOf(project) {
  if (project.images && project.images.length) return flatPictures(project.images);
  if (project._pictures && project._pictures.length) return flatPictures(project._pictures);
  return ["main.jpg"];
}

function watch(img, className) {
  img.addEventListener("error", () => {
    const block = document.createElement("div");
    block.className = className;
    img.replaceWith(block);
  });
}

function pad(index) {
  return String(index + 1).padStart(2, "0");
}

count.textContent = pad(savedProjectIndex());

function createStage(urls) {
  const stage = document.createElement("a");
  stage.className = "stage";
  const frames = urls.map((src) => {
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.loading = "eager";
    img.src = src;
    stage.appendChild(img);
    return img;
  });

  let slides = frames;
  let ready = false;
  let index = 0;
  let timer = 0;
  let fallback = 0;
  let generation = 0;
  let running = false;
  let fading = false;
  let remaining = SLOT_HOLD_MS;
  let due = 0;

  const paint = (current) => {
    slides.forEach((img, i) => {
      img.style.transition = "none";
      img.style.opacity = i === current ? "1" : "0";
      img.style.zIndex = i === current ? "1" : "0";
    });
  };

  const finishFade = (gen, prev, next, nextIndex) => {
    if (gen !== generation || !fading) return;
    fading = false;
    prev.style.transition = "none";
    prev.style.opacity = "0";
    prev.style.zIndex = "0";
    next.style.transition = "none";
    next.style.zIndex = "1";
    index = nextIndex;
    remaining = SLOT_HOLD_MS;
    if (running) arm();
  };

  const beginFade = () => {
    if (!running || slides.length < 2) return;
    window.clearTimeout(timer);
    fading = true;
    const gen = ++generation;
    const prev = slides[index];
    const nextIndex = (index + 1) % slides.length;
    const next = slides[nextIndex];
    prev.style.transition = "none";
    prev.style.opacity = "1";
    prev.style.zIndex = "1";
    next.style.zIndex = "2";
    next.style.transition = "none";
    next.style.opacity = "0";
    next.getBoundingClientRect();
    next.style.transition = `opacity ${SLOT_FADE_MS}ms ease`;
    next.style.opacity = "1";
    const onEnd = (event) => {
      if (event.target !== next || event.propertyName !== "opacity") return;
      next.removeEventListener("transitionend", onEnd);
      window.clearTimeout(fallback);
      finishFade(gen, prev, next, nextIndex);
    };
    next.addEventListener("transitionend", onEnd);
    fallback = window.setTimeout(() => {
      next.removeEventListener("transitionend", onEnd);
      finishFade(gen, prev, next, nextIndex);
    }, SLOT_FADE_MS + 50);
  };

  const arm = () => {
    window.clearTimeout(timer);
    due = performance.now() + remaining;
    timer = window.setTimeout(beginFade, remaining);
  };

  Promise.all(frames.map((img) => img.decode().then(() => img).catch(() => null))).then((decoded) => {
    slides = decoded.filter((img) => img && img.naturalWidth);
    ready = true;
    index = 0;
    if (slides.length) paint(0);
    if (running && slides.length > 1) arm();
  });

  return {
    stage,
    count: urls.length,
    reset() {
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
      generation += 1;
      fading = false;
      index = 0;
      remaining = SLOT_HOLD_MS;
      if (ready) paint(0);
    },
    play() {
      if (running || reduce || document.hidden) return;
      running = true;
      if (ready && !fading && slides.length > 1) arm();
    },
    pause() {
      if (!running) return;
      running = false;
      if (fading) return;
      window.clearTimeout(timer);
      remaining = Math.max(0, due - performance.now());
    },
  };
}

let activeStage = null;
function restartCycle() {
  if (activeStage) activeStage.pause();
  activeStage = null;
  const slide = slides[active];
  if (!slide || !slide.stage) return;
  slide.stage.reset();
  if (reduce || slide.stage.count < 2) return;
  slide.stage.play();
  activeStage = slide.stage;
}

function setActive(index) {
  if (index === active && slides[index] && slides[index].classList.contains("is-active")) return;
  active = index;
  slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
  count.textContent = pad(index);
  restartCycle();
}

function renderMobile() {
  snap.replaceChildren();
  names.replaceChildren();
  slides = [];
  projects.forEach((project, index) => {
    const section = document.createElement("section");
    section.className = "mobile-project";
    section.dataset.slug = project.slug;

    const link = document.createElement("a");
    link.className = "mobile-open";
    link.href = `projects/${project.slug}.html`;
    link.dataset.slug = project.slug;

    const top = document.createElement("div");
    top.className = "mobile-top";

    const meta = document.createElement("div");
    meta.className = "mobile-meta";

    const row = document.createElement("div");
    row.className = "mobile-project-row";

    const name = document.createElement("span");
    name.className = "mobile-project-name";
    name.textContent = project.displayName || project.name;

    const number = document.createElement("span");
    number.className = "mobile-project-no";
    number.textContent = pad(index);

    const labels = document.createElement("p");
    labels.className = "mobile-labels";
    labels.textContent = (project.labels || []).map((label) => `(${label})`).join(" ");

    const photo = document.createElement("img");
    photo.className = "mobile-cover";
    photo.alt = "";
    photo.decoding = "async";
    if (index > 0) photo.loading = "lazy";
    photo.src = fileUrl(project, window.projectCover(project));
    watch(photo, "fallback");

    row.append(name, number);
    meta.append(row, labels);
    top.append(meta);
    link.append(top, photo);
    section.appendChild(link);
    snap.appendChild(section);
  });
}

function renderList() {
  snap.replaceChildren();
  names.replaceChildren();
  slides = [];
  projects.forEach((project) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `projects/${project.slug}.html`;
    link.textContent = project.name;
    item.appendChild(link);
    names.appendChild(item);
  });
}

function renderSlides(start) {
  const initial = start >= 0 && start < projects.length ? start : 0;
  names.replaceChildren();
  snap.replaceChildren();
  slides = projects.map((project, index) => {
    const files = picturesOf(project);
    const href = `projects/${project.slug}.html`;
    const section = document.createElement("section");
    section.className = "slide";
    section.dataset.slug = project.slug;
    if (index === initial) section.classList.add("is-active");

    const copy = document.createElement("div");
    copy.className = "copy";

    const name = document.createElement("p");
    name.className = "display-name";
    name.textContent = project.displayName || project.name;

    const stage = createStage(files.map((file) => fileUrl(project, file)));
    stage.stage.href = href;
    stage.stage.setAttribute("aria-label", project.displayName || project.name);
    section.stage = stage;

    const labels = document.createElement("p");
    labels.className = "labels";
    labels.textContent = (project.labels || []).map((label) => `(${label})`).join(" ");

    copy.append(name, stage.stage, labels);

    const cover = document.createElement("a");
    cover.className = "cover-link";
    cover.dataset.slug = project.slug;
    cover.href = href;
    const photo = document.createElement("img");
    photo.alt = project.displayName || project.name;
    photo.decoding = "async";
    if (index !== initial) photo.loading = "lazy";
    photo.src = fileUrl(project, window.projectCover(project));
    watch(photo, "fallback");
    cover.appendChild(photo);

    section.append(copy, cover);
    snap.appendChild(section);
    return section;
  });
  active = -1;
  setActive(initial);
  const current = slides[initial];
  if (current) window.scrollTo({ top: current.offsetTop, behavior: "auto" });
  if (renderSlides.observer) renderSlides.observer.disconnect();
  renderSlides.observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    setActive(slides.indexOf(visible.target));
  }, { threshold: [0.6] });
  slides.forEach((slide) => renderSlides.observer.observe(slide));
}

function nearest() {
  const mid = window.innerHeight / 2;
  let best = 0;
  let bestDist = Infinity;
  slides.forEach((slide, index) => {
    const rect = slide.getBoundingClientRect();
    const dist = Math.abs(rect.top + rect.height / 2 - mid);
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  });
  setActive(best);
}

let ticking = false;
function requestNearest() {
  if (!slides.length || ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    nearest();
    ticking = false;
  });
}

function go(index) {
  if (!slides.length) return;
  const next = Math.max(0, Math.min(slides.length - 1, index));
  setActive(next);
  window.scrollTo({ top: slides[next].offsetTop, behavior: "auto" });
}

function replaceStage(slide, project) {
  const files = picturesOf(project);
  if (!slide.stage || slide.stage.count === files.length) return;
  const href = `projects/${project.slug}.html`;
  const stage = createStage(files.map((file) => fileUrl(project, file)));
  stage.stage.href = href;
  stage.stage.setAttribute("aria-label", project.displayName || project.name);
  slide.stage.stage.replaceWith(stage.stage);
  slide.stage = stage;
  if (slides[active] === slide) restartCycle();
}

// scrollIntoView respects the CSS scroll-padding, so the peek of the
// previous project stays visible when coming back to the page
function showMobileSection(section) {
  if (section) section.scrollIntoView({ block: "start", behavior: "auto" });
}

function render() {
  const start = slides.length ? active : savedProjectIndex();
  if (activeStage) activeStage.pause();
  activeStage = null;
  hideCursor();
  if (mobileQuery.matches) {
    renderMobile();
    const section = snap.children[savedProjectIndex()];
    showMobileSection(section);
    return;
  }
  renderSlides(start);
  projects.forEach((project) => {
    if (project.images && project.images.length) return;
    window.projectPictures(project, () => {
      const slide = slides.find((item) => item.dataset.slug === project.slug);
      if (slide) replaceStage(slide, project);
    });
  });
}

window.addEventListener("scroll", requestNearest, { passive: true });
window.addEventListener("keydown", (event) => {
  if (mobileQuery.matches || !slides.length) return;
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  go(active + (event.key === "ArrowDown" ? 1 : -1));
});
mobileQuery.addEventListener("change", render);
document.addEventListener("visibilitychange", () => {
  if (!activeStage) return;
  if (document.hidden) activeStage.pause();
  else activeStage.play();
});
render();

window.addEventListener("pageshow", (event) => {
  if (mobileQuery.matches) {
    const section = snap.children[savedProjectIndex()];
    showMobileSection(section);
    return;
  }
  if (!event.persisted || !slides.length) return;
  const index = savedProjectIndex();
  const slide = slides[index];
  if (!slide) return;
  setActive(index);
  window.scrollTo({ top: slide.offsetTop, behavior: "auto" });
});

window.addEventListener("load", () => {
  if (mobileQuery.matches) {
    const section = snap.children[savedProjectIndex()];
    showMobileSection(section);
    return;
  }
  if (!slides.length) return;
  const slide = slides[active];
  if (!slide) return;
  const top = slide.offsetTop;
  if (Math.abs(window.scrollY - top) > 1) window.scrollTo({ top, behavior: "auto" });
});

function projectSlug(url) {
  const match = url.pathname.match(/\/projects\/([^/]+)\.html$/);
  return match ? decodeURIComponent(match[1]) : "";
}

window.addEventListener("pageswap", (event) => {
  if (!event.viewTransition) return;
  const entry = event.activation && event.activation.entry;
  if (!entry) return;
  let url;
  try {
    url = new URL(entry.url, location.href);
  } catch (error) {
    return;
  }
  const slug = projectSlug(url);
  document.querySelectorAll(".cover-link img, .cover-link .fallback, .mobile-cover").forEach((el) => {
    el.style.viewTransitionName = "none";
  });
  if (!slug) return;
  const link = document.querySelector(`.cover-link[data-slug="${CSS.escape(slug)}"]`);
  const target = (link && (link.querySelector("img") || link.querySelector(".fallback")))
    || document.querySelector(`.mobile-project a[data-slug="${CSS.escape(slug)}"] .mobile-cover, .mobile-project a[data-slug="${CSS.escape(slug)}"] .fallback`);
  if (target) target.style.viewTransitionName = "project-cover";
});

function fadeAndGo(href) {
  sessionStorage.setItem("page-fade", "1");
  document.documentElement.classList.add("is-fade-out");
  window.setTimeout(() => {
    location.href = href;
  }, 200);
}

function leaveToProject(href) {
  if (document.body.classList.contains("is-leaving")) return;
  hideCursor();
  if (activeStage) activeStage.pause();
  activeStage = null;
  if (reduce) {
    fadeAndGo(href);
    return;
  }
  document.body.classList.add("is-leaving");
  window.setTimeout(() => {
    if ("PageRevealEvent" in window) location.href = href;
    else fadeAndGo(href);
  }, 350);
}

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (mobileQuery.matches) {
    const link = event.target.closest("a.mobile-open");
    if (!link) return;
    let mobileUrl;
    try {
      mobileUrl = new URL(link.href, location.href);
    } catch (error) {
      return;
    }
    if (!projectSlug(mobileUrl) || mobileUrl.origin !== location.origin) return;
    event.preventDefault();
    leaveToProject(link.href);
    return;
  }
  const link = event.target.closest("a.stage, a.cover-link");
  if (!link) return;
  let url;
  try {
    url = new URL(link.href, location.href);
  } catch (error) {
    return;
  }
  if (!projectSlug(url) || url.origin !== location.origin) return;
  event.preventDefault();
  leaveToProject(link.href);
});

window.addEventListener("pagereveal", (event) => {
  if (!event.viewTransition) return;
  const slug = sessionStorage.getItem("arrive-slug");
  sessionStorage.removeItem("arrive-slug");
  if (!slug) return;
  const link = document.querySelector(`.cover-link[data-slug="${CSS.escape(slug)}"]`);
  const target = (link && (link.querySelector("img") || link.querySelector(".fallback")))
    || document.querySelector(`.mobile-project a[data-slug="${CSS.escape(slug)}"] .mobile-cover, .mobile-project a[data-slug="${CSS.escape(slug)}"] .fallback`);
  if (!target) return;
  target.style.viewTransitionName = "project-cover";
  event.viewTransition.finished.finally(() => {
    target.style.viewTransitionName = "none";
  });
});
