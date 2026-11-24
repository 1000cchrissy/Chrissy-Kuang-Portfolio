const SLIDE_HOLD_MS = 800;
const SLIDE_FADE_MS = 200;
document.documentElement.style.setProperty("--slide-fade", `${SLIDE_FADE_MS}ms`);

if (!("PageRevealEvent" in window) && sessionStorage.getItem("page-fade") === "1") {
  sessionStorage.removeItem("page-fade");
  const root = document.documentElement;
  root.style.opacity = "0";
  requestAnimationFrame(() => {
    root.style.transition = "opacity 200ms ease";
    root.style.opacity = "1";
  });
}

const motionReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!motionReduce) {
  document.body.classList.add("is-entering");
  window.setTimeout(() => document.body.classList.remove("is-entering"), 1600);
}

const projects = window.PROJECTS || [];
const parts = location.pathname.split("/");
const slug = (parts.pop() || "").replace(/\.html$/, "");
const project = projects.find((item) => item.slug === slug);
if (project) {
  try {
    sessionStorage.setItem("lastProject", project.slug);
  } catch (error) {}
}
const prefix = "../";

const info = document.querySelector(".info");
const frames = document.querySelector(".frames");
const title = document.querySelector(".project-name");

function writeBeatText(el, raw, solid) {
  const value = solid ? raw.replace(/-/g, "\u2011") : raw;
  const splitAt = value.indexOf(": ");
  const lead = splitAt === -1 ? "" : value.slice(0, splitAt + 1);
  const rest = splitAt === -1 ? value : value.slice(splitAt + 1);
  const strong = el.querySelector("strong");
  const text = el.lastChild && el.lastChild.nodeType === Node.TEXT_NODE ? el.lastChild : null;
  if (splitAt === -1) {
    if (strong || !text || text !== el.firstChild || text.data !== rest || el.childNodes.length !== 1) {
      el.replaceChildren(document.createTextNode(rest));
    }
    return;
  }
  if (
    strong &&
    strong === el.firstChild &&
    text &&
    text.data === rest &&
    strong.textContent === lead &&
    el.childNodes.length === 2
  ) return;
  const mark = document.createElement("strong");
  mark.textContent = lead;
  el.replaceChildren(mark, document.createTextNode(rest));
}

function fillBeatText(el, value) {
  el.dataset.raw = value;
  writeBeatText(el, value, false);
}

function makeBeatBlock(block) {
  const node = document.createElement("div");
  node.className = "beat-block";
  const label = document.createElement("h2");
  label.textContent = block.label || "";
  node.appendChild(label);
  if (Array.isArray(block.bullets) && block.bullets.length) {
    const list = document.createElement("ul");
    list.className = "beat-list";
    block.bullets.forEach((item) => {
      const li = document.createElement("li");
      fillBeatText(li, item);
      list.appendChild(li);
    });
    node.appendChild(list);
    return node;
  }
  if (typeof block.text === "string" && block.text) {
    const p = document.createElement("p");
    fillBeatText(p, block.text);
    node.appendChild(p);
  }
  return node;
}

function bindBeats(stack, countEl, mobileCount, prevBtn, nextBtn, total) {
  const beats = [...stack.children];
  const mobileQuery = window.matchMedia("(max-width: 768px)");
  let current = 0;
  let generation = 0;
  let timer = 0;
  let locked = false;
  let lockTimer = 0;

  function inputFocused() {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }

  function writeNavCount(label, animate) {
    if (!mobileCount) return;
    const shown = mobileCount.querySelector(".beat-num:not(.is-out)");
    if (shown && shown.textContent === label && mobileCount.querySelectorAll(".beat-num").length === 1) return;
    if (!animate) {
      mobileCount.replaceChildren();
      const span = document.createElement("span");
      span.className = "beat-num";
      span.textContent = label;
      mobileCount.appendChild(span);
      return;
    }
    const incoming = document.createElement("span");
    incoming.className = "beat-num is-in";
    incoming.textContent = label;
    mobileCount.appendChild(incoming);
    if (shown) shown.classList.add("is-out");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => incoming.classList.remove("is-in"));
    });
    window.setTimeout(() => {
      if (shown && shown.parentNode) shown.remove();
    }, 180);
  }

  function keepWords() {
    const solid = mobileQuery.matches;
    stack.querySelectorAll("p, li").forEach((el) => {
      if (el.classList.contains("beat-highlight")) return;
      if (!el.dataset.raw) el.dataset.raw = el.textContent;
      writeBeatText(el, el.dataset.raw, solid);
    });
  }

  function sizeStack() {
    keepWords();
    let max = 0;
    beats.forEach((beat) => {
      max = Math.max(max, beat.offsetHeight);
    });
    stack.style.height = max ? `${max}px` : "";
  }

  function paintCount(index, animate) {
    const label = `${index + 1}/${total}`;
    countEl.textContent = label;
    writeNavCount(label, Boolean(animate));
    if (prevBtn) {
      const atStart = index <= 0;
      prevBtn.classList.toggle("is-dim", atStart);
      prevBtn.setAttribute("aria-disabled", atStart ? "true" : "false");
    }
    if (nextBtn) {
      const atEnd = index >= total - 1;
      nextBtn.classList.toggle("is-dim", atEnd);
      nextBtn.setAttribute("aria-disabled", atEnd ? "true" : "false");
    }
  }

  function show(index, animate) {
    const motion = animate && !motionReduce && index !== current;
    if (!motion && index === current && beats[index] && beats[index].classList.contains("is-current")) {
      paintCount(index);
      return;
    }
    generation += 1;
    const gen = generation;
    window.clearTimeout(timer);
    const previous = current;
    const changed = index !== current;
    const forward = index > previous;
    current = index;
    paintCount(index, changed);
    beats.forEach((beat, i) => {
      beat.classList.remove("is-current", "is-leaving", "is-entering", "is-from", "is-forward", "is-back");
      if (!motion) {
        if (i === index) beat.classList.add("is-current");
        return;
      }
      if (i === previous) beat.classList.add("is-leaving", forward ? "is-forward" : "is-back");
      if (i === index) beat.classList.add("is-from", forward ? "is-forward" : "is-back");
    });
    if (!motion) return;
    const incoming = beats[index];
    void incoming.offsetWidth;
    incoming.classList.remove("is-from");
    incoming.classList.add("is-entering");
    timer = window.setTimeout(() => {
      if (gen !== generation) return;
      beats.forEach((beat, i) => {
        beat.style.transition = "none";
        beat.classList.remove("is-leaving", "is-entering", "is-from", "is-forward", "is-back");
        beat.classList.toggle("is-current", i === index);
      });
      void stack.offsetWidth;
      beats.forEach((beat) => {
        beat.style.transition = "";
      });
    }, 550);
  }

  function step(delta) {
    if (locked) return;
    const nextIndex = current + delta;
    if (nextIndex < 0 || nextIndex >= total) return;
    locked = true;
    window.clearTimeout(lockTimer);
    lockTimer = window.setTimeout(() => {
      locked = false;
    }, motionReduce ? 150 : 550);
    show(nextIndex, true);
  }

  if (prevBtn) prevBtn.addEventListener("click", () => step(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => step(1));
  let swipe = null;
  stack.addEventListener("pointerdown", (event) => {
    if (!mobileQuery.matches || event.button !== 0 || locked) return;
    swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  stack.addEventListener("pointerup", (event) => {
    if (!swipe || event.pointerId !== swipe.id) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    step(dx < 0 ? 1 : -1);
  });
  stack.addEventListener("pointercancel", () => {
    swipe = null;
  });

  sizeStack();
  show(0, false);
  window.addEventListener("resize", () => {
    sizeStack();
  });
  mobileQuery.addEventListener("change", () => {
    sizeStack();
    show(current, false);
  });
  window.addEventListener("load", sizeStack);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeStack);
  window.addEventListener("keydown", (event) => {
    if (mobileQuery.matches) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (inputFocused()) return;
    event.preventDefault();
    step(event.key === "ArrowRight" ? 1 : -1);
  });
}

function renderBeats(source) {
  const beats = source && Array.isArray(source.beats) ? source.beats.filter((beat) => beat && Array.isArray(beat.blocks) && beat.blocks.length) : [];
  if (!beats.length || !info) return;
  const stage = document.createElement("div");
  stage.className = "beat-stage";
  stage.lang = "en";
  const count = document.createElement("p");
  count.className = "beat-count";
  count.textContent = `1/${beats.length}`;
  const stack = document.createElement("div");
  stack.className = "beat-stack";
  beats.forEach((beat, beatIndex) => {
    const article = document.createElement("article");
    article.className = "beat";
    if (beatIndex === 0) article.classList.add("is-current");
    const highlightText = beatIndex === 0 && source.highlight ? String(source.highlight).trim() : "";
    if (highlightText) {
      const highlight = document.createElement("p");
      highlight.className = "beat-highlight";
      highlight.textContent = highlightText;
      article.appendChild(highlight);
    }
    beat.blocks.forEach((block, blockIndex) => {
      const node = makeBeatBlock(block);
      node.style.setProperty("--beat-delay", `${80 + blockIndex * 70}ms`);
      article.appendChild(node);
    });
    stack.appendChild(article);
  });
  const nav = document.createElement("div");
  nav.className = "beat-nav";
  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "beat-prev";
  prev.setAttribute("aria-label", "Previous");
  prev.textContent = "<prev";
  const mobileCount = document.createElement("span");
  mobileCount.className = "beat-nav-count";
  const countNum = document.createElement("span");
  countNum.className = "beat-num";
  countNum.textContent = `1/${beats.length}`;
  mobileCount.appendChild(countNum);
  const next = document.createElement("button");
  next.type = "button";
  next.className = "beat-next";
  next.setAttribute("aria-label", "Next");
  next.textContent = "next>";
  nav.append(prev, mobileCount, next);
  stage.append(count, stack, nav);
  info.appendChild(stage);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "beat-close";
  close.setAttribute("aria-label", "Close");
  close.textContent = "X";
  info.appendChild(close);
  const reopen = document.createElement("button");
  reopen.type = "button";
  reopen.className = "beat-reopen";
  reopen.setAttribute("aria-label", "Open project text");
  reopen.setAttribute("aria-expanded", "true");
  reopen.textContent = "+";
  document.body.appendChild(reopen);
  let panelToken = 0;
  const finishClose = () => {
    if (info.classList.contains("is-closed") && reopen.classList.contains("is-shown")) return;
    info.classList.remove("is-closing", "is-opening");
    info.classList.add("is-closed");
    reopen.setAttribute("aria-expanded", "false");
    reopen.classList.remove("is-pulse");
    reopen.classList.add("is-shown");
    void reopen.offsetWidth;
    reopen.classList.add("is-pulse");
  };
  const closePanel = () => {
    if (info.classList.contains("is-closed") || info.classList.contains("is-closing")) return;
    const token = ++panelToken;
    reopen.classList.remove("is-shown", "is-pulse");
    info.classList.remove("is-opening");
    info.classList.add("is-closing");
    const onEnd = (event) => {
      if (event.target !== info || event.propertyName !== "clip-path") return;
      if (token !== panelToken) return;
      info.removeEventListener("transitionend", onEnd);
      finishClose();
    };
    info.addEventListener("transitionend", onEnd);
    window.setTimeout(() => {
      if (token !== panelToken) return;
      info.removeEventListener("transitionend", onEnd);
      finishClose();
    }, 600);
  };
  const openPanel = () => {
    if (!info.classList.contains("is-closed") && !info.classList.contains("is-closing")) return;
    const token = ++panelToken;
    reopen.classList.remove("is-shown", "is-pulse");
    info.classList.remove("is-closed");
    info.classList.add("is-opening");
    void info.offsetWidth;
    info.classList.remove("is-closing");
    window.setTimeout(() => {
      if (token !== panelToken) return;
      info.classList.remove("is-opening");
      reopen.setAttribute("aria-expanded", "true");
    }, 450);
  };
  close.addEventListener("click", closePanel);
  reopen.addEventListener("click", openPanel);
  bindBeats(stack, count, mobileCount, prev, next, beats.length);
}

renderBeats(project);

if (title && title.parentNode) {
  const head = document.createElement("div");
  head.className = "project-head";
  const heading = document.createElement("div");
  heading.className = "project-heading";
  title.parentNode.insertBefore(head, title);
  heading.appendChild(title);
  if (project && project.context && String(project.context).trim()) {
    const context = document.createElement("p");
    context.className = "project-context";
    context.textContent = String(project.context).trim();
    heading.appendChild(context);
  }
  head.appendChild(heading);
  if (slug) {
    const link = document.createElement("a");
    link.className = "page-back";
    link.href = "../index.html";
    link.textContent = "BACK";
    link.setAttribute("aria-label", "Back to portfolio");
    head.appendChild(link);
  }
}

if (project) {
  if (project.pageTitle && project.pageTitle.length) {
    title.replaceChildren();
    project.pageTitle.forEach((line, index) => {
      if (index) title.appendChild(document.createElement("br"));
      title.appendChild(document.createTextNode(line));
    });
  } else {
    title.textContent = project.displayName || project.name;
  }
  document.title = project.name;
}

function placeMobileChrome() {
  const root = document.documentElement;
  const head = document.querySelector(".project-head");
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  if (!mobile || !head) {
    root.style.removeProperty("--panel-top");
    root.style.removeProperty("--pictures-offset");
    root.style.removeProperty("--reopen-top");
    return;
  }
  const edge = head.getBoundingClientRect().bottom;
  root.style.setProperty("--panel-top", `${edge}px`);
  root.style.setProperty("--pictures-offset", `${edge}px`);
  root.style.setProperty("--reopen-top", `${edge + 16}px`);
}

placeMobileChrome();
window.addEventListener("resize", placeMobileChrome);
window.addEventListener("orientationchange", placeMobileChrome);
window.addEventListener("load", placeMobileChrome);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeMobileChrome);
if (window.ResizeObserver) {
  const head = document.querySelector(".project-head");
  if (head) new ResizeObserver(placeMobileChrome).observe(head);
}

function fileUrl(file) {
  if (!file || typeof file !== "string") return `${prefix}assets/projects/${slug}/main.jpg`;
  if (file.startsWith("assets/")) return prefix + file;
  if (file.startsWith("../") || file.startsWith("/") || file.startsWith("http")) return file;
  return `${prefix}assets/projects/${slug}/${file}`;
}

const opener = document.querySelector(".index-open");
if (opener) {
  opener.addEventListener("click", () => {
    if (typeof window.openProjectsIndex === "function") window.openProjectsIndex();
  });
}

function sizeToImage(picture, img) {
  const apply = () => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    picture.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
  };
  img.addEventListener("load", apply);
  if (img.complete && img.naturalWidth) apply();
}

function makeCell(src, alt, lazy) {
  const cell = document.createElement("figure");
  cell.className = "cell is-portrait";
  const picture = document.createElement("div");
  picture.className = "picture";
  const img = document.createElement("img");
  img.alt = alt;
  img.decoding = "async";
  if (lazy) img.loading = "lazy";

  const applySize = () => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const landscape = img.naturalWidth > img.naturalHeight;
    cell.classList.toggle("is-landscape", landscape);
    cell.classList.toggle("is-portrait", !landscape);
    picture.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
  };

  img.addEventListener("load", applySize);
  img.addEventListener("error", () => {
    const block = document.createElement("div");
    block.className = "fallback";
    img.replaceWith(block);
    picture.style.aspectRatio = "2 / 3";
    cell.classList.add("is-portrait");
    cell.classList.remove("is-landscape");
  });
  img.src = src;
  if (img.complete && img.naturalWidth) applySize();
  picture.appendChild(img);
  cell.appendChild(picture);
  return cell;
}

function makeVideo(src, alt) {
  const cell = document.createElement("figure");
  cell.className = "cell is-single";
  const picture = document.createElement("div");
  picture.className = "picture";
  const video = document.createElement("video");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.autoplay = !reduce;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("loop", "");
  if (!reduce) video.setAttribute("autoplay", "");
  video.setAttribute("aria-label", alt);
  video.addEventListener("loadedmetadata", () => {
    if (!video.videoWidth || !video.videoHeight) return;
    picture.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
  });
  video.addEventListener("error", () => {
    const block = document.createElement("div");
    block.className = "fallback";
    video.replaceWith(block);
    picture.style.aspectRatio = "2 / 3";
  });
  video.src = src;
  picture.appendChild(video);
  cell.appendChild(picture);
  if (!reduce) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const play = video.play();
          if (play && typeof play.catch === "function") play.catch(() => {});
        } else {
          video.pause();
        }
      });
    });
    observer.observe(picture);
  }
  return cell;
}

function makeSingle(src, alt, lazy) {
  const cell = document.createElement("figure");
  cell.className = "cell is-single";
  const picture = document.createElement("div");
  picture.className = "picture";
  const img = document.createElement("img");
  img.alt = alt;
  img.decoding = "async";
  if (lazy) img.loading = "lazy";
  img.addEventListener("error", () => {
    const block = document.createElement("div");
    block.className = "fallback";
    img.replaceWith(block);
    picture.style.aspectRatio = "2 / 3";
  });
  sizeToImage(picture, img);
  img.src = src;
  picture.appendChild(img);
  cell.appendChild(picture);
  return cell;
}

function makeSlideshow(urls, alt) {
  const cell = document.createElement("figure");
  cell.className = "cell is-single";
  const picture = document.createElement("div");
  picture.className = "picture is-slideshow";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const frames = urls.map((src, index) => {
    const img = document.createElement("img");
    img.className = "frame";
    img.alt = index === 0 ? alt : "";
    img.decoding = "async";
    img.loading = "eager";
    img.src = src;
    picture.appendChild(img);
    return img;
  });

  const hold = SLIDE_HOLD_MS;
  const fade = SLIDE_FADE_MS;
  let slides = [];
  let ready = false;
  let index = 0;
  let timer = 0;
  let fallback = 0;
  let generation = 0;
  let running = false;
  let fading = false;
  let onScreen = false;
  let remaining = hold;
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
    remaining = hold;
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
    next.style.transition = `opacity ${fade}ms ease`;
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
    }, fade + 50);
  };

  const arm = () => {
    window.clearTimeout(timer);
    due = performance.now() + remaining;
    timer = window.setTimeout(beginFade, remaining);
  };

  const start = () => {
    if (running || reduce || !onScreen || document.hidden) return;
    running = true;
    if (ready && !fading) arm();
  };

  const stop = () => {
    if (!running) return;
    running = false;
    if (fading) return;
    window.clearTimeout(timer);
    remaining = Math.max(0, due - performance.now());
  };

  Promise.all(frames.map((img) => img.decode().then(() => img).catch(() => null))).then((decoded) => {
    slides = decoded.filter((img) => img && img.naturalWidth);
    ready = true;
    index = 0;
    if (!slides.length) {
      picture.style.aspectRatio = "2 / 3";
      return;
    }
    sizeToImage(picture, slides[0]);
    paint(0);
    if (running && slides.length > 1) arm();
  });

  if (!reduce && frames.length > 1) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        onScreen = entry.isIntersecting;
        if (onScreen && !document.hidden) start();
        else stop();
      });
    });
    observer.observe(picture);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else if (onScreen) start();
    });
  }

  cell.appendChild(picture);
  return cell;
}

function addPairs(files, alt, caption, eagerFirst) {
  const shoot = document.createElement("section");
  shoot.className = "shoot";
  const grid = document.createElement("div");
  grid.className = "shoot-grid";
  files.forEach((src, index) => {
    grid.appendChild(makeCell(src, alt, !(eagerFirst && index === 0)));
  });
  shoot.appendChild(grid);
  if (caption && typeof caption === "object") {
    const figcaption = document.createElement("figcaption");
    const name = document.createElement("span");
    name.textContent = caption.title;
    const where = document.createElement("span");
    where.className = "where";
    where.textContent = `  ${caption.location}`;
    figcaption.append(name, where);
    shoot.appendChild(figcaption);
  } else if (typeof caption === "string" && caption) {
    addItemCaption(shoot, caption);
  }
  frames.appendChild(shoot);
}

function itemCaption(item) {
  if (!item || typeof item !== "object" || typeof item.caption !== "string") return "";
  return item.caption.trim();
}

function addItemCaption(node, caption) {
  if (!caption) return node;
  const figcaption = document.createElement("figcaption");
  figcaption.className = "item-caption";
  if (caption === "AI-generated video and images for concept presentation") {
    figcaption.classList.add("is-regular");
  }
  figcaption.textContent = caption;
  node.appendChild(figcaption);
  node.classList.add("has-caption");
  return node;
}

function renderItems(items, alt) {
  let first = true;
  items.forEach((item) => {
    const caption = itemCaption(item);
    if (item && typeof item === "object" && Array.isArray(item.pairs)) {
      addPairs(item.pairs.map((name) => fileUrl(name)), alt, caption, first);
    } else if (item && typeof item === "object" && Array.isArray(item.slideshow)) {
      frames.appendChild(addItemCaption(makeSlideshow(item.slideshow.map((name) => fileUrl(name)), alt), caption));
    } else if (item && typeof item === "object" && typeof item.video === "string") {
      frames.appendChild(addItemCaption(makeVideo(fileUrl(item.video), alt), caption));
    } else if (item && typeof item === "object" && typeof item.file === "string") {
      const node = /\.mp4$/i.test(item.file)
        ? makeVideo(fileUrl(item.file), alt)
        : makeSingle(fileUrl(item.file), alt, !first);
      frames.appendChild(addItemCaption(node, caption));
    } else if (typeof item === "string" && /\.mp4$/i.test(item)) {
      frames.appendChild(makeVideo(fileUrl(item), alt));
    } else if (typeof item === "string") {
      frames.appendChild(makeSingle(fileUrl(item), alt, !first));
    }
    first = false;
  });
}

if (project && project.shoots) {
  frames.classList.add("has-captions");
  project.shoots.forEach((shoot, index) => {
    const folder = shoot.slug || shoot.folder;
    const files = [
      fileUrl(`${folder}/${shoot.main || "main.jpg"}`),
      ...shoot.images.map((file) => fileUrl(`${folder}/${file}`)),
    ];
    addPairs(files, `${shoot.title}, ${shoot.location}`, {
      title: shoot.title,
      location: shoot.location,
    }, index === 0);
  });
} else if (project) {
  window.projectPictures(project, (files) => {
    renderItems(files, project.name);
  });
}

function coverTarget() {
  const picture = document.querySelector(".frames .picture");
  if (!picture) return null;
  return picture.querySelector("img, video, .fallback") || picture;
}

function nameCover(target) {
  if (target) target.style.viewTransitionName = "project-cover";
}

window.addEventListener("pagereveal", (event) => {
  if (!event.viewTransition) return;
  const target = coverTarget();
  nameCover(target);
  event.viewTransition.finished.finally(() => {
    if (target) target.style.viewTransitionName = "none";
  });
});

window.addEventListener("pageswap", (event) => {
  if (!event.viewTransition) return;
  nameCover(coverTarget());
});

function rememberReturn() {
  if (!window.matchMedia("(max-width: 768px)").matches) return;
  const backSlug = (project && project.slug) || slug;
  if (!backSlug) return;
  try {
    if (!sessionStorage.getItem("lastProject")) sessionStorage.setItem("lastProject", backSlug);
    sessionStorage.setItem("arrive-slug", sessionStorage.getItem("lastProject") || backSlug);
  } catch (error) {}
}

const portfolioNav = document.querySelector('a.nav-tab[href="../index.html"]');
if (portfolioNav) portfolioNav.addEventListener("click", rememberReturn);
const pageBack = document.querySelector(".page-back");
if (pageBack) pageBack.addEventListener("click", rememberReturn);

const back = document.querySelector(".back");
if (back) {
  back.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.matchMedia("(max-width: 768px)").matches) return;
    event.preventDefault();
    const href = back.href;
    if (motionReduce || !("PageRevealEvent" in window)) {
      sessionStorage.setItem("page-fade", "1");
      document.documentElement.classList.add("is-fade-out");
      window.setTimeout(() => {
        location.href = href;
      }, 200);
      return;
    }
    sessionStorage.setItem("page-arrive", "1");
    sessionStorage.setItem("arrive-slug", slug);
    document.body.classList.remove("is-entering");
    document.body.getBoundingClientRect();
    document.body.classList.add("is-returning");
    window.setTimeout(() => {
      location.href = href;
    }, 350);
  });
}
