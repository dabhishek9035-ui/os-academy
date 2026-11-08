/**
 * Shared visual kit for all labs (Phase 2).
 *
 * Every piece is SVG or DOM, coloured through the theme's CSS variables,
 * labelled for assistive tech, and free of glow/blur/gradients. Text in SVG
 * stays ≥ 12 user units and the SVGs render 1:1 (explicit width/height) so
 * "12 units" means "12 px" on screen; wide plots scroll horizontally.
 *
 * Labs read state and dispatch actions; these components only render it.
 */
export { Timeline } from "./Timeline";
export type { TimelineSegment } from "./Timeline";
export { MemoryStrip } from "./MemoryStrip";
export { FrameGrid } from "./FrameGrid";
export { AddressBits } from "./AddressBits";
export { StateDiagram } from "./StateDiagram";
export { QueueLane } from "./QueueLane";
export { GraphView } from "./GraphView";
export { TrackPlot } from "./TrackPlot";
export { Meter } from "./Meter";
export { Legend } from "./Legend";
