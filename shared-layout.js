import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBKO4RNc5r8GoPHQyRHdUllLVwtXFNJyVo",
  authDomain: "residentialpropertykl.firebaseapp.com",
  projectId: "residentialpropertykl",
  storageBucket: "residentialpropertykl.firebasestorage.app",
  messagingSenderId: "952845303526",
  appId: "1:952845303526:web:7b604dca11ad50a93bc527",
  measurementId: "G-DV21X2EGJ0"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function makeProjectSlug(title) {
  return (title || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function loadSharedSection(targetId, filePath) {
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Failed to load ${filePath}`);
    const html = await response.text();
    target.innerHTML = html;
  } catch (error) {
    console.error(error);
  }
}

async function loadProjectsDropdown() {
  const dropdown = document.getElementById("projectsDropdownItems");
  if (!dropdown) return;

  try {
    const snapshot = await getDocs(collection(db, "projects"));

    if (snapshot.empty) {
      dropdown.innerHTML = `<div style="padding:10px;">No projects yet</div>`;
      return;
    }

    const projects = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      if (data.status === "published") {
        projects.push({
          id: docSnap.id,
          title: data.title || "Untitled Project",
          createdAt: data.createdAt || 0
        });
      }
    });

    if (!projects.length) {
      dropdown.innerHTML = `<div style="padding:10px;">No projects yet</div>`;
      return;
    }

    projects.sort((a, b) => b.createdAt - a.createdAt);

    dropdown.innerHTML = projects
      .map(
        (project) =>
          `<a href="/project/${makeProjectSlug(project.title)}-${project.id}">${project.title}</a>`
      )
      .join("");
  } catch (error) {
    console.error("Failed to load projects dropdown:", error);
    dropdown.innerHTML = `<div style="padding:10px;">Unable to load projects</div>`;
  }
}

function setupSharedHeaderFooter() {
  const dropdowns = document.querySelectorAll(".dropdown");
  const backToTop = document.getElementById("backToTop");

  dropdowns.forEach((drop) => {
    const btn = drop.querySelector(".drop-btn");

    if (btn) {
      btn.addEventListener("click", (e) => {
        if (window.innerWidth <= 820) {
          e.preventDefault();

          dropdowns.forEach((otherDrop) => {
            if (otherDrop !== drop) {
              otherDrop.classList.remove("open");
            }
          });

          drop.classList.toggle("open");
        }
      });
    }
  });

  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 820) {
      if (!e.target.closest(".dropdown")) {
        dropdowns.forEach((drop) => drop.classList.remove("open"));
      }
    }
  });

  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

async function initSharedLayout() {
  await loadSharedSection("site-header", "/header.html?v=3");
  await loadSharedSection("site-footer", "/footer.html?v=3");
  await loadProjectsDropdown();
  setupSharedHeaderFooter();
}

function renderAgentRow(item) {
  const name = item.agentName || "Kenneth Lai";
  const image = item.agentImage || "/images/default-agent.png";
  const time = formatPostedDate(item.postedAt);

  return `
    <div class="agent-row">
      <img 
        class="agent-avatar" 
        src="${image}" 
        alt="${name}"
        onerror="this.src='/images/default-agent.png'"
      />
      <span class="agent-name">${name}</span>
      <span class="agent-dot">•</span>
      <span>${time}</span>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", initSharedLayout);