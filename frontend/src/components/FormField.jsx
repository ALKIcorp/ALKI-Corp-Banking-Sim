export default function FormField({ label, id, children, helper }) {
  return (
    <label htmlFor={id} className="bw-label block">
      {label}
      {children}
      {helper ? <p className="text-xs text-gray-500 mt-1">{helper}</p> : null}
    </label>
  )
}
