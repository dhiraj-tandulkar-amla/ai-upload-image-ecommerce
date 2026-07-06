/**
 * Formats a product image path dynamically.
 * Supports absolute URLs, relative paths, standard data URIs, and raw base64 data strings.
 */
export function formatProductImage(imagePath: string | null | undefined): string {
  if (!imagePath) return "/placeholder.svg";

  const trimmed = imagePath.trim();

  // If it's already a standard path, URL, or data URI
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // If it's a raw base64 string, wrap it in a data URI prefix
  if (trimmed.length > 30 && !trimmed.includes(" ") && !trimmed.includes("/") && !trimmed.includes(".")) {
    return `data:image/jpeg;base64,${trimmed}`;
  }

  return trimmed;
}
