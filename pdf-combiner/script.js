/**
 * PDF Combiner frontend.
 *
 * This file owns three things: keeping track of which files the user has
 * selected (and in what order), talking to the backend over fetch(), and
 * updating the page to reflect what happened. It never touches the actual
 * PDF bytes beyond reading their name/size for display - all real PDF
 * processing happens on the backend.
 */

// ---------------------------------------------------------------------------
// Backend URL configuration
// ---------------------------------------------------------------------------
// This is the ONLY place the backend's URL is defined. This copy is the one
// deployed on GitHub Pages, so it points at the live Render backend rather
// than localhost (see the PDF_combiner repo's frontend/ for the local-dev
// copy, which points at http://127.0.0.1:5001 instead).
const BACKEND_URL = "https://pdf-combiner-whog.onrender.com";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
// selectedFiles is the single source of truth for what the user has picked,
// in merge order. Every function that changes it finishes by calling
// renderFileList(), which wipes and rebuilds the on-screen list from this
// array - the UI never has its own separate copy of this data to keep in
// sync by hand.
let selectedFiles = [];
let isSubmitting = false;
let currentDownloadUrl = null;

// ---------------------------------------------------------------------------
// Element references
// ---------------------------------------------------------------------------
const dropzone = document.getElementById("dropzone");
const browseBtn = document.getElementById("browse-btn");
const fileInput = document.getElementById("file-input");
const fileListSection = document.getElementById("file-list-section");
const fileListEl = document.getElementById("file-list");
const fileCountEl = document.getElementById("file-count");
const validationMessage = document.getElementById("validation-message");
const combineBtn = document.getElementById("combine-btn");
const loading = document.getElementById("loading");
const errorArea = document.getElementById("error-area");
const successArea = document.getElementById("success-area");
const downloadLink = document.getElementById("download-link");
const backendUrlDisplay = document.getElementById("backend-url-display");

backendUrlDisplay.textContent = BACKEND_URL;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// A file is treated as a PDF if its name ends in .pdf. We also accept an
// empty MIME type (file.type === "") because some browsers/operating
// systems don't reliably report a MIME type for every file - the backend
// re-validates this properly anyway, so this is just a friendly first pass.
function isPdfFile(file) {
  const nameLooksLikePdf = file.name.toLowerCase().endsWith(".pdf");
  const typeLooksLikePdf = file.type === "application/pdf" || file.type === "";
  return nameLooksLikePdf && typeLooksLikePdf;
}

function hide(el) {
  el.hidden = true;
}

function show(el) {
  el.hidden = false;
}

function clearMessages() {
  hide(errorArea);
  hide(successArea);
  hide(validationMessage);
}

function showError(message) {
  errorArea.textContent = message;
  show(errorArea);
}

// ---------------------------------------------------------------------------
// Adding files (from the file picker or drag-and-drop) - both paths funnel
// through this one function so validation only lives in one place.
// ---------------------------------------------------------------------------

function addFiles(fileListLike) {
  const incoming = Array.from(fileListLike);
  const rejected = [];

  for (const file of incoming) {
    if (isPdfFile(file)) {
      selectedFiles.push(file);
    } else {
      rejected.push(file.name);
    }
  }

  if (rejected.length > 0) {
    const word = rejected.length === 1 ? "file" : "files";
    validationMessage.textContent = `Skipped ${rejected.length} ${word} that ${rejected.length === 1 ? "isn't" : "aren't"} a PDF: ${rejected.join(", ")}`;
    show(validationMessage);
  } else {
    hide(validationMessage);
  }

  renderFileList();
}

// ---------------------------------------------------------------------------
// Rendering the file list from selectedFiles
// ---------------------------------------------------------------------------

function renderFileList() {
  fileListEl.innerHTML = "";

  if (selectedFiles.length === 0) {
    hide(fileListSection);
  } else {
    show(fileListSection);
  }

  fileCountEl.textContent = String(selectedFiles.length);

  selectedFiles.forEach((file, index) => {
    fileListEl.appendChild(buildFileRow(file, index));
  });

  combineBtn.disabled = selectedFiles.length < 2 || isSubmitting;
}

function buildFileRow(file, index) {
  const li = document.createElement("li");
  li.className = "file-row";

  const info = document.createElement("div");
  info.className = "file-info";

  const nameEl = document.createElement("span");
  nameEl.className = "file-name";
  nameEl.textContent = `${index + 1}. ${file.name}`;

  const sizeEl = document.createElement("span");
  sizeEl.className = "file-size";
  sizeEl.textContent = formatBytes(file.size);

  info.append(nameEl, sizeEl);

  const controls = document.createElement("div");
  controls.className = "file-controls";

  const upBtn = document.createElement("button");
  upBtn.type = "button";
  upBtn.className = "icon-btn";
  upBtn.textContent = "↑";
  upBtn.setAttribute("aria-label", `Move ${file.name} up`);
  upBtn.disabled = index === 0;
  upBtn.addEventListener("click", () => moveFile(index, -1));

  const downBtn = document.createElement("button");
  downBtn.type = "button";
  downBtn.className = "icon-btn";
  downBtn.textContent = "↓";
  downBtn.setAttribute("aria-label", `Move ${file.name} down`);
  downBtn.disabled = index === selectedFiles.length - 1;
  downBtn.addEventListener("click", () => moveFile(index, 1));

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "icon-btn icon-btn-remove";
  removeBtn.textContent = "✕";
  removeBtn.setAttribute("aria-label", `Remove ${file.name}`);
  removeBtn.addEventListener("click", () => removeFile(index));

  controls.append(upBtn, downBtn, removeBtn);
  li.append(info, controls);
  return li;
}

function moveFile(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= selectedFiles.length) return;
  const updated = selectedFiles.slice();
  [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
  selectedFiles = updated;
  renderFileList();
}

function removeFile(index) {
  selectedFiles = selectedFiles.filter((_, i) => i !== index);
  renderFileList();
}

// ---------------------------------------------------------------------------
// Wiring up the file picker + drag-and-drop
// ---------------------------------------------------------------------------

browseBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files);
  fileInput.value = ""; // reset so selecting the exact same file again still fires "change"
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dropzone-active");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dropzone-active");
  });
});

dropzone.addEventListener("drop", (event) => {
  const dropped = event.dataTransfer.files;
  if (dropped && dropped.length > 0) {
    addFiles(dropped);
  }
});

// ---------------------------------------------------------------------------
// Submitting to the backend
// ---------------------------------------------------------------------------

combineBtn.addEventListener("click", handleCombine);

async function handleCombine() {
  if (isSubmitting) return;

  clearMessages();

  if (selectedFiles.length < 2) {
    validationMessage.textContent = "Please select at least 2 PDF files.";
    show(validationMessage);
    return;
  }

  isSubmitting = true;
  combineBtn.disabled = true;
  show(loading);

  // This is what actually sends the files: a FormData object with each file
  // appended under the same field name, "files". The browser builds the
  // multipart/form-data body (and its Content-Type header, boundary
  // included) for us - we never set that header manually.
  const formData = new FormData();
  for (const file of selectedFiles) {
    formData.append("files", file);
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/combine`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      await handleErrorResponse(response);
      return;
    }

    // A successful response's body IS the PDF file itself, not JSON - so we
    // read it as a Blob (a raw chunk of binary data), not with response.json().
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/pdf")) {
      showError("The server responded successfully, but not with a PDF as expected. Please try again.");
      return;
    }

    const blob = await response.blob();

    // Release the previous download's memory before creating a new one.
    if (currentDownloadUrl) {
      URL.revokeObjectURL(currentDownloadUrl);
    }
    currentDownloadUrl = URL.createObjectURL(blob);
    downloadLink.href = currentDownloadUrl;
    show(successArea);
  } catch (networkError) {
    // fetch() throws (rather than resolving with a non-ok response) when the
    // request never made it to a server at all - the backend is down, the
    // URL is wrong, or the browser blocked it (e.g. a CORS failure shows up
    // to our code as this same generic network error, with no further detail
    // available to JavaScript).
    showError(
      `Could not reach the backend at ${BACKEND_URL}. Make sure it's running, the URL above is ` +
      "correct, and the backend's CORS settings allow requests from this page."
    );
  } finally {
    isSubmitting = false;
    combineBtn.disabled = selectedFiles.length < 2;
    hide(loading);
  }
}

async function handleErrorResponse(response) {
  // The backend sends error details as JSON: { "error": "..." }. But we
  // still guard against a response that ISN'T JSON (e.g. if a proxy or
  // Render itself returns a plain-text/HTML error page instead of the
  // backend ever running), so a parsing failure here doesn't crash the app.
  let message = `Server responded with an error (status ${response.status}).`;
  try {
    const data = await response.json();
    if (data && data.error) {
      message = data.error;
    }
  } catch (parseError) {
    // Not JSON - fall back to the generic message set above.
  }
  showError(message);
}
