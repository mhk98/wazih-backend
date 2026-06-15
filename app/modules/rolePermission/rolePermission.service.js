const ApiError = require("../../../error/ApiError");
const db = require("../../../models");
const {
  DEFAULT_ROLE_MENU_PERMISSIONS,
} = require("../../config/roleMenuPermissions");
const { ALL_MENU_PERMISSIONS } = require("../../enums/menuPermissions");
const { ENUM_USER_ROLE } = require("../../enums/user");

const RolePermission = db.rolePermission;

const validMenuPermissionSet = new Set(ALL_MENU_PERMISSIONS);
const protectedRoles = new Set([ENUM_USER_ROLE.SUPER_ADMIN]);

const uniq = (items = []) => [...new Set(items)];

const normalizeRole = (role) => String(role || "").trim();

const validateRoleName = (role) => {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    throw new ApiError(400, "Role is required");
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_-]{1,63}$/.test(normalizedRole)) {
    throw new ApiError(
      400,
      "Role must start with a letter and contain only letters, numbers, dash or underscore",
    );
  }
  return normalizedRole;
};

const isValidRole = (role) => Boolean(normalizeRole(role));

// Legacy permission keys used by older UI versions.
// Backend routes currently guard with "department_designation", so we treat these as equivalent.
const LEGACY_PERMISSION_ALIASES = {
  department_management: "department_designation",
  designation_management: "department_designation",
};

const expandLegacyPermissions = (permissions = []) => {
  const expanded = new Set(permissions);
  permissions.forEach((key) => {
    const mapped = LEGACY_PERMISSION_ALIASES[key];
    if (mapped) expanded.add(mapped);
  });
  return Array.from(expanded);
};

const sanitizePermission = (permission) => {
  if (typeof permission !== "string") {
    return permission;
  }

  return permission.trim().toLowerCase();
};

const normalizeMenuPermissions = (menuPermissions) => {
  if (Array.isArray(menuPermissions)) {
    if (
      menuPermissions.length === 1 &&
      typeof menuPermissions[0] === "string"
    ) {
      const onlyValue = menuPermissions[0].trim();
      if (onlyValue.startsWith("[") || onlyValue.startsWith("{")) {
        return normalizeMenuPermissions(onlyValue);
      }
    }

    return menuPermissions;
  }

  if (menuPermissions == null || menuPermissions === "") {
    return [];
  }

  if (typeof menuPermissions === "string") {
    try {
      const parsed = JSON.parse(menuPermissions);
      return normalizeMenuPermissions(parsed);
    } catch (error) {
      return [];
    }
  }

  if (typeof menuPermissions === "object") {
    return normalizeMenuPermissions(menuPermissions.menuPermissions);
  }

  return [];
};

const validateRole = (role) => {
  validateRoleName(role);
};

const ensureRoleExists = async (role) => {
  const normalizedRole = validateRoleName(role);
  const record = await RolePermission.findOne({ where: { role: normalizedRole } });
  if (!record) {
    throw new ApiError(400, "Invalid role");
  }
  return record;
};

const validateMenuPermissions = (menuPermissions) => {
  const normalizedPermissions = expandLegacyPermissions(
    normalizeMenuPermissions(menuPermissions).map(sanitizePermission),
  );

  if (!Array.isArray(normalizedPermissions)) {
    throw new ApiError(400, "menuPermissions must be an array");
  }

  const invalidPermissions = uniq(normalizedPermissions).filter(
    (permission) => !validMenuPermissionSet.has(permission),
  );

  if (invalidPermissions.length) {
    throw new ApiError(
      400,
      `Unknown menu permission(s): ${invalidPermissions.join(", ")}`,
    );
  }

  return uniq(normalizedPermissions);
};

const includeNewSettingsChildren = (role, permissions = []) => {
  const permissionSet = new Set(normalizeMenuPermissions(permissions));
  const defaults = DEFAULT_ROLE_MENU_PERMISSIONS[role] || [];

  if (
    permissionSet.has("settings") &&
    defaults.includes("notice") &&
    !permissionSet.has("notice")
  ) {
    permissionSet.add("notice");
  }

  if (defaults.includes("tasks") && !permissionSet.has("tasks")) {
    permissionSet.add("tasks");
  }

  if (defaults.includes("loan") && !permissionSet.has("loan")) {
    permissionSet.add("loan");
  }

  [
    "cod_change",
    "cod_charge",
    "delivery_advance",
    "delivery_charge",
    "ads_campaign_kpi",
    "auto_profit_loss",
    "stock_alert",
    "cs_work_reports",
    "logistic_work_reports",
    "employee_profile",
    "employee_kpi",
  ].forEach((permission) => {
    if (defaults.includes(permission) && !permissionSet.has(permission)) {
      permissionSet.add(permission);
    }
  });

  return Array.from(permissionSet);
};

const getDefaultPermissionsForRole = (role) => {
  const normalizedRole = validateRoleName(role);
  return uniq(DEFAULT_ROLE_MENU_PERMISSIONS[normalizedRole] || []);
};

const getEffectiveMenuPermissions = async (role) => {
  const normalizedRole = validateRoleName(role);

  const record = await RolePermission.findOne({
    where: { role: normalizedRole },
  });

  if (!record) {
    // Fallback to configured defaults when no explicit role-permission record exists.
    // This keeps the UI navigable out of the box and prevents empty permission sets.
    return validateMenuPermissions(getDefaultPermissionsForRole(normalizedRole));
  }

  return validateMenuPermissions(
    includeNewSettingsChildren(normalizedRole, record.menuPermissions || []),
  );
};

const getAllRolePermissions = async () => {
  const records = await RolePermission.findAll({
    order: [["createdAt", "ASC"], ["Id", "ASC"]],
  });

  return records.map((record) => ({
    Id: record.Id,
    role: record.role,
    menuPermissions: validateMenuPermissions(
      includeNewSettingsChildren(record.role, record.menuPermissions || []),
    ),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }));
};

const getRolePermissionByRole = async (role) => {
  const normalizedRole = validateRoleName(role);
  const record = await RolePermission.findOne({ where: { role: normalizedRole } });
  if (!record && !DEFAULT_ROLE_MENU_PERMISSIONS[normalizedRole]) {
    throw new ApiError(404, "Role not found");
  }
  return {
    Id: record?.Id,
    role: normalizedRole,
    menuPermissions: await getEffectiveMenuPermissions(normalizedRole),
  };
};

const updateRolePermissions = async (role, menuPermissions) => {
  const normalizedRole = validateRoleName(role);
  const normalizedPermissions = validateMenuPermissions(menuPermissions);

  await RolePermission.upsert({
    role: normalizedRole,
    menuPermissions: normalizedPermissions,
  });

  return getRolePermissionByRole(normalizedRole);
};

const createRolePermissions = async (payload = {}) => {
  const role = validateRoleName(payload.role);
  const exists = await RolePermission.findOne({ where: { role } });
  if (exists) throw new ApiError(409, "Role already exists");

  const menuPermissions = validateMenuPermissions(payload.menuPermissions || []);
  await RolePermission.create({ role, menuPermissions });
  return getRolePermissionByRole(role);
};

const deleteRolePermissions = async (role) => {
  const normalizedRole = validateRoleName(role);
  if (protectedRoles.has(normalizedRole)) {
    throw new ApiError(400, "This role cannot be deleted");
  }

  const assignedUsers = db.user
    ? await db.user.count({ where: { role: normalizedRole }, paranoid: true })
    : 0;
  if (assignedUsers > 0) {
    throw new ApiError(400, "Role is assigned to users and cannot be deleted");
  }

  const deleted = await RolePermission.destroy({ where: { role: normalizedRole } });
  if (!deleted) throw new ApiError(404, "Role not found");
  return { deleted: true };
};

const hasMenuPermission = (userPermissions = [], requiredPermission) => {
  const alias = LEGACY_PERMISSION_ALIASES[requiredPermission];
  return (
    userPermissions.includes(requiredPermission) ||
    (alias ? userPermissions.includes(alias) : false) ||
    // Also allow legacy keys to satisfy the canonical permission check.
    (requiredPermission === "department_designation" &&
      (userPermissions.includes("department_management") ||
        userPermissions.includes("designation_management"))) ||
    userPermissions.includes("*") ||
    requiredPermission === "*"
  );
};

module.exports = {
  getAllRolePermissions,
  getRolePermissionByRole,
  createRolePermissions,
  updateRolePermissions,
  deleteRolePermissions,
  getEffectiveMenuPermissions,
  getDefaultPermissionsForRole,
  validateMenuPermissions,
  validateRole,
  validateRoleName,
  ensureRoleExists,
  isValidRole,
  hasMenuPermission,
};
