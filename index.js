const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

function slugify(text) {
  return (text || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toIsoDate(value) {
  if (!value) return new Date().toISOString();

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function slugPart(text) {
  return (text || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapTypeToSeo(type) {
  const value = (type || "").toLowerCase();

  if (value.includes("condo")) return "condominium";
  if (value.includes("apartment")) return "apartment";
  if (value.includes("terrace")) return "terrace-house";
  if (value.includes("semi")) return "semi-detached-house";
  if (value.includes("bungalow")) return "bungalow";
  if (value.includes("townhouse")) return "townhouse";
  if (value.includes("soho")) return "soho";

  return null;
}

function mapListingTypeToSeo(listingType) {
  const value = (listingType || "").toLowerCase();

  if (value === "rent") return "rent";
  if (value === "sale") return "sale";

  return null;
}

exports.sitemap = functions.https.onRequest(async (req, res) => {
  try {
    const [listingSnapshot, projectSnapshot, blogSnapshot] = await Promise.all([
      db.collection("listings").get(),
      db.collection("projects").get(),
      db.collection("blogs").get()
    ]);

    const baseUrl = "https://residentialpropertykl.com";

    let urls = `
<url>
  <loc>${baseUrl}/</loc>
  <lastmod>${new Date().toISOString()}</lastmod>
</url>
<url>
  <loc>${baseUrl}/about.html</loc>
  <lastmod>${new Date().toISOString()}</lastmod>
</url>
<url>
  <loc>${baseUrl}/blog.html</loc>
  <lastmod>${new Date().toISOString()}</lastmod>
</url>
<url>
  <loc>${baseUrl}/contact.html</loc>
  <lastmod>${new Date().toISOString()}</lastmod>
</url>
`;

    const categories = [
      "all-listings",
      "condominium",
      "apartment",
      "terrace-house",
      "semi-detached-house",
      "bungalow",
      "townhouse",
      "soho"
    ];

    categories.forEach((cat) => {
      urls += `
<url>
  <loc>${baseUrl}/categories/${cat}</loc>
  <lastmod>${new Date().toISOString()}</lastmod>
</url>
`;
    });

    const seoPages = new Map();

    listingSnapshot.forEach((doc) => {
      const data = doc.data();

      const seoType = mapTypeToSeo(data.type);
      const seoIntent = mapListingTypeToSeo(data.listingType);
      const seoLocation = slugPart(data.city || data.location);

      if (!seoType || !seoIntent || !seoLocation) return;

      const seoUrl = `${baseUrl}/${seoType}-for-${seoIntent}-${seoLocation}`;
      const lastmod = data.updatedAt
        ? toIsoDate(data.updatedAt)
        : data.createdAt
          ? toIsoDate(data.createdAt)
          : new Date().toISOString();

      const existing = seoPages.get(seoUrl);
      if (!existing || new Date(lastmod) > new Date(existing)) {
        seoPages.set(seoUrl, lastmod);
      }
    });

    seoPages.forEach((lastmod, seoUrl) => {
      urls += `
<url>
  <loc>${seoUrl}</loc>
  <lastmod>${lastmod}</lastmod>
</url>
`;
    });

    listingSnapshot.forEach((doc) => {
      const data = doc.data();

      const listingUrl = `${baseUrl}/listing/${slugify(data.title)}-${doc.id}`;
      const lastmod = data.updatedAt
        ? toIsoDate(data.updatedAt)
        : data.createdAt
          ? toIsoDate(data.createdAt)
          : new Date().toISOString();

      urls += `
<url>
  <loc>${listingUrl}</loc>
  <lastmod>${lastmod}</lastmod>
</url>
`;
    });

    projectSnapshot.forEach((doc) => {
      const data = doc.data();

      if (data.status && data.status !== "published") return;

      const projectUrl = `${baseUrl}/project/${slugify(data.title)}-${doc.id}`;
      const lastmod = data.updatedAt
        ? toIsoDate(data.updatedAt)
        : data.createdAt
          ? toIsoDate(data.createdAt)
          : new Date().toISOString();

      urls += `
<url>
  <loc>${projectUrl}</loc>
  <lastmod>${lastmod}</lastmod>
</url>
`;
    });

    blogSnapshot.forEach((doc) => {
      const data = doc.data();

      if (data.status && data.status !== "published") return;

      const blogUrl = `${baseUrl}/blog-detail.html?id=${doc.id}`;
      const lastmod = data.updatedAt
        ? toIsoDate(data.updatedAt)
        : data.createdAt
          ? toIsoDate(data.createdAt)
          : new Date().toISOString();

      urls += `
<url>
  <loc>${blogUrl}</loc>
  <lastmod>${lastmod}</lastmod>
</url>
`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.status(200).send(xml);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating sitemap");
  }
});