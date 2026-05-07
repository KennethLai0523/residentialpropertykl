const FUNCTION_URL =
  "https://us-central1-residentialpropertykl.cloudfunctions.net/importListingFromText";

const statusBox = document.getElementById("status");


document.getElementById("extractBtn").addEventListener("click", async () => {
  statusBox.textContent = "Reading listing + images...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const imageUrls = [...new Set([
          ...document.querySelectorAll("img"),
          ...document.querySelectorAll("source"),
          ...document.querySelectorAll("[style]")
        ].flatMap(el => {
          const arr = [];

          if (el.src) arr.push(el.src);
          if (el.currentSrc) arr.push(el.currentSrc);
          if (el.srcset) {
            arr.push(...el.srcset.split(",").map(x => x.trim().split(" ")[0]));
          }

          const style = el.getAttribute("style") || "";
          const matches = style.match(/url\(["']?([^"')]+)["']?\)/g) || [];

          matches.forEach(m => {
            const url = m.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
            if (url) arr.push(url);
          });

          return arr;
        }))].filter(u =>
          u.includes("pgimgs") &&
          u.includes("listing") &&
          /\.(jpg|jpeg|png|webp)/i.test(u)
        );

        return {
          url: location.href,
          title: document.title,
          text: document.body.innerText,
          imageUrls
        };
      }
    });

    const pageData = result[0].result;

    statusBox.textContent =
      `Sending text + ${pageData.imageUrls.length} images to AI...`;

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pageData)
    });

    const data = await response.json();

    data.imageUrls = pageData.imageUrls;

    await chrome.storage.local.set({ latestListing: data });

    await navigator.clipboard.writeText(pageData.imageUrls.join("\n"));

    statusBox.textContent =
      `Done. Listing saved.\nImage URLs copied: ${pageData.imageUrls.length}\nNow open admin.html and click Fill Admin Form.`;
  } catch (err) {
    statusBox.textContent = "Error: " + err.message;
  }
});

document.getElementById("fillBtn").addEventListener("click", async () => {
  statusBox.textContent = "Filling admin form...";

  try {
    const stored = await chrome.storage.local.get("latestListing");
    const data = stored.latestListing;

    if (!data) {
      statusBox.textContent = "No listing saved yet. Extract first.";
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [data],
func: (data) => {
  function normalizeListingType(value) {
    const v = String(value || "").toLowerCase();
    if (v.includes("rent")) return "rent";
    return "sale";
  }

  function normalizePropertyType(value) {
    const v = String(value || "").toLowerCase();

    if (v.includes("condo") || v.includes("serviced residence") || v.includes("service residence")) {
      return "Condominium";
    }

    if (v.includes("apartment") || v.includes("flat")) {
      return "Apartment";
    }

    if (v.includes("terrace") || v.includes("terraced") || v.includes("link house")) {
      return "Terrace House";
    }

    if (v.includes("semi")) {
      return "Semi-Detached House";
    }

    if (v.includes("bungalow")) {
      return "Bungalow";
    }

    if (v.includes("townhouse") || v.includes("town house")) {
      return "Townhouse";
    }

    if (v.includes("soho")) {
      return "SOHO";
    }

    return "Condominium";
  }

  function setField(id, value) {
    const el = document.getElementById(id);
    if (!el || value === undefined || value === null) return;

    el.value = value;

    if (el.tagName === "SELECT") {
      const wanted = String(value).trim().toLowerCase();

      [...el.options].forEach((opt) => {
        const optValue = String(opt.value).trim().toLowerCase();
        const optText = String(opt.textContent).trim().toLowerCase();

        if (optValue === wanted || optText === wanted) {
          el.value = opt.value;
        }
      });
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const fixedListingType = normalizeListingType(data.listingType);
  const fixedPropertyType = normalizePropertyType(data.type || data.title || data.description);


  const importImageUrls = document.getElementById("importImageUrls");
if (importImageUrls && Array.isArray(data.imageUrls)) {
  importImageUrls.value = data.imageUrls.join("\n");
  importImageUrls.dispatchEvent(new Event("input", { bubbles: true }));
  importImageUrls.dispatchEvent(new Event("change", { bubbles: true }));
}

  setField("listingType", fixedListingType);
  setField("type", fixedPropertyType);

  setField("title", data.title);
  setField("price", data.price);
  setField("location", data.location);
  setField("address", data.address);
  setField("state", data.state);
  setField("city", data.city);
  setField("status", data.status || "active");
  setField("bua", data.bua);
  setField("landArea", data.landArea);
  setField("bedrooms", data.bedrooms);
  setField("bathrooms", data.bathrooms);
  setField("carPark", data.carPark);
  setField("tenure", data.tenure);
  setField("maintenanceFee", data.maintenanceFee);
  setField("features", data.features);
  setField("googleMapsLink", data.googleMapsLink);
  setField("latitude", data.latitude);
  setField("longitude", data.longitude);
  setField("description", data.description);
}
    });

    statusBox.textContent = "Done. Admin form filled.";
  } catch (err) {
    statusBox.textContent = "Error: " + err.message;
  }
});