"use client";

import { LiveTrackingBoard } from "@/components/admin/live-tracking-board";

export default function LiveTrackingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Tracking</h1>
        <p className="text-sm text-muted-foreground">
          Real-time view of every quiz currently in progress. Refreshes automatically every 12 seconds.
        </p>
      </div>

      <LiveTrackingBoard />
    </div>
  );
}
