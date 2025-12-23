let data = JSON.parse(localStorage.getItem("gallery")) || {};

function save() {
  localStorage.setItem("gallery", JSON.stringify(data));
}

function refreshFolders() {
  const selects = [uploadFolder, filterFolder];
  selects.forEach(sel => {
    sel.innerHTML = "";
    Object.keys(data).forEach(f => {
      let o = document.createElement("option");
      o.value = f;
      o.textContent = f;
      sel.appendChild(o);
    });
  });
}

function createFolder() {
  const name = folderName.value.trim();
  if (!name || data[name]) return alert("Invalid folder");
  data[name] = [];
  save();
  folderName.value = "";
  refreshFolders();
}

function uploadImages(e) {
  const folder = uploadFolder.value;
  [...e.target.files].forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      data[folder].push(reader.result);
      save();
      renderGallery();
    };
    reader.readAsDataURL(file);
  });
}

function renderGallery() {
  gallery.innerHTML = "";
  const folder = filterFolder.value;
  if (!folder) return;

  data[folder].forEach((img, i) => {
    const div = document.createElement("div");
    div.className = "img-card";
    div.innerHTML = `
      <img src="${img}">
      <a download="image-${i}.png" href="${img}">Download</a>
    `;
    gallery.appendChild(div);
  });
}

function downloadAll() {
  if (!filterFolder.value) return;
  alert("GitHub Pages ไม่รองรับ zip server-side\nแต่สามารถใช้ JSZip เพิ่มได้");
}

refreshFolders();
