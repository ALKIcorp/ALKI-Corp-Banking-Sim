export default function Panel({ children, className = '' }) {
  return <div className={`bw-panel ${className}`.trim()}>{children}</div>
}
