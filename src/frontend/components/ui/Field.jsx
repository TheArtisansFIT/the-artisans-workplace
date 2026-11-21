export default function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = '',
  hintId,
  legend = false,
}) {
  const Wrapper = legend ? 'fieldset' : 'div'

  return (
    <Wrapper className={`field ${className}`}>
      {label &&
        (legend ? (
          <legend className="label">{label}</legend>
        ) : (
          <label className="label" htmlFor={htmlFor}>
            {label}
          </label>
        ))}
      {children}
      {error ? (
        <span className="help help--error" id={hintId} role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span className="help" id={hintId}>
            {hint}
          </span>
        )
      )}
    </Wrapper>
  )
}
