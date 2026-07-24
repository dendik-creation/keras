/** Shared loading animation (SMIL SVG) used across long-running/async states. */
export default function LoadingBooks({
  className = "h-24 w-24",
}: {
  className?: string;
}) {
  return <img src="/loading_books.svg" alt="Memuat" className={className} />;
}
