export function formatPrice(price?: number): string {
  if (price) {
    return `$${price.toFixed(2)}`;
  }

  return '';
}
