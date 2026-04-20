function calculateGST(amount, percent) {
  const numericAmount = Number(amount || 0);
  const numericPercent = Number(percent || 0);
  const gstAmount = (numericAmount * numericPercent) / 100;

  return {
    gstPercent: Number(numericPercent.toFixed(2)),
    gstAmount: Number(gstAmount.toFixed(2)),
    totalAmount: Number((numericAmount + gstAmount).toFixed(2)),
  };
}

module.exports = { calculateGST };

