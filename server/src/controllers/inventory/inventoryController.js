const { Inventory } = require("../../../models");

const CATEGORY_MAP = {
  linen: "linen",
  Linen: "linen",
  toiletries: "toiletries",
  Toiletries: "toiletries",
  food: "food",
  Food: "food",
  cleaning: "cleaning",
  Cleaning: "cleaning",
  maintenance: "maintenance",
  Maintenance: "maintenance",
  beverage: "beverage",
  Beverage: "beverage",
};

function categoryLabel(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function normalizeInventoryPayload(payload = {}) {
  const itemName = payload.item_name ?? payload.name;
  const normalized = {
    item_name: typeof itemName === "string" ? itemName.trim() : itemName,
    category: CATEGORY_MAP[payload.category] || payload.category,
    quantity: payload.quantity === "" || payload.quantity === undefined ? undefined : Number(payload.quantity),
    unit: typeof payload.unit === "string" ? payload.unit.trim() : payload.unit,
    reorder_level: payload.reorder_level === "" || payload.reorder_level === undefined
      ? undefined
      : Number(payload.reorder_level),
    supplier: typeof payload.supplier === "string" ? payload.supplier.trim() : payload.supplier,
    cost_per_unit: payload.cost_per_unit === "" || payload.cost_per_unit === undefined
      ? undefined
      : Number(payload.cost_per_unit),
    updated_by_staff_id: payload.updated_by_staff_id,
  };

  if (normalized.category && !Object.values(CATEGORY_MAP).includes(normalized.category)) {
    const error = new Error("Invalid inventory category");
    error.status = 400;
    throw error;
  }

  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined)
  );
}

function serializeInventoryItem(item) {
  const plain = typeof item?.get === "function" ? item.get({ plain: true }) : { ...item };

  return {
    ...plain,
    name: plain.item_name,
    category_label: categoryLabel(plain.category),
  };
}

async function listInventory(req, res) {
  const normalizedCategory = req.query.category ? (CATEGORY_MAP[req.query.category] || req.query.category) : undefined;
  const where = normalizedCategory ? { category: normalizedCategory } : undefined;
  const items = await Inventory.findAll({
    where,
    order: [["last_updated", "DESC"]],
  });

  return res.json({
    success: true,
    data: items.map((item) => ({
      ...serializeInventoryItem(item),
      low_stock: item.quantity <= item.reorder_level,
    })),
    total: items.length,
    page: 1,
    limit: items.length || 10,
  });
}

async function createInventoryItem(req, res) {
  const item = await Inventory.create(normalizeInventoryPayload(req.body));
  return res.status(201).json({
    success: true,
    data: serializeInventoryItem(item),
    message: "Inventory item created",
  });
}

async function updateInventoryItem(req, res) {
  const item = await Inventory.findByPk(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: "Inventory item not found" });
  }

  await item.update({
    ...normalizeInventoryPayload(req.body),
    last_updated: new Date(),
  });

  return res.json({
    success: true,
    data: serializeInventoryItem(item),
    message: "Inventory item updated",
  });
}

async function deleteInventoryItem(req, res) {
  const item = await Inventory.findByPk(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: "Inventory item not found" });
  }

  await item.destroy();
  return res.json({
    success: true,
    message: "Inventory item deleted",
  });
}

module.exports = {
  listInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
};
