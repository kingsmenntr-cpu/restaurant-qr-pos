"use client";
import { useEffect, useState, useRef } from "react";

type RealtimeEvent = { type: string; payload: any; notification?: any };

export function useRealtime(pollFn?: () => Promise<void>, intervalMs = 3000) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // BroadcastChannel for instant updates across tabs
    try {
      const bc = new BroadcastChannel("restaurant-pos-realtime");
      bcRef.current = bc;
      bc.onmessage = (e) => {
        setEvents(prev => [e.data, ...prev].slice(0, 50));
        if (pollFn) pollFn();
      };
    } catch {}

    // Polling fallback (BR-027: without refresh)
    let timer: any;
    if (pollFn) {
      timer = setInterval(() => {
        pollFn().catch(()=>{});
      }, intervalMs);
    }

    return () => {
      if (timer) clearInterval(timer);
      bcRef.current?.close();
    };
  }, [pollFn, intervalMs]);

  const broadcast = (event: RealtimeEvent) => {
    try {
      bcRef.current?.postMessage(event);
    } catch {}
    setEvents(prev => [event, ...prev].slice(0, 50));
  };

  return { events, broadcast, isConnected };
}

export function useSound(enabled = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZQAAABkY29tAAAA");
      // We'll use Web Audio API for beep
    }
  }, []);

  const playBeep = () => {
    if (!enabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  return { playBeep };
}
