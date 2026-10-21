import { useEffect, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader } from '../ui/Card'
import { cn } from '../../lib/cn'

/**
 * Chart colours: series 1 teal, series 2 ochre. Checked for colour-blind separation and for
 * contrast against the light and dark card background. Priorities use their own fixed colours.
 */
const CHART = {
  light: { series1: '#008ba3', series2: '#c4701a', grid: '#e6e6e1', axis: '#868e96', ink: '#1d2125', cursor: 'rgba(15,94,102,0.06)' },
  dark: { series1: '#1aa0ad', series2: '#c9761d', grid: '#2d3236', axis: '#737b82', ink: '#e4e6e8', cursor: 'rgba(91,180,186,0.08)' },
}
export const SEVERITY = { critical: '#d03b3b', serious: '#ec835a', warning: '#fab219', neutral: '#94a3b8' }

/** Follows the light/dark switch so charts re-colour instantly. */
export function useChartColors() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return dark ? CHART.dark : CHART.light
}

export interface TableColumn { key: string; label: string; align?: 'right' }

/** A card holding one chart, with a switch to see the same numbers as a table (accessibility). */
export function ChartCard({ title, subtitle, legend, children, rows, columns, className }: {
  title: string
  subtitle?: string
  legend?: ReactNode
  children: ReactNode
  rows: Record<string, ReactNode>[]
  columns: TableColumn[]
  className?: string
}) {
  const [asTable, setAsTable] = useState(false)
  return (
    <Card className={className}>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <button
            onClick={() => setAsTable((t) => !t)}
            className="rounded border border-line px-2 py-0.5 text-xs text-muted hover:bg-surface-2 hover:text-fg cursor-pointer"
            aria-pressed={asTable}
          >
            {asTable ? 'Show chart' : 'Show table'}
          </button>
        }
      />
      {legend && !asTable && <div className="flex flex-wrap gap-4 px-5 pb-2 text-xs text-muted">{legend}</div>}
      <div className="px-3 pb-4">
        {asTable ? (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>{columns.map((c) => <th key={c.key} className={cn('px-2 py-1.5 font-medium', c.align === 'right' ? 'text-right' : 'text-left')}>{c.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, i) => (
                <tr key={i}>{columns.map((c) => <td key={c.key} className={cn('tabular px-2 py-1.5 text-fg', c.align === 'right' && 'text-right')}>{r[c.key]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        ) : children}
      </div>
    </Card>
  )
}

export function LegendItem({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: color }} />{label}</span>
}

function ChartTooltip({ active, payload, label, unit }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color?: string; payload: { fill?: string } }>; label?: string; unit: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded border border-line-strong bg-surface px-3 py-2 text-xs">
      <p className="mb-1 font-medium text-fg">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted">
          <span className="size-2 rounded-sm" style={{ background: p.color ?? p.payload.fill }} />
          {p.name}: <span className="tabular font-medium text-fg">{p.value} {unit}</span>
        </p>
      ))}
    </div>
  )
}

export interface BarDatum { name: string; value: number; color?: string; second?: number }

/**
 * Horizontal bars, one per category. With `secondName` it becomes a two-part stacked bar
 * (e.g. open + resolved). Values are written at the end of each bar.
 */
export function HorizontalBars({ data, valueName, secondName, unit = 'incidents' }: {
  data: BarDatum[]; valueName: string; secondName?: string; unit?: string
}) {
  const c = useChartColors()
  const height = Math.max(120, data.length * 36 + 24)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 4 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} stroke={c.grid} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fill: c.ink, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: c.cursor }} content={<ChartTooltip unit={unit} />} />
        <Bar dataKey="value" name={valueName} stackId="a" fill={c.series1} radius={secondName ? [4, 0, 0, 4] : 4} maxBarSize={22}
          stroke="var(--surface)" strokeWidth={secondName ? 2 : 0}>
          {!secondName && data.map((d) => <Cell key={d.name} fill={d.color ?? c.series1} />)}
          {!secondName && <LabelList dataKey="value" position="right" fill={c.ink} fontSize={12} />}
          {/* When the second part is 0 its bar has no width, so the total is written after the first part */}
          {secondName && <LabelList valueAccessor={(entry: { payload?: BarDatum }) => (entry.payload && !entry.payload.second ? entry.payload.value : '')}
            position="right" fill={c.ink} fontSize={12} />}
        </Bar>
        {secondName && (
          <Bar dataKey="second" name={secondName} stackId="a" fill={c.series2} radius={[0, 4, 4, 0]} maxBarSize={22} stroke="var(--surface)" strokeWidth={2}>
            <LabelList valueAccessor={(entry: { payload?: BarDatum }) => (entry.payload?.second ? entry.payload.value + entry.payload.second : '')} position="right" fill={c.ink} fontSize={12} />
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Vertical columns in a fixed order (e.g. lifecycle stages). */
export function Columns({ data, valueName, unit = 'incidents' }: { data: BarDatum[]; valueName: string; unit?: string }) {
  const c = useChartColors()
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={data} margin={{ top: 20, right: 8, bottom: 4, left: -16 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={c.grid} />
        {/* Long stage names ("Acknowledged") would collide side by side, so the labels are slanted */}
        <XAxis dataKey="name" tick={{ fill: c.axis, fontSize: 11 }} axisLine={{ stroke: c.grid }} tickLine={false} interval={0}
          angle={-30} textAnchor="end" height={56} />
        <YAxis allowDecimals={false} tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: c.cursor }} content={<ChartTooltip unit={unit} />} />
        <Bar dataKey="value" name={valueName} fill={c.series1} radius={[4, 4, 0, 0]} maxBarSize={44}>
          <LabelList dataKey="value" position="top" fill={c.ink} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
