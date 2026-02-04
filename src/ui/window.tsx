import React, { useState, useEffect } from "react";
import { render, Box, Text } from "ink";
import type { TellerObservation } from "../agent/teller.js";
import type { TerminalEvent } from "../capture/terminal-hook.js";
import type { OpencodeEvent } from "../capture/opencode-watcher.js";
import { ColoredText, ObservationText } from "../utils/colorize.js";
import type { ColorMode } from "../utils/colorize.js";
import { DyslexiaText } from "./dyslexia-text.js";

type AnyEvent = TerminalEvent | OpencodeEvent | { type: "git_commit" | "git_unstaged", source: "git", command: string, timestamp: number };

interface AppProps {
  eventEmitter: {
    on(event: "event", cb: (e: AnyEvent) => void): void;
    on(event: "observation", cb: (o: TellerObservation) => void): void;
    on(event: "status", cb: (msg: string) => void): void;
    on(event: "error", cb: (err: Error) => void): void;
  };
}

interface LogEntry {
  id: number;
  text: string;
  type: "event" | "observation" | "status" | "error";
  timestamp: number;
}

let nextId = 0;

function App({ eventEmitter }: AppProps) {
  const [dimensions, setDimensions] = useState({
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24
  });
  const [events, setEvents] = useState<LogEntry[]>([]);
  const [observations, setObservations] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState("Starting Teller...");
  const [eventCount, setEventCount] = useState(0);

  // Track terminal dimensions for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 24
      });
    };

    process.stdout.on('resize', handleResize);

    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  // Height calculations for deterministic layout
  const HEADER_HEIGHT = 2;  // banner (2 lines: name + events/status)
  const DIVIDER_HEIGHT = 1; // blank line
  const EVENTS_HEIGHT = 6;  // events section - compact single-line format
  const FOOTER_HEIGHT = 1;   // quit instruction
  const PADDING = 2;         // dividers around events and observations

  // Calculate observation box height explicitly
  const observationsHeight = dimensions.rows - HEADER_HEIGHT - DIVIDER_HEIGHT - EVENTS_HEIGHT - DIVIDER_HEIGHT - FOOTER_HEIGHT - PADDING;

  // Ensure we don't have negative height on very small terminals
  const safeObservationsHeight = Math.max(observationsHeight, 1);

  useEffect(() => {
    eventEmitter.on("event", (e: AnyEvent) => {
      setEventCount((c) => c + 1);
      let text: string;

      if (e.source === "terminal") {
        text = `$ ${(e as TerminalEvent).command}`;
      } else if (e.source === "git") {
        // Format git events to show key changes
        const gitEvent = e as { type: string, command: string };
        if (gitEvent.type === "git_commit") {
          // Extract first meaningful line from commit
          const lines = gitEvent.command.split('\n');
          const summary = lines.find(l => l.startsWith('+') && !l.startsWith('+++')) || lines[0];
          text = `📝 commit: ${summary?.slice(0, 50) || lines[0].slice(0, 50)}`;
        } else {
          // Unstaged changes - show what file changed
          const lines = gitEvent.command.split('\n');
          const diffLine = lines.find(l => l.startsWith('diff --git')) || "";
          const file = diffLine.match(/b\/(.+)$/)?.[1] || "files";
          text = `✏️ editing: ${file}`;
        }
      } else {
        const oc = e as OpencodeEvent;
        // RULE: Naming convention - Human/Teller (no model/provider tags)
        const role = oc.role === "user" ? "Human" : "Teller";
        text = `(${role}) ${(oc.content || "").slice(0, 60)}`;
      }
      setEvents((prev) => {
        const entry: LogEntry = {
          id: nextId++,
          text,
          type: "event",
          timestamp: Date.now(),
        };
        return [...prev.slice(-49), entry]; // keep last 50
      });
    });

    eventEmitter.on("observation", (o: TellerObservation) => {
      setObservations((prev) => {
        const entry: LogEntry & { depth?: string } = {
          id: nextId++,
          text: o.text,
          type: "observation",
          timestamp: o.timestamp,
          depth: o.depth
        };
        return [...prev.slice(-49), entry]; // keep last 50
      });
    });

    eventEmitter.on("status", (msg: string) => {
      setStatus(msg);
    });

    eventEmitter.on("error", (err: Error) => {
      setStatus(`Error: ${err.message}`);
    });
  }, [eventEmitter]);

  const time = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const generateDivider = (width: number) => {
    return '═'.repeat(width);
  };

  const OBSERVATIONS_VISIBLE_COUNT = 6;

  return (
    <Box flexDirection="column" height={dimensions.rows} backgroundColor="black">
      {/* SECTION: BANNER - Line 1: Name, Line 2: Events • Status */}
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="cyan">
          TELLER
        </Text>
        <Text dimColor color="cyan">
          •[{eventCount} events] • {status}
        </Text>
      </Box>

      {/* Fat divider line between banner and events */}
      <Box paddingX={1}>
        <Text dimColor color="gray">{generateDivider(dimensions.columns - 2)}</Text>
      </Box>

       {/* SECTION: EVENT FEED - Scrollable activity log */}
       {/* RULE: Fixed height, tail slicing for scroll, blank line padding below */}
       {/* RULE: Naming: Human/Teller (no model tags) */}
       <Box
         flexDirection="column"
         height={EVENTS_HEIGHT}
         paddingX={1}
         overflow="hidden"
       >
         <Text dimColor color="gray">
           — events —
         </Text>
         {events.length === 0 ? (
           <Text dimColor>Waiting for activity...</Text>
         ) : (
           events.slice(-5).map((e) => (
             <Text key={e.id} dimColor wrap="truncate">
               {time(e.timestamp)} {e.text}
             </Text>
           ))
         )}
       </Box>

      {/* Fat divider line between events and observations */}
      <Box paddingX={1}>
        <Text dimColor color="yellow">{generateDivider(dimensions.columns - 2)}</Text>
      </Box>

      {/* SECTION: OBSERVER - Expandable colored observations */}
      {/* RULE: Fills remaining space, semantic colors, explicit footer padding */}
      <Box
        flexDirection="column"
        height={safeObservationsHeight}
        paddingX={1}
        overflow="hidden"
        backgroundColor="black"
      >
        <Text bold underline color="yellow">
          Observations
        </Text>
        {observations.length === 0 ? (
          <Text dimColor>Teller is watching... first analysis in ~15s</Text>
        ) : (
          observations.slice(-OBSERVATIONS_VISIBLE_COUNT).map((o) => (
              <Box key={o.id} flexDirection="column" marginBottom={1}>
                <Box>
                  <Text dimColor>{time(o.timestamp)}</Text>
                  {o.type === "observation" && (o as any).depth && (
                    <Text color={(o as any).depth === "deep" ? "green" : (o as any).depth === "quick" ? "gray" : "white"} dimColor>
                      {" "}[{(o as any).depth}]
                    </Text>
                  )}
                </Box>
                <ObservationText text={o.text} mode="semantic" />
              </Box>
          ))
        )}
        {/* This empty box always ensures that black space fills to the bottom */}
        <Box flexGrow={1} backgroundColor="black">
          <Text color="black"> </Text>
        </Box>
      </Box>

      {/* Fat divider line above footer */}
      <Box paddingX={1}>
        <Text dimColor color="gray">{generateDivider(dimensions.columns - 2)}</Text>
      </Box>

      {/* SECTION: FOOTER - Fixed quit instruction */}
      {/* RULE: Pinned bottom, separated from content by blank line */}
      <Box paddingX={1}>
        <Text dimColor>Ctrl+C to quit</Text>
      </Box>
    </Box>
  );
}

export function renderApp(eventEmitter: AppProps["eventEmitter"]) {
  const instance = render(<App eventEmitter={eventEmitter} />);
  return instance;
}
