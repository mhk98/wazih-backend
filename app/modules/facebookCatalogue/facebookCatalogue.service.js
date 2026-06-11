const db = require("../../../models");

const generateFeed = async () => {
  const products = await db.product.findAll({
    where: { status: "Active" },
    paranoid: true,
    order: [["Id", "ASC"]],
    include: [{ model: db.variation, as: "variations", required: false }],
  });

  const BASE = (process.env.ORIGIN_URL || process.env.FRONTEND_URL || "https://yourdomain.com").replace(/\/$/, "");

  const items = products.map((p) => {
    const plain = p.get({ plain: true });
    const firstVariation = plain.variations?.[0];
    const weight = firstVariation?.weight ? `${firstVariation.weight} ${firstVariation.unit || "g"}` : null;
    const availability = plain.status === "Active" ? "in stock" : "out of stock";

    return `
    <item>
      <g:id>${plain.Id}</g:id>
      <g:title><![CDATA[${plain.name}]]></g:title>
      <g:description><![CDATA[${plain.note || plain.name}]]></g:description>
      <g:link>${BASE}/product/${plain.Id}</g:link>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:sku>${plain.sku || `WZ-${plain.Id}`}</g:sku>${weight ? `\n      <g:shipping_weight>${weight}</g:shipping_weight>` : ""}
    </item>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Product Catalogue</title>
    <link>${BASE}</link>
    <description>Product feed for Facebook Catalogue</description>
    <language>en-us</language>
    ${items}
  </channel>
</rss>`;

  return { xml, count: products.length };
};

module.exports = { generateFeed };
