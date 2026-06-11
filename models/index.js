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
db.couponCode = require("../app/modules/couponCode/couponCode.model")(
  db.sequelize,
  DataTypes,
);
db.visitorStat = require("../app/modules/visitorStat/visitorStat.model")(
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
  const roleValues = [
    "superAdmin",
    "admin",
    "marketer",
    "leader",
    "inventor",
    "accountant",
    "logistics",
    "up",
    "cs",
    "staff",
    "employee",
    "user",
  ];
  const definition = {
    type: DataTypes.ENUM(...roleValues),
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
    await ensurePurchaseRequisitionItemsColumn();
    await ensurePurchaseRequisitionExtraColumns();

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
