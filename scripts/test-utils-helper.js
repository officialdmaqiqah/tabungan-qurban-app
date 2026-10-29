function maskName(name) {
  if (!name) return '';
  const trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed[0] + '*';
  return trimmed[0] + '*'.repeat(trimmed.length - 2) + trimmed[trimmed.length - 1];
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

module.exports = { maskName, formatCurrency };
