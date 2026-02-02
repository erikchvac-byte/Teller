import React, { useState, useEffect } from "react";
import { render, Box, Text } from "ink";
import type { TellerObservation } from "../agent/teller.js";
import type { TerminalEvent } from "../capture/terminal-hook.js";
import type { OpencodeEvent } from "../capture/opencode-watcher.js";
import { ColoredText } from "../utils/colorize.js";
import type { ColorMode } from "../utils/colorize.js";

type AnyEvent = TerminalEvent | OpencodeEvent;

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
  const [events, setEvents] = useState<LogEntry[]>([]);
  const [observations, setObservations] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState("Starting Teller...");
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    eventEmitter.on("event", (e: AnyEvent) => {
      setEventCount((c) => c + 1);
      let text: string;

      if (e.source === "terminal") {
        text = `$ ${(e as TerminalEvent).command}`;
      } else {
        const oc = e as OpencodeEvent;
        // RULE: Naming convention - Human/Teller (no model/provider tags)
        const role = oc.role === "user" ? "Human" : "Teller";
        text = `(${role}) ${oc.content.slice(0, 60)}`;
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
        const entry: LogEntry = {
          id: nextId++,
          text: o.text,
          type: "observation",
          timestamp: o.timestamp,
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

  const OBSERVATIONS_VISIBLE_COUNT = 6;

  return (
    <Box flexDirection="column" height="100%" backgroundColor="black">
      {/* SECTION: BANNER - Fixed header with app title, event count, status */}
      {/* RULE: Single line, title bold/cyan, blank line padding above/below */}
      <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
        <Text bold color="cyan">
          TELLER_CLCC
        </Text>
        <Text dimColor color="cyan">
          [{eventCount} events]
        </Text>
        <Text dimColor color="cyan">
          {status}
        </Text>
      </Box>

      {/* Divider: Blank line for visual separation */}
      <Box>
        <Text> </Text>
      </Box>

      {/* SECTION: EVENT FEED - Scrollable activity log */}
      {/* RULE: Fixed height, tail slicing for scroll, blank line padding below */}
      {/* RULE: Naming: Human/Teller (no model tags) */}
      <Box
        flexDirection="column"
        height={8}
        paddingX={1}
        overflow="hidden"
      >
        <Text bold underline color="gray">
          Events
        </Text>
        {events.length === 0 ? (
          <Text dimColor>Waiting for activity...</Text>
        ) : (
          events.slice(-6).map((e) => (
            <Text key={e.id} wrap="truncate">
              <Text dimColor>{time(e.timestamp)}</Text>{" "}
              <Text>{e.text}</Text>
            </Text>
          ))
        )}
      </Box>

      {/* Divider: Blank line for visual separation */}
      <Box>
        <Text> </Text>
      </Box>

      {/* SECTION: OBSERVER - Expandable colored observations */}
      {/* RULE: Fills remaining space, semantic colors, explicit footer padding */}
      <Box
        flexDirection="column"
        flexGrow={1}
        paddingX={1}
        overflow="hidden"
      >
        <Text bold underline color="yellow">
          Observations
        </Text>
        {observations.length === 0 ? (
          <Text dimColor>Teller is watching... first analysis in ~15s</Text>
        ) : (
          observations.slice(-OBSERVATIONS_VISIBLE_COUNT).map((o) => (
            <Box key={o.id} flexDirection="column" marginBottom={1}>
              <Text dimColor>{time(o.timestamp)}</Text>
              <ColoredText text={o.text} mode="semantic" />
            </Box>
          ))
        )}
      </Box>

      {/* Divider: Explicit blank line padding above footer */}
      <Box>
        <Text> </Text>
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
