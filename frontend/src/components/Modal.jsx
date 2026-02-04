export default function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <button className="bw-button modal-close" type="button" onClick={onClose}>
          Close
        </button>
        {title ? (
          <h3 className="text-sm font-semibold mb-2 uppercase flex items-center gap-2 modal-header">
            {title}
          </h3>
        ) : null}
        {children}
      </div>
    </div>
  )
}
