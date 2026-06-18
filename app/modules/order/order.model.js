module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "Order",
    {
      Id: {
        type: DataTypes.INTEGER(10),
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      orderId: {
        type: DataTypes.STRING(32),
        allowNull: false,
        unique: true,
      },
      customerName: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      customerPhone: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      ipAddress: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      customerArea: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      customerDistrict: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      productName: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      productImage: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      quantity: {
        type: DataTypes.INTEGER(10),
        allowNull: false,
        defaultValue: 1,
      },
      totalBill: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      advance: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
      },
      courier: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "pending",
      },
      fraudScore: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      orderDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      paranoid: true,
    }
  );

  return Order;
};
