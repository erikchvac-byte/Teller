import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput } from "ink";
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
  id: string;
  text: string;
  type: "event" | "observation" | "status" | "error";
  timestamp: number;
}

// Generate unique IDs that persist across hot reloads
let nextId = Date.now();
const getNextId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function App({ eventEmitter }: AppProps) {
  const [dimensions, setDimensions] = useState({
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24
  });
  const [events, setEvents] = useState<LogEntry[]>([]);
  const [observations, setObservations] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState("Starting Teller...");
  const [eventCount, setEventCount] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0); // 0 = latest, positive = scrolled back

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
  const HEADER_HEIGHT = 4;  // banner (4 lines: ASCII art)
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
        // RULE: Naming convention - H/T (no model/provider tags)
        const role = oc.role === "user" ? "H" : "T";
        text = `(${role}) ${(oc.content || "").slice(0, 60)}`;
      }
      setEvents((prev) => {
        const entry: LogEntry = {
          id: getNextId(),
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
          id: getNextId(),
          text: o.text,
          type: "observation",
          timestamp: o.timestamp,
          depth: o.depth
        };
        return [...prev.slice(-49), entry]; // keep last 50
      });
      // Track new observations when scrolled up
      setScrollOffset((currentOffset) => {
        if (currentOffset > 0) {
          setNewObservationsPending((n) => n + 1);
        }
        return currentOffset;
      });
    });

    eventEmitter.on("status", (msg: string) => {
      setStatus(msg);
    });

    eventEmitter.on("error", (err: Error) => {
      setStatus(`Error: ${err.message}`);
    });
  }, [eventEmitter]);

  const MAX_OBSERVATIONS = 50;
  
  // Calculate approximate lines per observation based on content length
  const estimateLinesForObservation = (text: string): number => {
    // Rough estimate: timestamp (1 line) + wrapped text + margin
    const contentWidth = dimensions.columns - 4; // account for padding
    const estimatedTextLines = Math.max(1, Math.ceil(text.length / contentWidth));
    return estimatedTextLines + 2; // +1 for timestamp, +1 for margin
  };
  
  // Calculate visible count dynamically based on recent observations
  const getVisibleCount = (): number => {
    if (observations.length === 0) return 1;
    
    let totalLines = 1; // header line
    let count = 0;
    
    // Start from newest observations and count until we exceed height
    for (let i = observations.length - 1; i >= 0 && totalLines < safeObservationsHeight; i--) {
      const obs = observations[i];
      const linesNeeded = estimateLinesForObservation(obs.text);
      
      if (totalLines + linesNeeded <= safeObservationsHeight) {
        totalLines += linesNeeded;
        count++;
      } else {
        break;
      }
    }
    
    return Math.max(1, count);
  };
  
  const visibleCount = getVisibleCount();

  const [newObservationsPending, setNewObservationsPending] = useState(0);

  // Keyboard handler for scrolling observations
  useInput((input, key) => {
    setScrollOffset(prev => {
      const maxScroll = Math.max(0, observations.length - visibleCount);
      
      if (key.upArrow) {
        // Scroll back (older)
        return Math.min(prev + 1, maxScroll);
      } else if (key.downArrow) {
        // Scroll forward (newer)
        const newOffset = Math.max(prev - 1, 0);
        if (newOffset === 0) setNewObservationsPending(0);
        return newOffset;
      } else if (key.pageUp) {
        // Page up - scroll back by visible count
        return Math.min(prev + visibleCount, maxScroll);
      } else if (key.pageDown) {
        // Page down - scroll forward by visible count
        const newOffset = Math.max(prev - visibleCount, 0);
        if (newOffset === 0) setNewObservationsPending(0);
        return newOffset;
      } else if (input === 'k') {
        // Scroll back (older) - vim style
        return Math.min(prev + 1, maxScroll);
      } else if (input === 'j') {
        // Scroll forward (newer) - vim style
        const newOffset = Math.max(prev - 1, 0);
        if (newOffset === 0) setNewObservationsPending(0);
        return newOffset;
      } else if (input === 'g') {
        // Go to oldest
        return maxScroll;
      } else if (input === 'G') {
        // Go to newest
        setNewObservationsPending(0);
        return 0;
      }
      return prev;
    });
  });

  const time = (ts: number) => {
    const date = new Date(ts);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')}${ampm}`;
  };

  const generateDivider = (width: number) => {
    return '═'.repeat(width);
  };

  return (
    <Box flexDirection="column" height={dimensions.rows} backgroundColor="black">
      {/* SECTION: BANNER - ASCII Art */}
      <Box paddingX={0} flexDirection="column">
        <Text bold color="cyan">
          {"      _____ ___ _   _   ___ ___ "}
        </Text>
        <Text bold color="cyan">
          {"     |_   _| __| | | | | __| _ \\"}
        </Text>
        <Text bold color="cyan">
          {"       | | | _|| |_| |_| _|| v /"}
        </Text>
        <Text bold color="cyan">
          {"       |_| |___|___|___|___|_|_\\ "}
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
            — events [{eventCount}] —
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
        <Box justifyContent="center">
          <Text bold underline color="yellow">
            Observations
          </Text>
          {scrollOffset > 0 && (
            <Text dimColor color="cyan"> [{scrollOffset} back]</Text>
          )}
          {newObservationsPending > 0 && (
            <Text bold color="green"> [{newObservationsPending} new ↓]</Text>
          )}
        </Box>
        {observations.length === 0 ? (
          <Box justifyContent="center">
            <Text dimColor>Waiting for observations...</Text>
          </Box>
         ) : (
           // Calculate visible window with scroll offset using dynamic sizing
           (() => {
             const endIdx = observations.length - scrollOffset;
             let startIdx = Math.max(0, endIdx - visibleCount);
             
             // Ensure we don't go beyond array bounds
             startIdx = Math.max(0, Math.min(startIdx, observations.length - 1));
             
             const visibleObservations = observations.slice(startIdx, endIdx);
             
             return visibleObservations.map((o) => (
               <Box key={o.id} flexDirection="column" marginBottom={1}>
                 <Box justifyContent="center">
                   <Text dimColor>{time(o.timestamp)}</Text>
                   {o.type === "observation" && (o as any).depth && (
                     <Text color={(o as any).depth === "deep" ? "green" : (o as any).depth === "quick" ? "gray" : "white"} dimColor>
                       {" "}[{(o as any).depth}]
                     </Text>
                   )}
                 </Box>
                 <Box justifyContent="center">
                   <ObservationText text={o.text} mode="semantic" />
                 </Box>
               </Box>
             ));
           })()
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
      <Box paddingX={1} justifyContent="flex-start">
        <Text dimColor>Ctrl+C to quit</Text>
      </Box>
    </Box>
  );
}

export function renderApp(eventEmitter: AppProps["eventEmitter"]) {
  const instance = render(<App eventEmitter={eventEmitter} />);
  return instance;
}
