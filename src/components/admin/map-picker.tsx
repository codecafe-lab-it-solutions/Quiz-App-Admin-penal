"use client";

import { useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MapPickerProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onChange: (values: { latitude: number; longitude: number; radiusMeters: number }) => void;
}

const SIZE = 260;
const CENTER = SIZE / 2;
const METERS_PER_PIXEL = 4;
const MAX_RADIUS_PX = CENTER - 20;

export function MapPicker({ latitude, longitude, radiusMeters, onChange }: MapPickerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const radiusPx = Math.min(MAX_RADIUS_PX, Math.max(6, radiusMeters / METERS_PER_PIXEL));

  const updateRadiusFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left - CENTER;
      const y = clientY - rect.top - CENTER;
      const distancePx = Math.min(MAX_RADIUS_PX, Math.max(6, Math.sqrt(x * x + y * y)));
      const meters = Math.round(distancePx * METERS_PER_PIXEL);
      onChange({ latitude, longitude, radiusMeters: meters });
    },
    [latitude, longitude, onChange]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Latitude</Label>
          <Input
            type="number"
            step="0.0000001"
            value={latitude}
            onChange={(e) => onChange({ latitude: Number(e.target.value), longitude, radiusMeters })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Longitude</Label>
          <Input
            type="number"
            step="0.0000001"
            value={longitude}
            onChange={(e) => onChange({ latitude, longitude: Number(e.target.value), radiusMeters })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Radius (meters)</Label>
          <Input
            type="number"
            min={10}
            max={1000}
            value={radiusMeters}
            onChange={(e) => onChange({ latitude, longitude, radiusMeters: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-md border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">
          Drag the outer handle to set the geofence radius around the building marker.
        </p>
        <svg
          ref={svgRef}
          width={SIZE}
          height={SIZE}
          className="cursor-crosshair select-none rounded-full bg-background"
          onMouseMove={(e) => {
            if (dragging) updateRadiusFromPointer(e.clientX, e.clientY);
          }}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
        >
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={SIZE} height={SIZE} fill="url(#grid)" rx={SIZE / 2} />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={radiusPx}
            fill="hsl(var(--primary) / 0.12)"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
          />
          <circle cx={CENTER} cy={CENTER} r={6} fill="hsl(var(--primary))" />
          <circle
            cx={CENTER + radiusPx}
            cy={CENTER}
            r={8}
            fill="hsl(var(--background))"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            onMouseDown={() => setDragging(true)}
            className="cursor-ew-resize"
          />
        </svg>
        <p className="text-sm font-medium">{radiusMeters}m radius</p>
      </div>
    </div>
  );
}
