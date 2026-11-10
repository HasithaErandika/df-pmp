// Decorative portfolio field: rows of schedule bars, like a Gantt chart seen from afar.
// The pattern is deterministic so it never suggests real data.
const ROWS = 24
const WIDTH = 520
const ROW_HEIGHT = 26

function hash(n: number) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

const fills = ['var(--field-a)', 'var(--field-b)', 'var(--field-c)']

function barsForRow(row: number) {
  const bars: { x: number; w: number; fill: string; milestone: boolean }[] = []
  let x = (hash(row * 7) % 60) - 30
  for (let i = 0; x < WIDTH; i++) {
    const seed = hash(row * 31 + i)
    const w = 40 + (seed % 150)
    const accent = seed % 11 === 0
    bars.push({
      x,
      w,
      fill: accent ? fills[seed % 3] : seed % 2 ? 'var(--field-1)' : 'var(--field-2)',
      milestone: seed % 7 === 0,
    })
    x += w + 10 + (seed % 40)
  }
  return bars
}

export function ScheduleField() {
  return (
    <svg
      aria-hidden="true"
      className="schedule-field"
      viewBox={`0 0 ${WIDTH} ${ROWS * ROW_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
    >
      {Array.from({ length: ROWS }, (_, row) =>
        barsForRow(row).map((bar, i) => (
          <g key={`${row}-${i}`}>
            <rect
              x={bar.x}
              y={row * ROW_HEIGHT + 7}
              width={bar.w}
              height={12}
              rx={6}
              style={{ fill: bar.fill }}
            />
            {bar.milestone && (
              <rect
                x={bar.x + bar.w + 3}
                y={row * ROW_HEIGHT + 9}
                width={8}
                height={8}
                rx={1.5}
                transform={`rotate(45 ${bar.x + bar.w + 7} ${row * ROW_HEIGHT + 13})`}
                style={{ fill: 'var(--field-milestone)' }}
              />
            )}
          </g>
        )),
      )}
    </svg>
  )
}
