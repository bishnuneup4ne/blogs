"use client";

import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";
import type {
  ChartBlock,
  ChartDatum,
  ChartSeries,
  FlowConnector,
  FlowEdge,
  FlowLayout,
  FlowNode,
  FlowNodeShape,
  FlowStyle,
  GaugeSpec,
  ScatterPoint,
  StatSpec,
} from "@/lib/types";
import styles from "./ChartBlock.module.scss";

/** Token-based series palette. Keeps charts inside the site's existing
 *  colour system instead of shipping a separate chart-brand palette. */
const SERIES = [
  "var(--blue-600)",
  "#34a853",
  "#f9ab00",
  "#ea4335",
  "var(--blue-800)",
  "var(--green-800)",
  "var(--yellow-900)",
  "var(--gray-600)",
];

const colorAt = (index: number) => SERIES[index % SERIES.length];

const KIND_LABEL: Record<ChartBlock["kind"], string> = {
  bar: "Bar chart",
  stat: "Key figure",
  column: "Column chart",
  grouped: "Grouped bars",
  stacked: "Stacked bars",
  line: "Line chart",
  area: "Area chart",
  pie: "Pie chart",
  donut: "Donut chart",
  scatter: "Scatter plot",
  radar: "Radar chart",
  gauge: "Gauge",
  funnel: "Funnel",
  progress: "Progress",
  timeline: "Timeline",
  flow: "Flow chart",
};

export const FLOW_SHAPE_OPTIONS: { value: FlowNodeShape; label: string }[] = [
  { value: "start", label: "Start (pill)" },
  { value: "end", label: "End (pill)" },
  { value: "process", label: "Process (rectangle)" },
  { value: "decision", label: "Decision (diamond)" },
  { value: "data", label: "Input / output (parallelogram)" },
  { value: "document", label: "Document" },
  { value: "note", label: "Note" },
];

const FLOW_SHAPE_LABEL: Record<FlowNodeShape, string> = {
  start: "Start",
  end: "End",
  process: "Process",
  decision: "Decision",
  data: "Input / output",
  document: "Document",
  note: "Note",
};

/** Data-driven charts — column, grouped, stacked, line, area, pie, donut,
 *  scatter, radar, gauge, funnel, progress, timeline and flow. Every chart
 *  animates in with GSAP and exposes its values through a compact tooltip. */
export function ChartBlockView({ chart }: { chart: ChartBlock }) {
  const ref = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ctx: gsap.Context | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        ctx = gsap.context(() => animate(root), root);
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      ctx?.revert();
    };
  }, [chart]);

  // One delegated pointer handler serves every mark in every chart kind.
  useEffect(() => {
    const root = ref.current;
    const tip = tipRef.current;
    if (!root || !tip) return;

    gsap.set(tip, { opacity: 0 });

    let shown = false;
    const place = (x: number, y: number) => {
      const box = root.getBoundingClientRect();
      const w = tip.offsetWidth;
      const clampX = Math.min(Math.max(x - box.left - w / 2, 4), Math.max(box.width - w - 4, 4));
      gsap.set(tip, { x: clampX, y: y - box.top - tip.offsetHeight - 14 });
    };

    const line = (cls: string, text: string) => {
      const el = document.createElement("span");
      el.className = cls;
      el.textContent = text;
      return el;
    };

    const show = (target: HTMLElement, x: number, y: number) => {
      const label = target.dataset.tipLabel ?? "";
      const value = target.dataset.tipValue ?? "";
      const share = target.dataset.tipShare;
      tip.replaceChildren(
        line(styles.tipLabel, label),
        line(styles.tipValue, value),
        ...(share ? [line(styles.tipShare, share)] : []),
      );
      place(x, y);
      if (!shown) {
        shown = true;
        gsap.killTweensOf(tip);
        gsap.fromTo(tip, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "power2.out" });
      }
    };

    const hide = () => {
      if (!shown) return;
      shown = false;
      gsap.killTweensOf(tip);
      gsap.to(tip, { opacity: 0, duration: 0.12, ease: "power2.in" });
    };

    const point = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest?.("[data-tip-label]") as HTMLElement | null;
      if (!target) {
        hide();
        return;
      }
      show(target, e.clientX, e.clientY);
    };
    const onLeave = () => hide();

    root.addEventListener("pointermove", point);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("blur", onLeave, true);
    return () => {
      root.removeEventListener("pointermove", point);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("blur", onLeave, true);
      gsap.killTweensOf(tip);
    };
  }, []);

  return (
    <figure className={styles.figure} aria-label={chart.title ?? KIND_LABEL[chart.kind]}>
      <div className={styles.card} ref={ref} data-kind={chart.kind}>
        <figcaption className={styles.title}>{chart.title ?? KIND_LABEL[chart.kind]}</figcaption>
        <div className={styles.body}>
          <Body chart={chart} />
        </div>
        {chart.caption ? <p className={styles.caption}>{chart.caption}</p> : null}
        <div className={styles.tooltip} ref={tipRef} aria-hidden="true" />
      </div>
    </figure>
  );
}

function Body({ chart }: { chart: ChartBlock }) {
  switch (chart.kind) {
    case "bar":
      return chart.data.length ? <BarChart data={chart.data} unit={chart.unit} /> : <ChartEmpty />;
    case "column":
      return chart.data.length ? <ColumnChart data={chart.data} unit={chart.unit} /> : <ChartEmpty />;
    case "grouped":
      return chart.categories.length && chart.series.length
        ? <GroupedChart categories={chart.categories} series={chart.series} unit={chart.unit} />
        : <ChartEmpty />;
    case "stacked":
      return chart.categories.length && chart.series.length
        ? <StackedChart categories={chart.categories} series={chart.series} unit={chart.unit} />
        : <ChartEmpty />;
    case "line":
      return chart.data.length ? <LineChart data={chart.data} unit={chart.unit} area={false} /> : <ChartEmpty />;
    case "area":
      return chart.data.length ? <LineChart data={chart.data} unit={chart.unit} area /> : <ChartEmpty />;
    case "pie":
      return chart.data.length ? <PieChart data={chart.data} unit={chart.unit} donut={false} /> : <ChartEmpty />;
    case "donut":
      return chart.data.length ? <PieChart data={chart.data} unit={chart.unit} donut /> : <ChartEmpty />;
    case "scatter":
      return chart.points.length
        ? <ScatterChart points={chart.points} xLabel={chart.xLabel} yLabel={chart.yLabel} />
        : <ChartEmpty />;
    case "radar":
      return chart.axes.length && chart.series.length
        ? <RadarChart axes={chart.axes} series={chart.series} />
        : <ChartEmpty />;
    case "gauge":
      return <GaugeChart spec={chart.gauge} />;
    case "funnel":
      return chart.data.length ? <FunnelChart data={chart.data} unit={chart.unit} /> : <ChartEmpty />;
    case "progress":
      return chart.data.length ? <ProgressChart data={chart.data} unit={chart.unit} /> : <ChartEmpty />;
    case "timeline":
      return chart.events.length ? <TimelineChart events={chart.events} /> : <ChartEmpty />;
    case "stat":
      return <StatCard stat={chart.stat} />;
    case "flow":
      return (
        <FlowChart
          steps={chart.steps}
          nodes={chart.nodes}
          edges={chart.edges}
          layout={chart.layout ?? "vertical"}
          variant={chart.style ?? "card"}
          connector={chart.connector ?? "arrow"}
        />
      );
  }
}

/* ------------------------- entrance animations ------------------------- */

function animate(root: HTMLElement) {
  const q = <T extends Element,>(sel: string) => root.querySelectorAll<T>(sel);

  q<HTMLElement>(`.${styles.colFill}`).forEach((el, i) => {
    const target = `${Number(el.dataset.h ?? 0)}%`;
    gsap.fromTo(el, { height: "0%" }, { height: target, duration: 0.8, ease: "power3.out", delay: i * 0.07 });
  });
  q<HTMLElement>(`.${styles.stackSeg}`).forEach((el, i) => {
    gsap.from(el, { scaleY: 0, transformOrigin: "bottom", duration: 0.6, ease: "power3.out", delay: i * 0.05 });
  });

  q<HTMLElement>(`.${styles.countUp}`).forEach((el) => {
    const final = Number(el.dataset.value ?? 0);
    const unit = el.dataset.unit ?? "";
    const proxy = { n: 0 };
    gsap.to(proxy, {
      n: final,
      duration: 0.9,
      ease: "power2.out",
      onUpdate: () => {
        const value = Number.isInteger(final) ? Math.round(proxy.n) : proxy.n.toFixed(1);
        el.textContent = `${value}${unit}`;
      },
    });
  });

  const poly = root.querySelector<SVGPolylineElement>(`.${styles.polyline}`);
  if (poly) {
    const len = poly.getTotalLength();
    gsap.set(poly, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(poly, { strokeDashoffset: 0, duration: 1.25, ease: "power2.inOut" });
  }
  q<SVGPathElement>(`.${styles.areaPath}`).forEach((el) => gsap.from(el, { opacity: 0, duration: 0.8, delay: 0.45 }));

  q<SVGCircleElement>(`.${styles.arc}`).forEach((arc, i) => {
    const full = Number(arc.dataset.circ ?? 0);
    const len = Number(arc.dataset.len ?? 0);
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      duration: 0.85,
      ease: "power2.out",
      delay: i * 0.1,
      onUpdate: () => {
        const grown = len * proxy.p;
        arc.setAttribute("stroke-dasharray", `${grown} ${full - grown}`);
      },
    });
  });

  q(`.${styles.dot}`).forEach((el, i) =>
    gsap.from(el, { scale: 0, transformOrigin: "center", duration: 0.4, delay: 0.4 + i * 0.05, ease: "back.out(2)" }),
  );
  q(`.${styles.radarPoly}`).forEach((el, i) =>
    gsap.from(el, { scale: 0.2, opacity: 0, transformOrigin: "center", duration: 0.7, delay: i * 0.12, ease: "power3.out" }),
  );
  q(`.${styles.funnelRow}`).forEach((el, i) =>
    gsap.from(el, { opacity: 0, y: 8, duration: 0.45, delay: i * 0.09, ease: "power3.out" }),
  );
  q<HTMLElement>(`.${styles.funnelBar}`).forEach((el, i) => {
    const target = `${Number(el.dataset.w ?? 0)}%`;
    gsap.fromTo(el, { width: "0%" }, { width: target, duration: 0.8, ease: "power3.out", delay: i * 0.09 });
  });
  q<HTMLElement>(`.${styles.progressFill}`).forEach((el, i) => {
    const target = `${Number(el.dataset.w ?? 0)}%`;
    gsap.fromTo(el, { width: "0%" }, { width: target, duration: 0.9, ease: "power3.out", delay: i * 0.09 });
  });
  q<HTMLElement>(`.${styles.barFill}`).forEach((el, i) => {
    const target = `${Number(el.dataset.w ?? 0)}%`;
    gsap.fromTo(el, { width: "0%" }, { width: target, duration: 0.8, ease: "power3.out", delay: i * 0.06 });
  });
  q<HTMLElement>(`.${styles.stat}`).forEach((el) => {
    gsap.from(el, { opacity: 0, y: 8, duration: 0.5, ease: "power3.out" });
  });

  const gauge = root.querySelector<SVGCircleElement>(`.${styles.gaugeArc}`);
  if (gauge) {
    const full = Number(gauge.dataset.circ ?? 0);
    const len = Number(gauge.dataset.len ?? 0);
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      duration: 1.1,
      ease: "power2.inOut",
      onUpdate: () => gauge.setAttribute("stroke-dasharray", `${len * proxy.p} ${full}`),
    });
  }

  [styles.legend, styles.timeline].forEach((cls) => {
    const items = q(`.${cls} li`);
    if (items.length) gsap.from(items, { opacity: 0, y: 12, duration: 0.45, stagger: 0.1, ease: "power3.out" });
  });

  const flowNodes = q(`.${styles.flowNode}`);
  if (flowNodes.length) {
    gsap.from(flowNodes, { opacity: 0, y: 10, duration: 0.45, stagger: 0.07, ease: "power3.out" });
  }
  const flowEdges = q(`.${styles.flowEdge}`);
  if (flowEdges.length) {
    gsap.from(flowEdges, { opacity: 0, duration: 0.4, stagger: 0.05, delay: 0.2, ease: "power2.out" });
  }

}

/* ------------------------- primitives ------------------------- */

const fmt = (value: number, unit?: string) => {
  const formatted = Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${formatted}${unit ?? ""}`;
};

const fmtAxis = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const pctOf = (value: number, total: number) => `${Math.round((value / (total || 1)) * 100)}%`;

/** Marks opt into the tooltip with data-tip-* attributes; the figure's
 *  pointer handler reads them, so no chart needs its own listeners. */
function tipProps(label: string, value: string, share?: string) {
  return {
    "data-tip-label": label,
    "data-tip-value": value,
    ...(share ? { "data-tip-share": share } : {}),
  };
}

function ChartEmpty() {
  return <p className={styles.empty}>Add data in the editor to preview this chart.</p>;
}

function ColumnChart({ data, unit }: { data: ChartDatum[]; unit?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <div className={styles.columns}>
      {data.map((d, i) => {
        const pct = Math.max((d.value / max) * 100, 2);
        return (
          <div key={`${d.label}-${i}`} className={styles.col}>
            <span className={`${styles.colValue} ${styles.countUp}`} data-value={d.value} data-unit={unit ?? ""}>
              {fmt(d.value, unit)}
            </span>
            <span className={styles.colTrack}>
              <span className={styles.colFill} data-h={isNaN(pct) ? 0 : pct} {...tipProps(d.label, fmt(d.value, unit), pctOf(d.value, total))} style={{ height: `${pct}%` }} />
            </span>
            <span className={styles.colLabel}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function BarChart({ data, unit }: { data: ChartDatum[]; unit?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <ul className={styles.bars}>
      {data.map((d, i) => {
        const pct = Math.max((d.value / max) * 100, 2);
        return (
          <li key={`${d.label}-${i}`} className={styles.bar} tabIndex={-1} {...tipProps(d.label, fmt(d.value, unit), pctOf(d.value, total))}>
            <span className={styles.barLabel}>{d.label}</span>
            <span className={styles.barTrack}>
              <span className={styles.barFill} data-w={pct} style={{ width: `${pct}%` }} />
            </span>
            <span className={styles.barValue}>{fmt(d.value, unit)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function GroupedChart({ categories, series, unit }: { categories: string[]; series: ChartSeries[]; unit?: string }) {
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  return (
    <div className={styles.groupedWrap}>
      <div className={styles.grouped}>
        {categories.map((cat, ci) => (
          <div key={cat} className={styles.group}>
            <div className={styles.groupBars}>
              {series.map((s, si) => {
                const v = s.values[ci] ?? 0;
                const pct = Math.max((v / max) * 100, 2);
                return (
                  <span
                    key={s.name}
                    className={styles.colFill}
                    data-h={pct}
                    tabIndex={-1}
                    {...tipProps(`${s.name} · ${cat}`, fmt(v, unit))}
                    style={{ height: `${pct}%`, background: colorAt(si) }}
                  />
                );
              })}
            </div>
            <span className={styles.colLabel}>{cat}</span>
          </div>
        ))}
      </div>
      <ul className={styles.legend}>
        {series.map((s, i) => (
          <li key={s.name}>
            <span className={styles.swatch} style={{ background: colorAt(i) }} />
            <span className={styles.legendLabel}>{s.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StackedChart({ categories, series, unit }: { categories: string[]; series: ChartSeries[]; unit?: string }) {
  const totals = categories.map((_, ci) => series.reduce((n, s) => n + (s.values[ci] ?? 0), 0));
  const max = Math.max(...totals, 1);
  return (
    <div className={styles.groupedWrap}>
      <div className={styles.grouped}>
        {categories.map((cat, ci) => (
          <div key={cat} className={styles.group}>
            <div className={styles.stackTrack}>
              {series.map((s, si) => {
                const v = s.values[ci] ?? 0;
                const pct = (v / max) * 100;
                return (
                  <span
                    key={s.name}
                    className={styles.stackSeg}
                    tabIndex={-1}
                    {...tipProps(`${s.name} · ${cat}`, fmt(v, unit), pctOf(v, totals[ci]))}
                    style={{ height: `${pct}%`, background: colorAt(si) }}
                  />
                );
              })}
            </div>
            <span className={styles.colLabel}>{cat}</span>
          </div>
        ))}
      </div>
      <ul className={styles.legend}>
        {series.map((s, i) => (
          <li key={s.name}>
            <span className={styles.swatch} style={{ background: colorAt(i) }} />
            <span className={styles.legendLabel}>{s.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LineChart({ data, unit, area }: { data: ChartDatum[]; unit?: string; area: boolean }) {
  const W = 720, H = 260;
  const pad = { l: 52, r: 24, t: 20, b: 38 };
  const values = data.map((d) => d.value);
  const high = Math.max(...values, 0);
  const low = Math.min(...values, 0);
  const top = high === low ? 1 : high;
  const bottom = high === low ? 0 : low;
  const span = top - bottom || 1;
  const x = (i: number) => pad.l + (data.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - bottom) / span) * (H - pad.t - pad.b);
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const baseline = H - pad.b;
  const areaPath = data.length > 1 ? `M${x(0)},${baseline} L${points.split(" ").join(" L")} L${x(data.length - 1)},${baseline} Z` : "";
  const dense = data.length > 8;
  const gradId = `area-grad-${useId().replace(/:/g, "")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.line} role="img" aria-label={area ? "Area chart" : "Line chart"}>
      {area ? (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue-600)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--blue-600)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      ) : null}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const gy = pad.t + t * (H - pad.t - pad.b);
        return (
          <g key={t}>
            <line className={styles.gridLine} x1={pad.l} x2={W - pad.r} y1={gy} y2={gy} />
            <text className={styles.axis} x={pad.l - 10} y={gy + (t === 1 ? -15 : 3)} textAnchor="end">{fmtAxis(top - t * span)}</text>
          </g>
        );
      })}
      {area && areaPath ? <path className={styles.areaPath} d={areaPath} fill={`url(#${gradId})`} /> : null}
      <polyline className={styles.polyline} points={points} fill="none" stroke="var(--blue-600)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={`${d.label}-${i}`}>
          <circle
            className={styles.dot}
            cx={x(i)}
            cy={y(d.value)}
            r="4"
            fill="var(--white)"
            stroke="var(--blue-600)"
            strokeWidth="2.5"
            tabIndex={-1}
            {...tipProps(d.label, fmt(d.value, unit))}
          />
          <circle className={styles.hit} cx={x(i)} cy={y(d.value)} r="14" fill="transparent" tabIndex={-1} {...tipProps(d.label, fmt(d.value, unit))} />
          <text
            className={styles.axis}
            x={x(i)}
            y={baseline + 18}
            textAnchor={dense ? "end" : "middle"}
            transform={dense ? `rotate(-32 ${x(i)} ${baseline + 18})` : undefined}
          >
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function PieChart({ data, unit, donut }: { data: ChartDatum[]; unit?: string; donut: boolean }) {
  const total = data.reduce((n, d) => n + d.value, 0) || 1;
  const R = donut ? 64 : 37;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const sw = donut ? 30 : 74;
  return (
    <div className={styles.pieWrap}>
      <svg viewBox="0 0 200 200" className={styles.pie} role="img" aria-label={donut ? "Donut chart" : "Pie chart"}>
        <g transform="rotate(-90 100 100)">
          {data.map((d, i) => {
            const len = (d.value / total) * C;
            const drawn = Math.max(len - (donut ? 3 : 2), 0);
            const dash = `${drawn} ${C - drawn}`;
            const el = (
              <g key={`${d.label}-${i}`} tabIndex={-1} {...tipProps(d.label, fmt(d.value, unit), pctOf(d.value, total))}>
                <circle
                  className={styles.arc}
                  data-circ={C}
                  data-len={drawn}
                  cx="100" cy="100" r={R}
                  fill="none"
                  stroke={colorAt(i)}
                  strokeWidth={sw}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
                {donut ? (
                  <circle
                    cx="100" cy="100" r={R}
                    fill="none"
                    stroke="var(--white)"
                    strokeWidth={sw + 2}
                    strokeDasharray={`2 ${C - 2}`}
                    strokeDashoffset={-offset}
                  />
                ) : null}
                {/* invisible companion: pointer-events on stroke geometry only */}
                <circle
                  cx="100" cy="100" r={R}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={sw + 10}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  style={{ pointerEvents: "stroke" }}
                />
              </g>
            );
            offset += len;
            return el;
          })}
        </g>
        {donut ? (
          <>
            <text x="100" y="96" textAnchor="middle" className={styles.donutValue}>{fmt(total, unit)}</text>
            <text x="100" y="114" textAnchor="middle" className={styles.donutLabel}>Total</text>
          </>
        ) : null}
      </svg>
      <ul className={styles.legend}>
        {data.map((d, i) => (
          <li
            key={`${d.label}-${i}`}
            className={styles.legendItem}
            tabIndex={-1}
            {...tipProps(d.label, fmt(d.value, unit), pctOf(d.value, total))}
          >
            <span className={styles.swatch} style={{ background: colorAt(i) }} />
            <span className={styles.legendLabel}>{d.label}</span>
            <span className={styles.legendValue}>{pctOf(d.value, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScatterChart({ points, xLabel, yLabel }: { points: ScatterPoint[]; xLabel?: string; yLabel?: string }) {
  const W = 720, H = 280;
  const pad = { l: 54, r: 24, t: 20, b: 44 };
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const xmax = Math.max(...xs, 1), ymax = Math.max(...ys, 1);
  const x = (v: number) => pad.l + (v / xmax) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / ymax) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.line} role="img" aria-label="Scatter plot">
      {[0, 0.5, 1].map((t) => {
        const gy = pad.t + t * (H - pad.t - pad.b);
        return (
          <g key={`h-${t}`}>
            <line className={styles.gridLine} x1={pad.l} x2={W - pad.r} y1={gy} y2={gy} />
            <text className={styles.axis} x={pad.l - 10} y={gy + (t === 1 ? -15 : 3)} textAnchor="end">{fmtAxis(ymax - t * ymax)}</text>
          </g>
        );
      })}
      {[0, 0.5, 1].map((t) => {
        const gx = pad.l + t * (W - pad.l - pad.r);
        return (
          <g key={`v-${t}`}>
            <line className={styles.gridLine} x1={gx} x2={gx} y1={pad.t} y2={H - pad.b} />
            <text className={styles.axis} x={gx} y={H - pad.b + 18} textAnchor="middle">{fmtAxis(t * xmax)}</text>
          </g>
        );
      })}
      <line className={styles.baseline} x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} />
      <line className={styles.baseline} x1={pad.l} x2={pad.l} y1={pad.t} y2={H - pad.b} />
      {points.map((p, i) => {
        const label = p.label ?? `Point ${i + 1}`;
        const value = `${fmt(p.x)} · ${fmt(p.y)}`;
        return (
          <g key={i}>
            <circle
              className={styles.dot}
              cx={x(p.x)}
              cy={y(p.y)}
              r="6"
              fill="var(--blue-600)"
              fillOpacity="0.88"
              stroke="var(--white)"
              strokeWidth="2"
              tabIndex={-1}
              {...tipProps(label, value)}
            />
            <circle className={styles.hit} cx={x(p.x)} cy={y(p.y)} r="16" fill="transparent" tabIndex={-1} {...tipProps(label, value)} />
          </g>
        );
      })}
      {xLabel ? <text className={styles.axisLabel} x={W / 2} y={H - 6} textAnchor="middle">{xLabel}</text> : null}
      {yLabel ? <text className={styles.axisLabel} transform={`rotate(-90 14 ${H / 2})`} x="14" y={H / 2} textAnchor="middle">{yLabel}</text> : null}
    </svg>
  );
}

function RadarChart({ axes, series }: { axes: string[]; series: ChartSeries[] }) {
  const S = 300, cxy = S / 2, R = 104;
  const n = axes.length || 1;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const point = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (v / max) * R;
    return [cxy + Math.cos(a) * r, cxy + Math.sin(a) * r];
  };
  return (
    <div className={styles.radarWrap}>
      <svg viewBox={`0 0 ${S} ${S}`} className={styles.radar} role="img" aria-label="Radar chart">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <polygon key={t} className={styles.radarRing} points={axes.map((_, i) => point(i, max * t).join(",")).join(" ")} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = point(i, max);
          return <line key={i} className={styles.radarSpoke} x1={cxy} y1={cxy} x2={x} y2={y} />;
        })}
        {series.map((s, si) => (
          <g key={s.name}>
            <polygon
              className={styles.radarPoly}
              points={axes.map((_, i) => point(i, s.values[i] ?? 0).join(",")).join(" ")}
              fill={colorAt(si)}
              fillOpacity="0.14"
              stroke={colorAt(si)}
              strokeWidth="2"
              tabIndex={-1}
              {...tipProps(s.name, `Peak ${fmt(Math.max(...s.values, 0))}`)}
            />
            {axes.map((axis, i) => {
              const [x, y] = point(i, s.values[i] ?? 0);
              return (
                <circle
                  key={axis}
                  className={styles.radarDot}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={colorAt(si)}
                  stroke="var(--white)"
                  strokeWidth="2"
                  tabIndex={-1}
                  {...tipProps(`${s.name} · ${axis}`, fmt(s.values[i] ?? 0))}
                />
              );
            })}
          </g>
        ))}
        {axes.map((label, i) => {
          const [x, y] = point(i, max * 1.26);
          return <text key={label} className={styles.axis} x={x} y={y} textAnchor="middle" dominantBaseline="middle">{label}</text>;
        })}
      </svg>
      <ul className={styles.legend}>
        {series.map((s, i) => (
          <li key={s.name}>
            <span className={styles.swatch} style={{ background: colorAt(i) }} />
            <span className={styles.legendLabel}>{s.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GaugeChart({ spec }: { spec: GaugeSpec }) {
  const pct = Math.min(spec.value / (spec.max || 1), 1);
  const R = 80, C = Math.PI * R;
  return (
    <div
      className={styles.gaugeWrap}
      tabIndex={-1}
      {...tipProps(spec.label ?? "Value", `${fmt(spec.value, spec.unit)} of ${fmt(spec.max, spec.unit)}`, `${Math.round(pct * 100)}%`)}
    >
      <svg viewBox="0 0 200 130" className={styles.gauge} role="img" aria-label="Gauge">
        <path d={`M20,100 A${R},${R} 0 0 1 ${180},100`} fill="none" stroke="var(--gray-150)" strokeWidth="26" />
        <circle
          className={styles.gaugeArc}
          data-circ={C}
          data-len={C * pct * 0.5}
          cx="100" cy="100" r={R}
          fill="none"
          stroke="var(--blue-600)"
          strokeWidth="26"
          strokeLinecap="round"
          strokeDasharray={`${C * pct * 0.5} ${C}`}
          transform="rotate(180 100 100)"
          pathLength={C}
        />
        <text x="100" y="82" textAnchor="middle" className={styles.gaugeValue}>{fmt(spec.value, spec.unit)}</text>
        {spec.unit !== "%" ? (
          <text x="100" y="101" textAnchor="middle" className={styles.gaugePct}>{Math.round(pct * 100)}%</text>
        ) : null}
        <text x="20" y="122" textAnchor="middle" className={styles.axis}>0</text>
        <text x="180" y="122" textAnchor="middle" className={styles.axis}>{fmtAxis(spec.max)}</text>
      </svg>
      {spec.label ? <p className={styles.gaugeLabel}>{spec.label}</p> : null}
    </div>
  );
}

function FunnelChart({ data, unit }: { data: ChartDatum[]; unit?: string }) {
  const top = data[0]?.value || 1;
  return (
    <ol className={styles.funnel}>
      {data.map((d, i) => {
        const w = Math.min(Math.max((d.value / top) * 100, 4), 100);
        return (
          <li
            key={`${d.label}-${i}`}
            className={styles.funnelRow}
            tabIndex={-1}
            {...tipProps(d.label, fmt(d.value, unit), `${pctOf(d.value, top)} of top`)}
          >
            <span className={styles.funnelStage}>
              <span className={styles.funnelLabel}>{d.label}</span>
            </span>
            <span className={styles.funnelTrack}>
              <span className={styles.funnelBar} data-w={w} style={{ width: `${w}%`, opacity: Math.max(0.55, 1 - i * 0.13) }} />
            </span>
            <span className={styles.funnelMeta}>
              <span className={styles.funnelValue}>{fmt(d.value, unit)}</span>
              <span className={styles.funnelShare}>{pctOf(d.value, top)} of top</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ProgressChart({ data, unit }: { data: ChartDatum[]; unit?: string }) {
  const max = unit === "%" ? Math.max(...data.map((d) => d.value), 1) : Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className={styles.progressList}>
      {data.map((d, i) => {
        const pct = Math.min((d.value / max) * 100, 100);
        return (
          <li
            key={`${d.label}-${i}`}
            className={styles.progressRow}
            tabIndex={-1}
            {...tipProps(d.label, fmt(d.value, unit), `${Math.round(pct)}%`)}
          >
            <div className={styles.progressMain}>
              <span className={styles.progressHead}>
                <span className={styles.progressLabel}>{d.label}</span>
                <span className={`${styles.progressValue} ${styles.countUp}`} data-value={d.value} data-unit={unit ?? ""}>
                  {fmt(d.value, unit)}
                </span>
              </span>
              <span className={styles.progressTrack}>
                <span className={styles.progressFill} data-w={pct} style={{ width: `${pct}%` }} />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TimelineChart({ events }: { events: { label: string; detail?: string }[] }) {
  return (
    <ol className={styles.timeline}>
      {events.map((e, i) => (
        <li key={`${e.label}-${i}`} className={styles.timelineItem} tabIndex={-1} {...tipProps(e.label, e.detail ?? `Step ${i + 1}`)}>
          <span className={styles.timelineDot} aria-hidden="true" />
          <span className={styles.timelineBody}>
            <span className={styles.timelineLabel}>{e.label}</span>
            {e.detail ? <span className={styles.timelineDetail}>{e.detail}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------- flow charts ------------------------- */

type ResolvedFlowNode = Required<Pick<FlowNode, "id" | "label" | "shape">> & { detail?: string };
type ResolvedFlowEdge = { from: string; to: string; label?: string; style: "solid" | "dashed" };

function resolveFlow({
  steps = [],
  nodes,
  edges,
  style,
}: {
  steps?: string[];
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  style: FlowStyle;
}) {
  const source = (nodes ?? []).filter((node) => node.id && node.label);
  const resolvedNodes: ResolvedFlowNode[] = source.length
    ? source.map((node, i) => ({
        ...node,
        shape: node.shape ?? (i === 0 ? "start" : i === source.length - 1 ? "end" : "process"),
      }))
    : steps.map((step, i) => ({
        id: `step-${i + 1}`,
        label: step,
        shape: (i === 0 ? "start" : i === steps.length - 1 ? "end" : style === "chip" ? "note" : "process") as FlowNodeShape,
      }));

  const ids = new Set(resolvedNodes.map((node) => node.id));
  const explicitEdges = Array.isArray(edges);
  const resolvedEdges: ResolvedFlowEdge[] = explicitEdges
    ? edges
        .filter((edge) => edge.from !== edge.to && ids.has(edge.from) && ids.has(edge.to))
        .map((edge) => ({
          from: edge.from,
          to: edge.to,
          ...(edge.label ? { label: edge.label } : {}),
          style: edge.style === "dashed" ? "dashed" : "solid",
        }))
    : resolvedNodes.slice(1).map((node, i) => ({ from: resolvedNodes[i].id, to: node.id, style: "solid" }));

  return { nodes: resolvedNodes, edges: resolvedEdges };
}

function flowLevels(nodes: ResolvedFlowNode[], edges: ResolvedFlowEdge[]) {
  const incoming = new Set(edges.map((edge) => edge.to));
  const roots = nodes.filter((node) => !incoming.has(node.id));
  const levels = new Map<string, number>();
  const queue = (roots.length ? roots : nodes.slice(0, 1)).map((node) => node.id);

  for (const id of queue) levels.set(id, 0);
  for (let i = 0; i < queue.length; i += 1) {
    const id = queue[i];
    const level = levels.get(id) ?? 0;
    for (const edge of edges) {
      if (edge.from !== id || levels.has(edge.to)) continue;
      levels.set(edge.to, level + 1);
      queue.push(edge.to);
    }
  }

  for (const node of nodes) {
    if (!levels.has(node.id)) levels.set(node.id, 0);
  }

  const max = Math.max(...levels.values(), 0);
  const columns = Array.from({ length: max + 1 }, () => [] as ResolvedFlowNode[]);
  for (const node of nodes) columns[levels.get(node.id) ?? 0].push(node);
  return { levels, columns, max };
}

function StatCard({ stat }: { stat: StatSpec }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{stat.value}</span>
      {stat.delta || stat.note ? (
        <span className={styles.statRow}>
          {stat.delta ? (
            <span
              className={`${styles.statDelta} ${styles[`trend_${stat.trend ?? "flat"}`]}`}
              aria-label={`${stat.trend ?? "flat"} ${stat.delta}`}
            >
              <span aria-hidden="true">{stat.trend === "up" ? "▲" : stat.trend === "down" ? "▼" : "■"}</span>
              {stat.delta}
            </span>
          ) : null}
          {stat.note ? <span className={styles.statNote}>{stat.note}</span> : null}
        </span>
      ) : null}
    </div>
  );
}

function FlowChart({
  steps,
  nodes,
  edges,
  layout,
  variant,
  connector,
}: {
  steps?: string[];
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  layout: FlowLayout;
  variant: FlowStyle;
  connector: FlowConnector;
}) {
  const uid = useId().replace(/:/g, "");
  const markerId = `flow-arrow-${uid}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const flow = resolveFlow({ steps, nodes, edges, style: variant });

  useEffect(() => {
    const wrap = wrapRef.current;
    const query = window.matchMedia("(max-width: 760px)");
    const sync = () => setCompact(query.matches || (wrap?.clientWidth ?? 0) < 780);
    sync();
    query.addEventListener("change", sync);
    const observer = wrap ? new ResizeObserver(sync) : null;
    if (wrap && observer) observer.observe(wrap);
    return () => {
      query.removeEventListener("change", sync);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (layout === "horizontal") return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const frame = window.requestAnimationFrame(() => {
      wrap.scrollLeft = Math.max((wrap.scrollWidth - wrap.clientWidth) / 2, 0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [layout, nodes, edges, steps, compact]);

  if (!flow.nodes.length) {
    return <p className={styles.empty}>Add flow nodes in the editor to preview this flow chart.</p>;
  }

  const { nodes: flowNodes, edges: flowEdges } = flow;
  const { columns } = flowLevels(flowNodes, flowEdges);
  const horizontal = layout === "horizontal" && !compact;
  const NODE_W = compact ? 140 : horizontal ? 168 : 210;
  const NODE_H = compact ? 80 : 92;
  const PAD = compact ? 14 : 24;
  const GAP_X = compact ? 14 : 44;
  const GAP_Y = compact ? 46 : 74;
  const GAP_H = compact ? 32 : 40;
  const GAP_ROW = compact ? 24 : 34;
  const MIN_W = compact ? 300 : 640;
  const maxCount = Math.max(...columns.map((column) => column.length), 1);
  const width = horizontal
    ? Math.max(MIN_W, PAD * 2 + columns.length * NODE_W + (columns.length - 1) * GAP_H)
    : Math.max(MIN_W, PAD * 2 + maxCount * NODE_W + (maxCount - 1) * GAP_X);
  const height = horizontal
    ? Math.max(160, PAD * 2 + maxCount * NODE_H + (maxCount - 1) * GAP_ROW)
    : Math.max(240, PAD * 2 + columns.length * NODE_H + (columns.length - 1) * GAP_Y);
  const positions = new Map<string, { x: number; y: number }>();

  columns.forEach((column, level) => {
    const contentWidth = (column.length - 1) * (NODE_W + GAP_X);
    column.forEach((node, index) => {
      if (horizontal) {
        positions.set(node.id, {
          x: PAD + level * (NODE_W + GAP_H),
          y: PAD + index * (NODE_H + GAP_ROW),
        });
      } else {
        positions.set(node.id, {
          x: width / 2 - (contentWidth + NODE_W) / 2 + index * (NODE_W + GAP_X),
          y: PAD + level * (NODE_H + GAP_Y),
        });
      }
    });
  });

  const edgePath = (fromId: string, toId: string) => {
    const from = positions.get(fromId);
    const to = positions.get(toId);
    if (!from || !to) return null;
    if (horizontal) {
      const sx = from.x + NODE_W;
      const sy = from.y + NODE_H / 2;
      const tx = to.x;
      const ty = to.y + NODE_H / 2;
      const bend = Math.max(36, Math.abs(tx - sx) * 0.35);
      if (tx >= sx) return { d: `M ${sx} ${sy} C ${sx + bend} ${sy}, ${tx - bend} ${ty}, ${tx} ${ty}`, sx, sy, tx, ty };
      return { d: `M ${sx} ${sy} C ${sx + 70} ${sy + 50}, ${tx - 70} ${ty + 50}, ${tx} ${ty}`, sx, sy, tx, ty };
    }
    const sx = from.x + NODE_W / 2;
    const sy = from.y + NODE_H;
    const tx = to.x + NODE_W / 2;
    const ty = to.y;
    const bend = Math.max(36, Math.abs(ty - sy) * 0.35);
    if (ty >= sy) return { d: `M ${sx} ${sy} C ${sx} ${sy + bend}, ${tx} ${ty - bend}, ${tx} ${ty}`, sx, sy, tx, ty };
    return { d: `M ${sx} ${sy} C ${sx + 90} ${sy + 20}, ${tx + 90} ${ty - 20}, ${tx} ${ty}`, sx, sy, tx, ty };
  };

  return (
    <div className={styles.flowWrap} ref={wrapRef}>
      <div className={styles.flowCanvas} style={{ width, height }}>
        <svg
          className={styles.flowSvg}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="presentation"
          aria-hidden="true"
        >
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className={styles.flowArrowHead} />
            </marker>
          </defs>
          {flowEdges.map((edge, i) => {
            const path = edgePath(edge.from, edge.to);
            if (!path) return null;
            const midX = (path.sx + path.tx) / 2;
            const midY = (path.sy + path.ty) / 2;
            return (
              <g key={`${edge.from}-${edge.to}-${i}`}>
                <path
                  className={styles.flowEdge}
                  d={path.d}
                  fill="none"
                  strokeDasharray={edge.style === "dashed" ? "6 5" : undefined}
                  markerEnd={connector === "arrow" ? `url(#${markerId})` : undefined}
                />
                {edge.label ? (
                  <text className={styles.flowEdgeLabel} x={midX} y={midY} textAnchor="middle" dominantBaseline="middle">{edge.label}</text>
                ) : connector === "number" ? (
                  <g>
                    <circle className={styles.flowEdgeNumberBg} cx={midX} cy={midY} r="9" />
                    <text className={styles.flowEdgeNumber} x={midX} y={midY + 3} textAnchor="middle">{i + 1}</text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </svg>
        {flowNodes.map((node) => {
          const position = positions.get(node.id);
          if (!position) return null;
          const shapeClass = {
            start: styles.flowShapeStart,
            end: styles.flowShapeEnd,
            process: styles.flowShapeProcess,
            decision: styles.flowShapeDecision,
            data: styles.flowShapeData,
            document: styles.flowShapeDocument,
            note: styles.flowShapeNote,
          }[node.shape];
          return (
            <div
              key={node.id}
              className={`${styles.flowNode} ${shapeClass}`}
              style={{ left: position.x, top: position.y, width: NODE_W, height: NODE_H }}
              tabIndex={-1}
              {...tipProps(node.label, node.detail ?? FLOW_SHAPE_LABEL[node.shape])}
            >
              <span className={styles.flowNodeLabel}>{node.label}</span>
              {node.detail ? <span className={styles.flowNodeDetail}>{node.detail}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
