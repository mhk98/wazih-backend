const db = require("../db/db");
const { DataTypes } = require("sequelize");

// =====================
// Define models
// =====================

// Core
db.user = require("../app/modules/user/user.model")(db.sequelize, DataTypes);
db.rolePermission =
  require("../app/modules/rolePermission/rolePermission.model")(
    db.sequelize,
    DataTypes,
  );
db.userLogHistory =
  require("../app/modules/userLogHistory/userLogHistory.model")(
    db.sequelize,
    DataTypes,
  );

// Products
db.product = require("../app/modules/product/product.model")(
  db.sequelize,
  DataTypes,
);
db.variation = require("../app/modules/variation/variation.model")(
  db.sequelize,
  DataTypes,
);
db.category = require("../app/modules/category/category.model")(
  db.sequelize,
  DataTypes,
);
db.subcategory = require("../app/modules/subcategory/subcategory.model")(
  db.sequelize,
  DataTypes,
);
db.childcategory = require("../app/modules/childcategory/childcategory.model")(
  db.sequelize,
  DataTypes,
);
db.brand = require("../app/modules/brand/brand.model")(db.sequelize, DataTypes);
db.color = require("../app/modules/color/color.model")(db.sequelize, DataTypes);
db.attribute = require("../app/modules/attribute/attribute.model")(
  db.sequelize,
  DataTypes,
);
db.review = require("../app/modules/review/review.model")(
  db.sequelize,
  DataTypes,
);

// Supplier
db.supplier = require("../app/modules/supplier/supplier.model")(
  db.sequelize,
  DataTypes,
);
db.supplierHistory =
  require("../app/modules/supplierHistory/supplierHistory.model")(
    db.sequelize,
    DataTypes,
  );

// Purchase
db.purchaseRequisition =
  require("../app/modules/purchaseRequision/purchaseRequisition.model")(
    db.sequelize,
    DataTypes,
  );

// Orders
db.order = require("../app/modules/order/order.model")(db.sequelize, DataTypes);

// Charge Settings (4 sub-models)
db.codCharge = require("../app/modules/chargeSetting/codCharge.model")(
  db.sequelize,
  DataTypes,
);
db.codChange = require("../app/modules/chargeSetting/codChange.model")(
  db.sequelize,
  DataTypes,
);
db.deliveryCharge =
  require("../app/modules/chargeSetting/deliveryCharge.model")(
    db.sequelize,
    DataTypes,
  );
db.deliveryAdvance =
  require("../app/modules/chargeSetting/deliveryAdvance.model")(
    db.sequelize,
    DataTypes,
  );

// Website / Settings
db.ipBlock = require("../app/modules/ipBlock/ipBlock.model")(
  db.sequelize,
  DataTypes,
);
db.siteSetting = require("../app/modules/siteSetting/siteSetting.model")(
  db.sequelize,
  DataTypes,
);
db.orderStatus = require("../app/modules/orderStatus/orderStatus.model")(
  db.sequelize,
  DataTypes,
);
db.websitePage = require("../app/modules/websitePage/websitePage.model")(
  db.sequelize,
  DataTypes,
);

// Marketing / API
db.tagManager = require("../app/modules/tagManager/tagManager.model")(
  db.sequelize,
  DataTypes,
);
db.facebookPixel = require("../app/modules/facebookPixel/facebookPixel.model")(
  db.sequelize,
  DataTypes,
);
db.tiktokPixel = require("../app/modules/tiktokPixel/tiktokPixel.model")(
  db.sequelize,
  DataTypes,
);
db.googleAds = require("../app/modules/googleAds/googleAds.model")(
  db.sequelize,
  DataTypes,
);
db.bannerCategory =
  require("../app/modules/bannerCategory/bannerCategory.model")(
    db.sequelize,
    DataTypes,
  );
db.banner = require("../app/modules/banner/banner.model")(
  db.sequelize,
  DataTypes,
);
db.couponCode = require("../app/modules/couponCode/couponCode.model")(
  db.sequelize,
  DataTypes,
);
db.visitorStat = require("../app/modules/visitorStat/visitorStat.model")(
  db.sequelize,
  DataTypes,
);
db.landingPage = require("../app/modules/landingPage/landingPage.model")(
  db.sequelize,
  DataTypes,
);

// =====================
// Associations
// =====================

// Product <-> Variation
db.product.hasMany(db.variation, { foreignKey: "productId", as: "variations" });
db.variation.belongsTo(db.product, { foreignKey: "productId", as: "product" });

// Supplier <-> SupplierHistory
db.supplier.hasMany(db.supplierHistory, { foreignKey: "supplierId" });
db.supplierHistory.belongsTo(db.supplier, {
  foreignKey: "supplierId",
  as: "supplier",
});

// Banner <-> BannerCategory
db.bannerCategory.hasMany(db.banner, {
  foreignKey: "categoryId",
  as: "banners",
});
db.banner.belongsTo(db.bannerCategory, {
  foreignKey: "categoryId",
  as: "category",
});

// Supplier <-> PurchaseRequisition
db.supplier.hasMany(db.purchaseRequisition, { foreignKey: "supplierId" });
db.purchaseRequisition.belongsTo(db.supplier, {
  foreignKey: "supplierId",
  as: "supplier",
});

// =====================
// Sync helpers
// =====================

const ensureUserRoleColumn = async () => {
  const queryInterface = db.sequelize.getQueryInterface();
  const tableName = db.user.getTableName();
  const tableDefinition = await queryInterface.describeTable(tableName);
  const definition = {
    type: DataTypes.STRING(64),
    allowNull: true,
    defaultValue: "user",
  };
  if (!tableDefinition.role) {
    await queryInterface.addColumn(tableName, "role", definition);
    return;
  }
  await queryInterface.changeColumn(tableName, "role", definition);
};

const ensureUserStatusColumn = async () => {
  const queryInterface = db.sequelize.getQueryInterface();
  const tableName = db.user.getTableName();
  const tableDefinition = await queryInterface.describeTable(tableName);
  if (!tableDefinition.status) {
    await queryInterface.addColumn(tableName, "status", {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "Active",
    });
  }
  await db.sequelize.query(
    `UPDATE \`${tableName}\` SET status = 'Active' WHERE status IS NULL OR TRIM(status) = ''`,
  );
};

const ensureUserDocumentColumns = async () => {
  const queryInterface = db.sequelize.getQueryInterface();
  const tableName = db.user.getTableName();
  const tableDefinition = await queryInterface.describeTable(tableName);
  const maybeAddColumn = async (columnName) => {
    if (!tableDefinition[columnName]) {
      await queryInterface.addColumn(tableName, columnName, {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }
  };
  await maybeAddColumn("idCard");
  await maybeAddColumn("cv");
  await maybeAddColumn("guardianPhoto");
  await maybeAddColumn("guardianIdCard");
};

const ensureSupplierStatusNoteColumns = async () => {
  const queryInterface = db.sequelize.getQueryInterface();
  const tableName = db.supplier.getTableName();
  const tableDefinition = await queryInterface.describeTable(tableName);
  if (!tableDefinition.note) {
    await queryInterface.addColumn(tableName, "note", {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!tableDefinition.status) {
    await queryInterface.addColumn(tableName, "status", {
      type: DataTypes.STRING(32),
      allowNull: true,
      defaultValue: "Active",
    });
  }
};

const ensureProductStatusNoteColumns = async () => {
  const queryInterface = db.sequelize.getQueryInterface();
  const tableName = db.product.getTableName();
  const tableDefinition = await queryInterface.describeTable(tableName);
  if (!tableDefinition.note) {
    await queryInterface.addColumn(tableName, "note", {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!tableDefinition.status) {
    await queryInterface.addColumn(tableName, "status", {
      type: DataTypes.STRING(32),
      allowNull: true,
      defaultValue: "Active",
    });
  }
};

const ensureCategoryFrontendColumns = async () => {
  const queryInterface = db.sequelize.getQueryInterface();
  const tableName = db.category.getTableName();
  const tableDefinition = await queryInterface.describeTable(tableName);
  const maybeAdd = async (columnName, definition) => {
    if (!tableDefinition[columnName]) {
      await queryInterface.addColumn(tableName, columnName, definition);
    }
  };

  await maybeAdd("status", {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: "Active",
  });
  await maybeAdd("imageFile", {
    type: DataTypes.TEXT("long"),
    allowNull: true,
  });
  await maybeAdd("image", { type: DataTypes.TEXT("long"), allowNull: true });
  await maybeAdd("bannerImage", {
    type: DataTypes.TEXT("long"),
    allowNull: true,
  });
  await maybeAdd("sortOrder", { type: DataTypes.INTEGER(10), allowNull: true });
  await maybeAdd("isActive", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });
  await maybeAdd("frontView", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });
  await maybeAdd("metaTitle", { type: DataTypes.STRING, allowNull: true });
  await maybeAdd("metaDescription", { type: DataTypes.TEXT, allowNull: true });
};

const ensurePurchaseRequisitionItemsColumn = async () => {
  const queryInterface = db.sequelize.getQueryInterface();
  const tableName = db.purchaseRequisition.getTableName();
  const tableDefinition = await queryInterface.describeTable(tableName);
  if (!tableDefinition.items) {
    await queryInterface.addColumn(tableName, "items", {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    });
  }
};

const ensurePurchaseRequisitionExtraColumns = async () => {
  const queryInterface = db.sequelize.getQueryInterface();
  const tableName = db.purchaseRequisition.getTableName();
  const tableDefinition = await queryInterface.describeTable(tableName);
  const maybeAdd = async (columnName, definition) => {
    if (!tableDefinition[columnName]) {
      await queryInterface.addColumn(tableName, columnName, definition);
    }
  };
  await maybeAdd("productId", { type: DataTypes.INTEGER(10), allowNull: true });
  await maybeAdd("assetId", { type: DataTypes.INTEGER(10), allowNull: true });
  await maybeAdd("bookId", { type: DataTypes.INTEGER(10), allowNull: true });
  await maybeAdd("file", { type: DataTypes.STRING, allowNull: true });
  await maybeAdd("paymentMode", { type: DataTypes.STRING, allowNull: true });
  await maybeAdd("bankName", { type: DataTypes.STRING, allowNull: true });
  await maybeAdd("bankAccount", { type: DataTypes.INTEGER, allowNull: true });
};

const ensureLandingPageContentColumns = async () => {
  const queryInterface = db.sequelize.getQueryInterface();
  const tableName = db.landingPage.getTableName();
  const tableDefinition = await queryInterface.describeTable(tableName);
  const maybeAdd = async (columnName, definition) => {
    if (!tableDefinition[columnName]) {
      await queryInterface.addColumn(tableName, columnName, definition);
    }
  };
  const maybeChange = async (columnName, definition) => {
    if (tableDefinition[columnName]) {
      await queryInterface.changeColumn(tableName, columnName, definition);
    }
  };

  await maybeAdd("productId", { type: DataTypes.INTEGER(10), allowNull: true });
  await maybeAdd("product", { type: DataTypes.STRING, allowNull: true });
  await maybeAdd("title", { type: DataTypes.STRING, allowNull: false });
  await maybeAdd("subTitle", { type: DataTypes.STRING, allowNull: true });
  await maybeAdd("bannerImageUrl", {
    type: DataTypes.TEXT("long"),
    allowNull: true,
  });
  await maybeAdd("prizeImageUrl", {
    type: DataTypes.TEXT("long"),
    allowNull: true,
  });
  await maybeAdd("reviewImages", {
    type: DataTypes.TEXT("long"),
    allowNull: true,
  });
  await maybeAdd("shortDescription", { type: DataTypes.TEXT, allowNull: true });
  await maybeAdd("video", { type: DataTypes.STRING(500), allowNull: true });
  await maybeAdd("reviewTitle", { type: DataTypes.STRING, allowNull: true });
  await maybeAdd("descriptionTitle", {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await maybeAdd("description", { type: DataTypes.TEXT, allowNull: true });
  await maybeAdd("whyChooseTitle", { type: DataTypes.STRING, allowNull: true });
  await maybeAdd("whyChooseUs", { type: DataTypes.TEXT, allowNull: true });
  await maybeAdd("price", { type: DataTypes.DECIMAL(10, 2), allowNull: true });
  await maybeAdd("originalPrice", {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  });
  await maybeAdd("phone", { type: DataTypes.STRING, allowNull: true });
  await maybeAdd("template", { type: DataTypes.STRING, allowNull: true });
  await maybeAdd("countdown", { type: DataTypes.STRING(64), allowNull: true });
  await maybeAdd("status", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });
  await maybeAdd("deletedAt", { type: DataTypes.DATE, allowNull: true });

  await maybeChange("bannerImageUrl", {
    type: DataTypes.TEXT("long"),
    allowNull: true,
  });
  await maybeChange("prizeImageUrl", {
    type: DataTypes.TEXT("long"),
    allowNull: true,
  });
  await maybeChange("reviewImages", {
    type: DataTypes.TEXT("long"),
    allowNull: true,
  });
};

const ensureOrderIpAddressColumn = async () => {
  const queryInterface = db.sequelize.getQueryInterface();
  const tableName = db.order.getTableName();
  const tableDefinition = await queryInterface.describeTable(tableName);
  if (!tableDefinition.ipAddress) {
    await queryInterface.addColumn(tableName, "ipAddress", {
      type: DataTypes.STRING(128),
      allowNull: true,
    });
  }
};

const ensureOrderStatusColumn = async () => {
  const queryInterface = db.sequelize.getQueryInterface();
  const tableName = db.order.getTableName();
  const tableDefinition = await queryInterface.describeTable(tableName);
  if (!tableDefinition.status) {
    await queryInterface.addColumn(tableName, "status", {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: "pending",
    });
    return;
  }
  await queryInterface.changeColumn(tableName, "status", {
    type: DataTypes.STRING(64),
    allowNull: false,
    defaultValue: "pending",
  });
};

const svgDataUrl = (svg) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;

const campaignImage = (accent, title, subtitle) =>
  svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#17110b"/>
          <stop offset="0.55" stop-color="#4a2d12"/>
          <stop offset="1" stop-color="${accent}"/>
        </linearGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="12" stdDeviation="18" flood-opacity=".45"/></filter>
      </defs>
      <rect width="1200" height="620" fill="url(#bg)"/>
      <circle cx="980" cy="120" r="210" fill="#ffffff" opacity=".08"/>
      <circle cx="160" cy="500" r="230" fill="#f59e0b" opacity=".08"/>
      <g fill="none" stroke="#f8d98b" stroke-opacity=".25" stroke-width="3">
        <path d="M60 120h1080M60 500h1080M180 60v500M1020 60v500"/>
      </g>
      <g filter="url(#shadow)">
        <rect x="690" y="130" width="380" height="280" rx="18" fill="#f8fafc"/>
        <rect x="720" y="160" width="52" height="160" rx="16" fill="#111827"/>
        <rect x="790" y="145" width="52" height="175" rx="16" fill="#92400e"/>
        <rect x="860" y="160" width="52" height="160" rx="16" fill="#991b1b"/>
        <rect x="930" y="145" width="52" height="175" rx="16" fill="#065f46"/>
        <rect x="1000" y="160" width="42" height="160" rx="14" fill="#1e3a8a"/>
        <rect x="745" y="350" width="260" height="34" rx="17" fill="${accent}"/>
      </g>
      <text x="90" y="165" fill="#fff7ed" font-family="Arial, sans-serif" font-size="48" font-weight="800">${title}</text>
      <text x="90" y="245" fill="#fde047" font-family="Arial, sans-serif" font-size="78" font-weight="900">Special Offer</text>
      <text x="90" y="315" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="700">${subtitle}</text>
      <rect x="90" y="365" width="310" height="70" rx="12" fill="${accent}"/>
      <text x="125" y="411" fill="#ffffff" font-family="Arial, sans-serif" font-size="28" font-weight="800">Order Now</text>
    </svg>
  `);

const prizeImage = (accent, title) =>
  svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620">
      <defs>
        <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#7dd3fc"/>
          <stop offset=".55" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#c7d2fe"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="620" fill="url(#sky)"/>
      <circle cx="1010" cy="110" r="88" fill="#fff" opacity=".8"/>
      <rect x="125" y="170" width="280" height="330" rx="28" fill="#ef4444"/>
      <rect x="155" y="210" width="220" height="70" rx="16" fill="#f59e0b"/>
      <text x="182" y="258" fill="#fff" font-size="32" font-family="Arial" font-weight="900">SCRATCH</text>
      <text x="155" y="360" fill="#fff" font-size="46" font-family="Arial" font-weight="900">PRIZE CARD</text>
      <path d="M520 390 C610 270, 770 260, 870 380 L1030 382 L1045 430 L520 430 Z" fill="${accent}"/>
      <circle cx="610" cy="430" r="72" fill="#111827"/>
      <circle cx="610" cy="430" r="38" fill="#64748b"/>
      <circle cx="930" cy="430" r="72" fill="#111827"/>
      <circle cx="930" cy="430" r="38" fill="#64748b"/>
      <path d="M670 320 H830 L890 385 H620 Z" fill="#1d4ed8"/>
      <text x="520" y="150" fill="#1e3a8a" font-size="58" font-family="Arial" font-weight="900">${title}</text>
      <text x="520" y="210" fill="#ef4444" font-size="36" font-family="Arial" font-weight="800">Win exciting campaign rewards</text>
    </svg>
  `);

const reviewImage = (accent, name) =>
  svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
      <rect width="480" height="360" rx="24" fill="#fff7ed"/>
      <rect x="24" y="24" width="432" height="250" rx="22" fill="${accent}" opacity=".18"/>
      <circle cx="160" cy="130" r="55" fill="${accent}"/>
      <circle cx="295" cy="130" r="55" fill="#111827"/>
      <rect x="95" y="190" width="275" height="42" rx="21" fill="#ffffff"/>
      <rect x="0" y="255" width="480" height="105" fill="#111827" opacity=".88"/>
      <text x="240" y="310" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="28" font-weight="900">${name}</text>
      <text x="240" y="337" text-anchor="middle" fill="#facc15" font-family="Arial" font-size="18" font-weight="700">Campaign Winner</text>
    </svg>
  `);

const seedDefaultLandingPages = async () => {
  const products = await db.product.findAll({
    attributes: ["Id", "name"],
    limit: 2,
    order: [["Id", "ASC"]],
  });

  const firstProduct = products[0]?.get({ plain: true });
  const secondProduct = products[1]?.get({ plain: true }) || firstProduct;

  const landingPages = [
    {
      productId: firstProduct?.Id || null,
      product: firstProduct?.name || "Attar & Perfume Combo Pack",
      title: "আতর পারফিউম কম্বো অফার",
      subTitle: "৫ পিস আতর, ৫ পিস পারফিউম এবং কাবাস কিসওয়াহ ফ্রি",
      bannerImageUrl: campaignImage(
        "#0f766e",
        "Attar Perfume Combo",
        "5 pcs attar + 5 pcs perfume",
      ),
      prizeImageUrl: prizeImage("#2563eb", "R15 Dream Campaign"),
      reviewImages: JSON.stringify([
        reviewImage("#dc2626", "রাকিবুল ইসলাম"),
        reviewImage("#2563eb", "ফারহানা তানিয়া"),
        reviewImage("#16a34a", "মোঃ রনি"),
        reviewImage("#f97316", "মাহিয়া ইমরান"),
      ]),
      shortDescription:
        "এই ক্যাম্পেইনে পাচ্ছেন প্রিমিয়াম আতর ও পারফিউম কম্বো। প্রতিটি সুগন্ধি দৈনন্দিন ব্যবহার, নামাজ, অফিস এবং গিফটের জন্য উপযোগী। দীর্ঘস্থায়ী ঘ্রাণ, সুন্দর প্যাকেজিং এবং ক্যাশ অন ডেলিভারির সুবিধা থাকছে।",
      video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      reviewTitle: "আগের ক্যাম্পেইনের বিজয়ীরা",
      descriptionTitle: "আতর পারফিউম কম্বো কেন নিবেন",
      description:
        "এক প্যাকের মধ্যে বিভিন্ন ঘ্রাণের আতর ও পারফিউম থাকায় নিজের জন্য ব্যবহার করা যায়, আবার প্রিয়জনকে উপহারও দেওয়া যায়। অল্প দামে premium fragrance collection নেওয়ার জন্য এই offer তৈরি করা হয়েছে।",
      whyChooseTitle: "Wazih থেকে কেন কিনবেন",
      whyChooseUs:
        "আমরা authentic product, দ্রুত delivery, সহজ return support এবং trusted customer service দিয়ে থাকি। অর্ডার করার পর customer support team আপনার সাথে confirm করবে।",
      price: 699,
      originalPrice: 1500,
      phone: "+8808647-222899",
      template: "Template Design 1",
      countdown: "2026-08-31 23:59:59",
      status: true,
    },
    {
      productId: secondProduct?.Id || null,
      product: secondProduct?.name || "Luxury Oud Gift Set",
      title: "লাক্সারি ওউদ গিফট ক্যাম্পেইন",
      subTitle: "ওউদ, আতর এবং gift-ready premium fragrance set",
      bannerImageUrl: campaignImage(
        "#7c2d12",
        "Luxury Oud Gift Set",
        "Premium gift-ready fragrance",
      ),
      prizeImageUrl: prizeImage("#7c3aed", "Gift Reward Campaign"),
      reviewImages: JSON.stringify([
        reviewImage("#7c3aed", "সোহাগ হোসেন"),
        reviewImage("#0891b2", "সেলিম উদ্দিন"),
        reviewImage("#be123c", "আসিফ মাহমুদ"),
        reviewImage("#ca8a04", "রবিন হাসান"),
      ]),
      shortDescription:
        "লাক্সারি ওউদ গিফট সেটে থাকছে premium oud fragrance, elegant packaging এবং long-lasting performance। যারা premium gift বা নিজের collection-এর জন্য মানসম্মত perfume চান তাদের জন্য এই campaign।",
      video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      reviewTitle: "Customer Review Gallery",
      descriptionTitle: "Campaign details",
      description:
        "এই set টি festive gift, corporate gift এবং personal use-এর জন্য perfect। strong oud note, smooth finish এবং premium bottle design একসাথে পাওয়া যাচ্ছে campaign price-এ।",
      whyChooseTitle: "Customer benefits",
      whyChooseUs:
        "প্রতিটি order quality check করে পাঠানো হয়। ঢাকার ভিতরে দ্রুত delivery, ঢাকার বাইরে courier delivery এবং cash on delivery সুবিধা আছে।",
      price: 1299,
      originalPrice: 2200,
      phone: "+8808647-222899",
      template: "Template Design 2",
      countdown: "2026-12-31 23:59:59",
      status: true,
    },
  ];

  const existing = await db.landingPage.findAll({
    attributes: ["Id", "title"],
    paranoid: true,
    raw: true,
  });
  const oldSeedTitles = [
    "Dynamic Summer Sale Campaign",
    "Dynamic Eid Special Offer",
    "Summer Sale Campaign",
    "Eid Special Offer",
    "New Year Mega Deal",
  ];
  const newSeedTitles = landingPages.map((page) => page.title);
  const hasOnlySeedRows =
    existing.length === 0 ||
    existing.every(
      (row) =>
        oldSeedTitles.includes(row.title) || newSeedTitles.includes(row.title),
    );

  if (hasOnlySeedRows) {
    await db.landingPage.destroy({ where: {}, force: true });
    await db.landingPage.bulkCreate(landingPages);
    return;
  }

  await Promise.all(
    landingPages.map((page) =>
      db.landingPage.findOrCreate({
        where: { title: page.title },
        defaults: page,
      }),
    ),
  );
};

const seedDefaultWebsitePages = async () => {
  const pages = [
    {
      name: "About Us",
      title: "About Us",
      description:
        "<p>Welcome to Kafela Mart. We are committed to delivering trusted products, smooth shopping, and friendly customer support across Bangladesh.</p><p>Our team checks every order carefully and works to make online shopping simple, reliable, and affordable for every customer.</p>",
      status: "Active",
    },
    {
      name: "How To order",
      title: "How To order",
      description:
        "<p>Choose your product, add it to cart, and go to checkout. Fill in your name, phone number, address, and district, then confirm your order.</p><p>After placing the order, our support team may contact you for confirmation. You can also track your order from the Order Track page using your invoice ID or phone number.</p>",
      status: "Active",
    },
    {
      name: "Privacy Policy",
      title: "Privacy Policy",
      description:
        "<p>We respect your privacy. Customer information such as name, phone number, address, and order details is used only to process orders, provide support, and improve our service.</p><p>We do not sell customer personal information to third parties. Necessary information may be shared with delivery or payment partners only for completing your order.</p>",
      status: "Active",
    },
    {
      name: "Terms & Conditions",
      title: "শর্তাবলি (Terms & Conditions)",
      description:
        '<p class="policy-intro">এই ওয়েবসাইট ব্যবহার এবং আমাদের কাছ থেকে পণ্য/সেবা গ্রহণের মাধ্যমে আপনি আমাদের শর্তাবলি, নীতিমালা এবং ব্যবহার সংক্রান্ত নিয়মাবলি মেনে চলতে সম্মত হচ্ছেন। অনুগ্রহ করে অর্ডার করার আগে শর্তগুলো মনোযোগ দিয়ে পড়ুন।</p><section class="policy-section"><h2><span class="policy-step">১.</span><span class="policy-icon">📦</span> পণ্য ও অর্ডার</h2><ul><li>আমাদের ওয়েবসাইটে থাকা পণ্যের ছবি, রং, সাইজ বা বিবরণ বাস্তব পণ্যের সাথে সামান্য ভিন্ন হতে পারে।</li><li>অর্ডার করার সময় সঠিক নাম, ফোন নম্বর, ঠিকানা এবং জেলা প্রদান করা customer-এর দায়িত্ব।</li><li>স্টক, মূল্য, অফার বা delivery charge যেকোনো সময় পরিবর্তন হতে পারে।</li><li>ভুল তথ্য, সন্দেহজনক activity বা unavailable product হলে order confirm, hold বা cancel করার অধিকার আমাদের থাকবে।</li></ul></section><section class="policy-section"><h2><span class="policy-step">২.</span><span class="policy-icon">💳</span> মূল্য ও পেমেন্ট</h2><ul><li>পণ্যের মূল্য website বা checkout page-এ প্রদর্শিত price অনুযায়ী গণনা করা হবে।</li><li>Cash on Delivery, bKash, Nagad বা অন্যান্য available payment method ব্যবহার করা যাবে।</li><li>Payment করার সময় transaction number/proof সংরক্ষণ করা customer-এর দায়িত্ব।</li><li>ভুল payment, partial payment বা payment verification issue হলে order processing বিলম্ব হতে পারে।</li></ul></section><section class="policy-section"><h2><span class="policy-step">৩.</span><span class="policy-icon">🚚</span> শিপিং ও ডেলিভারি</h2><ul><li>Delivery charge admin panel-এ নির্ধারিত shipping charge অনুযায়ী প্রযোজ্য হবে।</li><li>Delivery time location, courier service এবং product availability অনুযায়ী পরিবর্তিত হতে পারে।</li><li>Customer unavailable থাকলে বা ভুল address/phone number দিলে পুনরায় delivery charge প্রযোজ্য হতে পারে।</li></ul></section><section class="policy-section"><h2><span class="policy-step">৪.</span><span class="policy-icon">🔐</span> গোপনীয়তা নীতি</h2><ul><li>Customer-এর personal information order process, delivery, payment verification এবং support-এর জন্য ব্যবহার করা হয়।</li><li>আমরা customer data বিক্রি করি না; প্রয়োজনীয় ক্ষেত্রে delivery/payment partner-এর সাথে সীমিত তথ্য share করা হতে পারে।</li><li>Website ব্যবহার করলে আপনি আমাদের Privacy Policy মেনে নিচ্ছেন।</li></ul></section><section class="policy-section"><h2><span class="policy-step">৫.</span><span class="policy-icon">⚖️</span> ব্যবহারের বিধিনিষেধ</h2><ul><li>ভুয়া order, ভুল তথ্য, spam বা fraudulent activity গ্রহণযোগ্য নয়।</li><li>Website বা system-এর কোনো ক্ষতি, misuse বা unauthorized access করার চেষ্টা নিষিদ্ধ।</li><li>Company প্রয়োজন মনে করলে customer account, order বা access সীমিত করতে পারে।</li></ul></section><section class="policy-section"><h2><span class="policy-step">৬.</span><span class="policy-icon">🔄</span> পরিবর্তন ও সংশোধন</h2><ul><li>আমরা যেকোনো সময় এই Terms & Conditions পরিবর্তন, সংশোধন বা update করার অধিকার রাখি।</li><li>পরিবর্তিত terms website-এ প্রকাশের পর থেকে কার্যকর হবে।</li><li>পরিবর্তনের পর website ব্যবহার করলে updated terms গ্রহণ করেছেন বলে গণ্য হবে।</li></ul></section><section class="policy-section"><h2><span class="policy-step">৭.</span><span class="policy-icon">📍</span> যোগাযোগ</h2><ul><li>এই শর্তাবলি সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের support team-এর সাথে যোগাযোগ করুন।</li></ul></section>',
      status: "Active",
    },
    {
      name: "Refund & Return Policy",
      title: "Refund & Return Policy (রিফান্ড ও রিটার্ন নীতিমালা)",
      description:
        '<p class="policy-intro">Sellpixer-এ আপনার সন্তুষ্টিই আমাদের প্রধান লক্ষ্য। কোনো কারণে আপনি যদি প্রোডাক্টটি নিয়ে সন্তুষ্ট না হন বা পণ্যে কোনো সমস্যা থাকে, তাহলে নিচের নীতিমালা অনুযায়ী রিটার্ন ও রিফান্ড প্রক্রিয়া সম্পন্ন করা হবে।</p><section class="policy-section"><h2><span class="policy-icon">🔄</span> পণ্য ফেরতের নীতিমালা:</h2><h3>যেসব ক্ষেত্রে পণ্য ফেরতযোগ্য:</h3><p>আপনি যদি ভুল পণ্য পেয়ে থাকেন বা অর্ডারকৃত পণ্যের ভিন্ন কোনো পণ্য পেয়ে থাকেন।</p><h3>ফেরতের শর্তাবলি:</h3><ul><li>পণ্যটি ব্যবহার করা হয়নি, ক্ষতিগ্রস্ত নয় এবং original packaging থাকতে হবে।</li><li>পণ্য গ্রহণের পর ২৪ ঘণ্টার মধ্যে রিটার্নের জন্য আমাদের অবহিত করতে হবে।</li><li>ফেরত পাঠানোর সময় invoice বা প্রয়োজনীয় proof সঙ্গে সংযুক্ত রাখতে হবে।</li></ul><h3>ফেরত প্রক্রিয়া:</h3><ul><li>আমাদের customer support team-এর সাথে যোগাযোগ করুন।</li><li>পণ্যের ছবি ও সমস্যার বিস্তারিত পাঠান।</li><li>যাচাই সম্পন্ন হলে return process শুরু করা হবে।</li></ul></section><section class="policy-section"><h2><span class="policy-icon">💰</span> রিফান্ড নীতিমালা:</h2><h3>রিফান্ডের ধরন:</h3><ul><li>রিটার্ন করা পণ্য যাচাই-বাছাইয়ের পর refund approval দেওয়া হবে।</li><li>বিকাশ/নগদ/ব্যাংক অথবা যেই মাধ্যমে payment করা হয়েছে, সেই মাধ্যমে refund করা হবে।</li></ul><h3>যেসব ক্ষেত্রে রিফান্ড প্রযোজ্য নয়:</h3><ul><li>পণ্য ব্যবহার বা ক্ষতিগ্রস্ত করার পর।</li><li>অর্ডার নিশ্চিত হওয়ার পরে customer mind change করলে।</li><li>ডেলিভারির সময় customer অনুপস্থিত থাকলে বা ভুল address/phone number প্রদান করলে delivery charge প্রযোজ্য হতে পারে।</li></ul></section><section class="policy-section"><h2><span class="policy-icon">📦</span> বিশেষ নির্দেশনা:</h2><ul><li><strong>রিটার্নের সময়সীমা:</strong> পণ্য হাতে পাওয়ার পর ২৪ ঘণ্টার মধ্যে অভিযোগ জানাতে হবে।</li><li><strong>রিফান্ডের সময়সীমা:</strong> verification সম্পন্ন হওয়ার পর ৭ কার্যদিবসের মধ্যে refund process করা হবে।</li><li><strong>কুরিয়ার চার্জ:</strong> seller-side issue হলে charge আমরা বহন করবো, অন্য ক্ষেত্রে courier charge customer-এর দায়িত্বে থাকতে পারে।</li></ul></section><p class="policy-note">ধন্যবাদ Sellpixer-এর সাথে থাকার জন্য। আপনার সন্তুষ্টি আমাদের অগ্রাধিকার। কোনো সমস্যায় আমাদের support team-এর সাথে যোগাযোগ করুন।</p>',
      status: "Active",
    },
  ];

  await Promise.all(
    pages.map((page) =>
      db.websitePage.findOrCreate({
        where: { name: page.name },
        defaults: page,
      }),
    ),
  );
};

const seedDefaultBannerCategories = async () => {
  if (!db.bannerCategory) return;

  const categories = [
    { name: "Nazmul Hasan", sortOrder: 1 },
    { name: "Welcome to Sellpixer", sortOrder: 2 },
    { name: "Popup Banner", sortOrder: 3 },
    { name: "Slider Right (375px X 175px)", sortOrder: 4 },
    { name: "Main Slider (775px x 400px)", sortOrder: 5 },
  ];

  await Promise.all(
    categories.map((category) =>
      db.bannerCategory.findOrCreate({
        where: { name: category.name },
        defaults: { ...category, status: "Active" },
      }),
    ),
  );
};

// =====================
// Sync
// =====================

db.sequelize
  .sync({ force: false })
  .then(async () => {
    await ensureUserRoleColumn();
    await ensureUserStatusColumn();
    await ensureUserDocumentColumns();
    await ensureSupplierStatusNoteColumns();
    await ensureProductStatusNoteColumns();
    await ensureCategoryFrontendColumns();
    await ensurePurchaseRequisitionItemsColumn();
    await ensurePurchaseRequisitionExtraColumns();
    await ensureOrderIpAddressColumn();
    await ensureOrderStatusColumn();
    await ensureLandingPageContentColumns();
    await seedDefaultLandingPages();
    await seedDefaultWebsitePages();
    await seedDefaultBannerCategories();

    // Initialize default role permissions
    const {
      DEFAULT_ROLE_MENU_PERMISSIONS,
    } = require("../app/config/roleMenuPermissions");

    const normalizePermissionList = (permissions) => {
      if (Array.isArray(permissions)) return permissions;
      if (!permissions) return [];
      if (typeof permissions === "string") {
        try {
          return normalizePermissionList(JSON.parse(permissions));
        } catch {
          return [];
        }
      }
      if (typeof permissions === "object")
        return normalizePermissionList(permissions.menuPermissions);
      return [];
    };

    await Promise.all(
      Object.entries(DEFAULT_ROLE_MENU_PERMISSIONS).map(
        async ([role, menuPermissions]) => {
          await db.rolePermission.findOrCreate({
            where: { role },
            defaults: { role, menuPermissions },
          });
        },
      ),
    );

    console.log("Connection re-synced successfully");
  })
  .catch((err) => console.error("Error on re-sync:", err));

module.exports = db;
