import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyANrifzDiBgsM8MpFSbe-kxW_e89vKbCZ8",
  authDomain: "industrialpropertykl.firebaseapp.com",
  projectId: "industrialpropertykl",
  storageBucket: "industrialpropertykl.firebasestorage.app",
  messagingSenderId: "612612953532",
  appId: "1:612612953532:web:94f956f783cb948db887b9",
  measurementId: "G-ML49L4TQ29"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
  const dropdown = document.getElementById("projectsDropdown");
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
          `<a href="project-detail.html?id=${project.id}">${project.title}</a>`
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
await loadSharedSection("site-header", "header.html?v=3");
await loadSharedSection("site-footer", "footer.html?v=3");
  await loadProjectsDropdown();
  setupSharedHeaderFooter();
}

function renderAgentRow(item) {
  const name = item.agentName || "Kenneth Lai";
  const image = item.agentImage || "images/default-agent.png";
  const time = formatPostedDate(item.postedAt);

  return `
    <div class="agent-row">
      <img 
        class="agent-avatar" 
        src="${image}" 
        alt="${name}"
        onerror="this.src='images/default-agent.png'"
      />
      <span class="agent-name">${name}</span>
      <span class="agent-dot">•</span>
      <span>${time}</span>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", initSharedLayout);
