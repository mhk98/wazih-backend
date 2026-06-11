module.exports = (sequelize, DataTypes) => {
  const Brand = sequelize.define(
    "Brand",
    {
      Id: { type: DataTypes.INTEGER(10), primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },
      logo: { type: DataTypes.STRING(500), allowNull: true },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "Active" },
      deletedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { timestamps: true, paranoid: true }
  );
  return Brand;
};
