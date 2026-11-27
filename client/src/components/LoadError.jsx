// What a screen shows when its data could not be loaded: the reason, and a
// button that tries again without a page refresh.
export default function LoadError({ message, onRetry }) {
  return (
    <div className="notice">
      <p role="alert" className="error">{message}</p>
      <button type="button" className="button" onClick={onRetry}>Try again</button>
    </div>
  );
}
