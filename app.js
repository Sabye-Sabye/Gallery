// -----------------------------
// Storage model (LocalStorage)
// -----------------------------
const STORAGE_KEY = "gallery_v2";

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function normalizeTags(str) {
  return String(str || "")
    .split(",")
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => t.toLowerCase());
}

function sanitizeFolderName(name) {
  return String(name || "")
    .trim()
    .replace(/[\/\\]/g, "-")
    .replace(/(\.\.)/g, "")
    .replace(/[^\wก-๙\s.-]/g, "")
    .trim();
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // default initial structure
      return { folders: { "Default": [] } };
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.folders) return { folders: { "Default": [] } };
    return parsed;
  } catch {
    return { folders: { "Default": [] } };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// -----------------------------
// DOM helpers
// -----------------------------
const $ = (id) => document.getElementById(id);

const tabSearch = $("tabSearch");
const tabUpload = $("tabUpload");
const panelSearch = $("panelSearch");
const panelUpload = $("panelUpload");

const newFolderName = $("newFolderName");
const btnCreateFolder = $("btnCreateFolder");
const createMsg = $("createMsg");

const uploadFolder = $("uploadFolder");
const uploadTags = $("uploadTags");
const btnPickFiles = $("btnPickFiles");
const fileInput = $("fileInput");
const dropzone = $("dropzone");
const uploadMsg = $("uploadMsg");

const searchFolder = $("searchFolder");
const searchText = $("searchText");
const searchTags = $("searchTags");
const btnClearSearch = $("btnClearSearch");
const resultInfo = $("resultInfo");

const btnShowAll = $("btnShowAll");
const btnResetDemo = $("btnResetDemo");

const gallery = $("gallery");
const emptyState = $("emptyState");

// -----------------------------
// Tabs
// -----------------------------
function setActiveTab(tab) {
  const isSearch = tab === "search";
  tabSearch.classList.toggle("active", isSearch);
  tabUpload.classList.toggle("active", !isSearch);
  panelSearch.classList.toggle("hidden", !isSearch);
  panelUpload.classList.toggle("hidden", isSearch);
}

tabSearch.addEventListener("click", () => setActiveTab("search"));
tabUpload.addEventListener("click", () => setActiveTab("upload"));

// -----------------------------
// Folder select refresh
// -----------------------------
function getFolderNames() {
  return Object.keys(state.folders).sort((a,b)=>a.localeCompare(b));
}

function refillFolderSelects() {
  const folders = getFolderNames();

  // Upload folder
  uploadFolder.innerHTML = "";
  folders.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f;
    uploadFolder.appendChild(opt);
  });

  // Search folder (include All)
  const currentSearch = searchFolder.value;
  searchFolder.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "__ALL__";
  allOpt.textContent = "All folders";
  searchFolder.appendChild(allOpt);

  folders.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f;
    searchFolder.appendChild(opt);
  });

  // keep selection if possible
  if ([...searchFolder.options].some(o => o.value === currentSearch)) {
    searchFolder.value = currentSearch;
  } else {
    searchFolder.value = "__ALL__";
  }
}

// -----------------------------
// Create folder
// -----------------------------
function setMsg(el, text, ok = true) {
  el.textContent = text || "";
  el.style.color = ok ? "#7ee787" : "#ff7b72";
}

btnCreateFolder.addEventListener("click", () => {
  const name = sanitizeFolderName(newFolderName.value);
  if (!name) return setMsg(createMsg, "กรุณาใส่ชื่อโฟลเดอร์", false);
  if (state.folders[name]) return setMsg(createMsg, "มีโฟลเดอร์นี้อยู่แล้ว", false);

  state.folders[name] = [];
  saveState();
  newFolderName.value = "";
  setMsg(createMsg, `สร้างโฟลเดอร์สำเร็จ: ${name}`, true);
  refillFolderSelects();
  uploadFolder.value = name;

  // After creating, switch to upload tab (optional)
  setActiveTab("upload");
});

// -----------------------------
// Upload (FileReader)
// -----------------------------
btnPickFiles.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async (e) => {
  const files = [...(e.target.files || [])];
  await handleFilesUpload(files);
  fileInput.value = "";
});

async function handleFilesUpload(files) {
  const folder = uploadFolder.value;
  if (!folder) {
    uploadMsg.textContent = "กรุณาเลือกโฟลเดอร์";
    return;
  }
  if (!files.length) return;

  const tags = normalizeTags(uploadTags.value);
  uploadMsg.textContent = `กำลังอัปโหลด ${files.length} ไฟล์...`;

  for (const file of files) {
    if (!file.type?.startsWith("image/")) continue;

    const dataUrl = await readFileAsDataURL(file);
    state.folders[folder].push({
      id: uid(),
      name: file.name,
      dataUrl,
      tags,
      createdAt: Date.now()
    });
  }

  saveState();
  uploadMsg.textContent = `อัปโหลดสำเร็จ: ${files.length} ไฟล์ ไปยัง "${folder}"`;
  // After upload, show all images
  setActiveTab("search");
  renderGallery(); // uses current search filters
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// -----------------------------
// Drag & Drop
// -----------------------------
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});
dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});
dropzone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const files = [...(e.dataTransfer?.files || [])];
  await handleFilesUpload(files);
});

// -----------------------------
// Search / Filter
// -----------------------------
function getAllImages() {
  const out = [];
  for (const folder of getFolderNames()) {
    for (const img of state.folders[folder]) {
      out.push({ ...img, folder });
    }
  }
  // newest first
  out.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  return out;
}

function applyFilters(images) {
  const folder = searchFolder.value;
  const text = (searchText.value || "").trim().toLowerCase();
  const tags = normalizeTags(searchTags.value);

  return images.filter(img => {
    if (folder !== "__ALL__" && img.folder !== folder) return false;

    if (text) {
      const name = (img.name || "").toLowerCase();
      if (!name.includes(text)) return false;
    }

    if (tags.length) {
      const imgTags = (img.tags || []).map(t => String(t).toLowerCase());
      // require all tags
      for (const t of tags) {
        if (!imgTags.includes(t)) return false;
      }
    }
    return true;
  });
}

function renderGallery() {
  const all = getAllImages();
  const filtered = applyFilters(all);

  gallery.innerHTML = "";

  if (!filtered.length) {
    emptyState.style.display = "block";
    resultInfo.textContent = "ไม่พบรูปตามเงื่อนไข";
    return;
  }
  emptyState.style.display = "none";
  resultInfo.textContent = `แสดง ${filtered.length} จากทั้งหมด ${all.length} รูป`;

  for (const img of filtered) {
    const card = document.createElement("div");
    card.className = "thumb";

    const imageEl = document.createElement("img");
    imageEl.src = img.dataUrl;
    imageEl.alt = img.name || "image";
    imageEl.loading = "lazy";

    const meta = document.createElement("div");
    meta.className = "meta";

    const topline = document.createElement("div");
    topline.className = "topline";

    const name = document.createElement("div");
    name.className = "name";
    name.title = img.name || "";
    name.textContent = img.name || "(no name)";

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = img.folder;

    topline.appendChild(name);
    topline.appendChild(badge);

    const tagsWrap = document.createElement("div");
    tagsWrap.className = "tags";
    (img.tags || []).forEach(t => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = t;
      tag.addEventListener("click", () => {
        // click tag -> add to searchTags
        const current = new Set(normalizeTags(searchTags.value));
        current.add(String(t).toLowerCase());
        searchTags.value = Array.from(current).join(", ");
        setActiveTab("search");
        renderGallery();
      });
      tagsWrap.appendChild(tag);
    });

    const actions = document.createElement("div");
    actions.className = "actions";

    const a = document.createElement("a");
    a.href = img.dataUrl;
    a.download = img.name || "image";
    a.textContent = "Download";

    const b = document.createElement("a");
    b.href = "#";
    b.textContent = "Delete";
    b.addEventListener("click", (e) => {
      e.preventDefault();
      deleteImage(img.folder, img.id);
    });

    actions.appendChild(a);
    actions.appendChild(b);

    meta.appendChild(topline);
    if ((img.tags || []).length) meta.appendChild(tagsWrap);
    meta.appendChild(actions);

    card.appendChild(imageEl);
    card.appendChild(meta);

    gallery.appendChild(card);
  }
}

function deleteImage(folder, id) {
  if (!confirm("ลบรูปนี้ออกจากเครื่องนี้?")) return;
  state.folders[folder] = (state.folders[folder] || []).filter(x => x.id !== id);
  saveState();
  renderGallery();
}

searchFolder.addEventListener("change", renderGallery);
searchText.addEventListener("input", renderGallery);
searchTags.addEventListener("input", renderGallery);

btnClearSearch.addEventListener("click", () => {
  searchFolder.value = "__ALL__";
  searchText.value = "";
  searchTags.value = "";
  renderGallery();
});

btnShowAll.addEventListener("click", () => {
  setActiveTab("search");
  searchFolder.value = "__ALL__";
  searchText.value = "";
  searchTags.value = "";
  renderGallery();
});

btnResetDemo.addEventListener("click", () => {
  if (!confirm("ลบข้อมูลทั้งหมด (โฟลเดอร์+รูป) ในเครื่องนี้?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = loadState();
  refillFolderSelects();
  setActiveTab("search");
  renderGallery();
});

// -----------------------------
// Init
// -----------------------------
function init() {
  refillFolderSelects();
  setActiveTab("search"); // เริ่มต้นไปหน้า Search
  // เริ่มต้นแสดงรูปทั้งหมด
  searchFolder.value = "__ALL__";
  searchText.value = "";
  searchTags.value = "";
  renderGallery();
  uploadMsg.textContent = "—";
  createMsg.textContent = "";
}
init();
