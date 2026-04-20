export function calcGST(subtotal, gstPercent = 12) {
  const gstAmount = (Number(subtotal || 0) * Number(gstPercent || 0)) / 100;
  return {
    gstPercent,
    gstAmount,
    totalAmount: Number(subtotal || 0) + gstAmount,
  };
}

