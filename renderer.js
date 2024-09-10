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
  quickDraftContainer.style.display = "none"; // Hide quick draft when showing settings
});

// Quick Draft Toggle
const quickDraftContainer = document.getElementById("quick-draft");
const toggleQuickDraftButton = document.getElementById("toggle-quick-draft");

toggleQuickDraftButton.addEventListener("click", () => {
  const isHidden = quickDraftContainer.style.display === "none";
  quickDraftContainer.style.display = isHidden ? "block" : "none";
  settingsContainer.style.display = "none"; // Hide settings when showing quick draft
});

async function updateClipboardPreview() {
  const imagePreview = document.getElementById("image-preview");
  const urlPreview = document.getElementById("url-preview");
  const textPreview = document.getElementById("text-preview");
  const emptyClipboard = document.getElementById("empty-clipboard");

  // Hide all previews initially
  imagePreview.style.display = "none";
  urlPreview.style.display = "none";
  textPreview.style.display = "none";
  emptyClipboard.style.display = "none";

  // Check for image content
  const image = clipboard.readImage();
  if (!image.isEmpty()) {
    const previewImage = document.getElementById("preview-image");
    const imageDataUrl = image.toDataURL();
    previewImage.src = imageDataUrl;
    previewImage.style.maxWidth = "100%";
    previewImage.style.maxHeight = "400px";

    const size = image.getSize();
    document.getElementById("image-resolution").textContent = `${size.width}x${size.height}`;
    
    // Calculate image size in KB
    const imageSizeInBytes = atob(imageDataUrl.split(',')[1]).length;
    const imageSizeInKB = Math.round(imageSizeInBytes / 1024);
    document.getElementById("image-size").textContent = `${imageSizeInKB} KB`;
    
    // Determine image type
    const imageType = imageDataUrl.split(';')[0].split('/')[1];
    document.getElementById("image-type").textContent = imageType.toUpperCase();

    imagePreview.style.display = "block";
  } else {
    // Check for text content
    const text = clipboard.readText().trim();
    if (text) {
      const isUrl = /^(https?:\/\/)?([\w\-]+(\.[\w\-]+)+\.?(:\d+)?(\/\S*)?|\w+:\/\/\S+)$/.test(text);
      if (isUrl) {
        const fullUrl = text.startsWith("http") ? text : `https://${text}`;
        document.getElementById("url-link").href = fullUrl;
        document.getElementById("url-link").textContent = text;

        // Fetch and display URL preview
        try {
          const preview = await getUrlPreview(fullUrl);
          document.getElementById("url-icon").src = preview.iconUrl || "";
          document.getElementById("url-title").textContent = preview.title;
          document.getElementById("url-description").textContent = preview.description;
          urlPreview.style.display = "block";
        } catch (error) {
          console.error("Failed to fetch URL preview:", error);
          textPreview.style.display = "block";
          document.getElementById("text-content").textContent = text;
        }
      } else {
        textPreview.style.display = "block";
        document.getElementById("text-content").textContent = text.length > 200 ? text.slice(0, 200) + "..." : text;
      }
    } else {
      emptyClipboard.style.display = "block";
    }
  }
}

document.addEventListener("DOMContentLoaded", updateClipboardPreview);

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
const viewDraftsButton = document.getElementById('view-drafts');

// Add click event listener to the button
viewDraftsButton.addEventListener('click', async () => {
  try {
    // Get the site URL from the stored credentials
    const credentials = await ipcRenderer.invoke("get-credentials");
    
    if (credentials && credentials.siteUrl) {
      // Construct the URL for viewing drafts
      const draftsUrl = `${credentials.siteUrl}/wp-admin/edit.php?post_status=draft&post_type=post`;
      
      // Open the URL in the default browser
      await ipcRenderer.invoke("open-external", draftsUrl);
    } else {
      console.error('Site URL not found in credentials');
      alert('Please set up your WordPress site in the settings first.');
    }
  } catch (error) {
    console.error('Error opening drafts page:', error);
    alert('An error occurred while trying to open the drafts page.');
  }
});
