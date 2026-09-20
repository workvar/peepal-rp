"use client";

import DiagramFrame from "./DiagramFrame";

/** High-level system architecture: browser → Next.js → Go API → PostgreSQL. */
export default function ArchitectureDiagram() {
  return (
    <DiagramFrame
      title="System Architecture"
      caption="Browser talks to Next.js (App Router). Next.js client-side calls hit the Go Fiber API directly. The Go service owns all data via GORM."
    >
      <svg viewBox="0 0 880 360" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <defs>
          <linearGradient id="archA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="archB" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="archC" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>

        {/* Browser */}
        <g>
          <rect x="20" y="120" width="180" height="120" rx="14" fill="url(#archA)" stroke="#3b82f6" strokeOpacity="0.45" />
          <text x="110" y="155" textAnchor="middle" className="fill-foreground" fontSize="14" fontWeight="700">Browser</text>
          <text x="110" y="180" textAnchor="middle" className="fill-foreground" fontSize="11" opacity="0.8">React UI</text>
          <text x="110" y="198" textAnchor="middle" className="fill-foreground" fontSize="11" opacity="0.8">Redux Toolkit</text>
          <text x="110" y="216" textAnchor="middle" className="fill-foreground" fontSize="11" opacity="0.8">Apollo Client</text>
        </g>

        {/* Next.js */}
        <g>
          <rect x="260" y="80" width="220" height="200" rx="14" fill="url(#archB)" stroke="#8b5cf6" strokeOpacity="0.45" />
          <text x="370" y="115" textAnchor="middle" className="fill-foreground" fontSize="14" fontWeight="700">Next.js 14 (App Router)</text>
          <rect x="280" y="135" width="180" height="40" rx="8" className="fill-card" stroke="#8b5cf6" strokeOpacity="0.4" />
          <text x="370" y="160" textAnchor="middle" className="fill-foreground" fontSize="11">[tenant]/(dashboard)/*</text>
          <rect x="280" y="185" width="180" height="40" rx="8" className="fill-card" stroke="#8b5cf6" strokeOpacity="0.4" />
          <text x="370" y="210" textAnchor="middle" className="fill-foreground" fontSize="11">api.ts · lib/apollo.ts</text>
          <rect x="280" y="235" width="180" height="32" rx="8" className="fill-card" stroke="#8b5cf6" strokeOpacity="0.4" />
          <text x="370" y="256" textAnchor="middle" className="fill-foreground" fontSize="11">store/slices · context/*</text>
        </g>

        {/* Go API */}
        <g>
          <rect x="540" y="80" width="220" height="200" rx="14" fill="url(#archC)" stroke="#10b981" strokeOpacity="0.45" />
          <text x="650" y="115" textAnchor="middle" className="fill-foreground" fontSize="14" fontWeight="700">Go Fiber API</text>
          <rect x="560" y="135" width="180" height="40" rx="8" className="fill-card" stroke="#10b981" strokeOpacity="0.4" />
          <text x="650" y="160" textAnchor="middle" className="fill-foreground" fontSize="11">routes · handlers</text>
          <rect x="560" y="185" width="180" height="40" rx="8" className="fill-card" stroke="#10b981" strokeOpacity="0.4" />
          <text x="650" y="210" textAnchor="middle" className="fill-foreground" fontSize="11">middleware (JWT, tenant)</text>
          <rect x="560" y="235" width="180" height="32" rx="8" className="fill-card" stroke="#10b981" strokeOpacity="0.4" />
          <text x="650" y="256" textAnchor="middle" className="fill-foreground" fontSize="11">graph/* (GraphQL)</text>
        </g>

        {/* DB */}
        <g>
          <ellipse cx="820" cy="170" rx="40" ry="14" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeOpacity="0.5" />
          <path d="M780,170 v32 a40,14 0 0 0 80,0 v-32" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeOpacity="0.5" />
          <text x="820" y="174" textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="700">PostgreSQL</text>
          <text x="820" y="230" textAnchor="middle" className="fill-foreground" fontSize="10" opacity="0.7">collegeerp.db</text>
        </g>

        {/* Arrows */}
        <g className="text-foreground" fill="none" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.55">
          <path d="M200,180 L260,180" markerEnd="url(#arr)" />
          <text x="230" y="172" textAnchor="middle" className="fill-foreground" fontSize="10" stroke="none" opacity="0.7">HTTPS</text>
          <path d="M480,180 L540,180" markerEnd="url(#arr)" />
          <text x="510" y="172" textAnchor="middle" className="fill-foreground" fontSize="10" stroke="none" opacity="0.7">REST + GraphQL</text>
          <path d="M760,170 L780,170" markerEnd="url(#arr)" />
        </g>

        {/* Caption tags */}
        <g>
          <rect x="20" y="40" width="120" height="22" rx="11" className="fill-card" stroke="currentColor" strokeOpacity="0.2" />
          <text x="80" y="55" textAnchor="middle" className="fill-foreground" fontSize="10" fontWeight="700">CLIENT TIER</text>
          <rect x="260" y="40" width="220" height="22" rx="11" className="fill-card" stroke="currentColor" strokeOpacity="0.2" />
          <text x="370" y="55" textAnchor="middle" className="fill-foreground" fontSize="10" fontWeight="700">PRESENTATION TIER</text>
          <rect x="540" y="40" width="320" height="22" rx="11" className="fill-card" stroke="currentColor" strokeOpacity="0.2" />
          <text x="700" y="55" textAnchor="middle" className="fill-foreground" fontSize="10" fontWeight="700">SERVICE + DATA TIER</text>
        </g>
      </svg>
    </DiagramFrame>
  );
}
