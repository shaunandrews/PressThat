const { ipcRenderer, clipboard, nativeImage } = require("electron");

window.addEventListener("DOMContentLoaded", async () => {
  const savedCredentials = await ipcRenderer.invoke("get-credentials");
  if (savedCredentials) {
    document.getElementById("site-url").value = savedCredentials.siteUrl;
    document.getElementById("username").value = savedCredentials.username;
  }
});

// This code sets up event listeners and handles the connection process for the PressThat app.
// It retrieves saved credentials on page load, and manages the form submission for connecting to a WordPress site.
// The code interacts with the main process through IPC (Inter-Process Communication) to test the connection,
// save credentials, and update the UI based on the connection result.
document.getElementById("settings").addEventListener("submit", async (e) => {
  e.preventDefault();
  const siteUrl = document.getElementById("site-url").value;
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const connected = await ipcRenderer.invoke("test-and-save-connection", {
    siteUrl,
    username,
    password,
  });

  if (connected) {
    console.log("Connected successfully!");
  } else {
    console.log("Connection failed. Please check your credentials.");
  }
});

async function initializeSettings() {
  const savedCredentials = await ipcRenderer.invoke("get-credentials");
  if (savedCredentials) {
    settingsContainer.style.display = "none";
    document.getElementById("site-url").value = savedCredentials.siteUrl;
    document.getElementById("username").value = savedCredentials.username;
  } else {
    settingsContainer.style.display = "block";
  }
}

initializeSettings();

// Settings Toggle
const settingsContainer = document.getElementById("settings");
const toggleSettingsButton = document.getElementById("toggle-settings");

toggleSettingsButton.addEventListener("click", () => {
  const isHidden = settingsContainer.style.display === "none";
  settingsContainer.style.display = isHidden ? "flex" : "none";
});

async function updateClipboardPreview() {
  const clipboardPreview = document.getElementById("clipboard-preview");
  clipboardPreview.innerHTML = ""; // Clear previous content

  // Check for image content
  const image = clipboard.readImage();
  if (!image.isEmpty()) {
    const imgElement = document.createElement("img");
    imgElement.src = image.toDataURL();
    imgElement.style.maxWidth = "100%";
    imgElement.style.maxHeight = "200px";
    clipboardPreview.appendChild(imgElement);
  } else {
    // Check for text content
    const text = clipboard.readText().trim();
    if (text) {
      const isUrl =
        /^(https?:\/\/)?([\w\-]+(\.[\w\-]+)+\.?(:\d+)?(\/\S*)?|\w+:\/\/\S+)$/.test(
          text
        );
      if (isUrl) {
        const linkElement = document.createElement("a");
        linkElement.href = text.startsWith("http") ? text : `https://${text}`;
        linkElement.textContent = text;
        linkElement.target = "_blank";
        clipboardPreview.appendChild(linkElement);

        // Fetch and display URL preview
        try {
          const preview = await getUrlPreview(linkElement.href);
          const previewElement = document.createElement("div");
          previewElement.innerHTML = `
            ${
              preview.iconUrl
                ? `<img src="${preview.iconUrl}" alt="Site icon" height="32">`
                : ""
            }
            <h3>${preview.title}</h3>
            <p>${preview.description}</p>
          `;
          clipboardPreview.appendChild(previewElement);
        } catch (error) {
          console.error("Failed to fetch URL preview:", error);
        }
      } else {
        const textElement = document.createElement("p");
        textElement.textContent =
          text.slice(0, 200) + (text.length > 200 ? "..." : "");
        clipboardPreview.appendChild(textElement);
      }
    } else {
      clipboardPreview.textContent =
        "Clipboard is empty or contains unsupported content.";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateClipboardPreview();
});

// Add this to update clipboard preview when the window gains focus
window.addEventListener("focus", updateClipboardPreview);

async function getUrlPreview(url) {
  const response = await fetch(url);
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const title = doc.querySelector("title")?.textContent || "No title";
  const metaDescription =
    doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
    "";
  const firstParagraph = doc.querySelector("p")?.textContent || "";
  const description = metaDescription || firstParagraph.slice(0, 150) + "...";

  // Find icon URL
  let iconUrl = null;
  const iconSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
  ];

  for (const selector of iconSelectors) {
    const iconElement = doc.querySelector(selector);
    if (iconElement) {
      iconUrl = iconElement.getAttribute("href");
      break;
    }
  }

  // If icon URL is relative, make it absolute
  if (iconUrl && !iconUrl.startsWith("http")) {
    const urlObj = new URL(url);
    iconUrl = `${urlObj.protocol}//${urlObj.host}${
      iconUrl.startsWith("/") ? "" : "/"
    }${iconUrl}`;
  }

  // If no icon found, use default favicon path
  if (!iconUrl) {
    const urlObj = new URL(url);
    iconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
  }

  return { title, description, iconUrl };
}

// Get the "View drafts" button element
const viewDraftsButton = document.getElementById("view-drafts");

// Add click event listener to the button
viewDraftsButton.addEventListener("click", async () => {
  try {
    // Get the site URL from the stored credentials
    const credentials = await ipcRenderer.invoke("get-credentials");

    if (credentials && credentials.siteUrl) {
      // Construct the URL for viewing drafts
      const draftsUrl = `${credentials.siteUrl}/wp-admin/edit.php?post_status=draft&post_type=post`;

      // Open the URL in the default browser
      await ipcRenderer.invoke("open-external", draftsUrl);
    } else {
      console.error("Site URL not found in credentials");
      alert("Please set up your WordPress site in the settings first.");
    }
  } catch (error) {
    console.error("Error opening drafts page:", error);
    alert("An error occurred while trying to open the drafts page.");
  }
});
