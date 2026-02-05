import { useMemo, useState } from 'react'

export default function PropertyImage({ src, alt = 'Property image', variant = 'card', className = '' }) {
  const [failed, setFailed] = useState(false)
  const sanitizedSrc = useMemo(() => (src || '').trim(), [src])
  const hasSource = sanitizedSrc && !failed
  const baseClass = variant === 'modal' ? 'property-modal-image' : 'property-image'
  const classes = [baseClass, className].filter(Boolean).join(' ')

  if (!hasSource) {
    return <div className={`${classes} property-image-placeholder`}>No Image</div>
  }

  return (
    <img
      src={sanitizedSrc}
      alt={alt}
      className={classes}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
