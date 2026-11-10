/**
 * Bullet bar: actual progress as the fill, with a tick at the expected value
 * (share of schedule elapsed). The caller states the verdict in text, never colour alone.
 */
export function BulletBar({
  actual,
  expected,
  label,
}: {
  actual: number
  expected: number
  label: string
}) {
  const clamp = (n: number) => Math.max(0, Math.min(100, n))
  return (
    <span
      className="bullet"
      role="img"
      aria-label={`${label}: ${Math.round(actual)}% complete, ${Math.round(expected)}% of schedule elapsed`}
    >
      <span className="bullet-fill" style={{ width: `${clamp(actual)}%` }} />
      <span className="bullet-marker" style={{ left: `${clamp(expected)}%` }} />
    </span>
  )
}
