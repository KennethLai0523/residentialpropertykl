const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const OpenAI = require("openai");

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

const db = admin.firestore();
const openaiKey = defineSecret("OPENAI_API_KEY");

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanJson(raw) {
  return raw.replace(/```json/g, "").replace(/```/g, "").trim();
}

function getDefaultImage(category) {
  const imagesByCategory = {
    "Market Insights": [
      "/images/blog-market-1.jpg",
      "/images/blog-residential-1.jpg",
    ],
    "Rental Guide": [
      "/images/blog-rental-1.jpg",
      "/images/blog-residential-1.jpg",
    ],
    "Buying Guide": [
      "/images/blog-buying-1.jpg",
      "/images/blog-residential-1.jpg",
    ],
    "Investment Guide": [
      "/images/blog-buying-1.jpg",
      "/images/blog-market-1.jpg",
    ],
    "Project Preview / Property Insight": [
      "/images/blog-project-1.jpg",
      "/images/blog-residential-1.jpg",
    ],
    "Educational": [
      "/images/blog-educational-1.jpg",
      "/images/blog-residential-1.jpg",
    ],
    "Residential Property Guide": [
      "/images/blog-residential-1.jpg",
      "/images/blog-market-1.jpg",
      "/images/blog-buying-1.jpg",
      "/images/blog-rental-1.jpg",
      "/images/blog-project-1.jpg",
      "/images/blog-educational-1.jpg",
    ],
  };

  const images =
    imagesByCategory[category] || imagesByCategory["Residential Property Guide"];

  const randomIndex = Math.floor(Math.random() * images.length);

  return images[randomIndex];
}

async function createOneBlog() {
  const openai = new OpenAI({
    apiKey: openaiKey.value(),
  });

  const topicResponse = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "user",
        content: `
Generate ONE unique SEO blog topic for Residential Property KL Group.

Focus:
- Kuala Lumpur and Selangor residential property
- condos, apartments, landed homes, rental, buying, investment, family living, MRT areas, new projects

Rules:
- No emoji
- No markdown
- Return ONLY the topic title
        `,
      },
    ],
  });

  const topic = topicResponse.choices[0].message.content.trim();
  const slug = slugify(topic);

  const existingDoc = await db.collection("blogs").doc(slug).get();

  if (existingDoc.exists) {
    return {
      skipped: true,
      topic,
    };
  }

  const textResponse = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "user",
        content: `
Create one SEO-optimized residential property blog for Residential Property KL Group.

Topic: ${topic}

Choose category ONLY from:
Educational, Market Insights, Project Preview / Property Insight, Rental Guide, Residential Property Guide, Investment Guide, Buying Guide.

Rules:
- No emoji
- No markdown
- No ** symbols
- Use clean HTML only: <h2>, <h3>, <p>, <ul>, <li>
- Mention real KL / Selangor areas
- Include keyword naturally: "property near MRT Kuala Lumpur"
- Include keyword naturally: "condo near MRT KL"
- Include one internal link: <a href="/listing.html">view latest listings</a>
- End with CTA mentioning Residential Property KL Group

Return ONLY valid JSON:
{
  "title": "",
  "category": "",
  "excerpt": "",
  "content": ""
}
        `,
      },
    ],
  });

  const aiData = JSON.parse(cleanJson(textResponse.choices[0].message.content));

  const title = aiData.title || topic;
  const category = aiData.category || "Residential Property Guide";
  const excerpt = aiData.excerpt || "";
  const content = aiData.content || "";
  const imageUrl = getDefaultImage(category);

  await db.collection("blogs").doc(slug).set({
    title,
    slug,
    topic,
    content,
    excerpt,
    coverImage: imageUrl,
    authorName: "Residential Property KL Group",
    category,
    status: "published",
    source: "AI",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    skipped: false,
    title,
    category,
  };
}

// Manual test URL
exports.generateBlog = onRequest(
  { secrets: [openaiKey], timeoutSeconds: 120, memory: "512MiB" },
  async (req, res) => {
    try {
      const result = await createOneBlog();

      if (result.skipped) {
        res.send(`Skipped duplicate blog ✅<br>Topic: ${result.topic}`);
        return;
      }

      res.send(`Blog created ✅<br>Title: ${result.title}<br>Category: ${result.category}`);
    } catch (error) {
      console.error(error);
      res.status(500).send(error.message);
    }
  }
);

// Automatic daily blog
exports.generateDailyBlog = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Asia/Kuala_Lumpur",
    secrets: [openaiKey],
    timeoutSeconds: 540,
    memory: "1GiB",
  },
    async () => {
    for (let i = 0; i < 20; i++) {
        const result = await createOneBlog();
        console.log(`Blog ${i + 1}:`, result);
    }
    }
);