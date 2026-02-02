import React, { useState, useEffect, useRef } from "react";
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
  label?: string;
}

let nextId = 0;

function App({ eventEmitter }: AppProps) {
  const [events, setEvents] = useState<LogEntry[]>([]);
  const [observations, setObservations] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState("Starting Teller...");
  const [eventCount, setEventCount] = useState(0);
  const lastLabelRef = useRef<string>("");

  useEffect(() => {
    eventEmitter.on("event", (e: AnyEvent) => {
      setEventCount((c) => c + 1);
      let text: string;
      let label: string | undefined;

      if (e.source === "terminal") {
        text = `$ ${(e as TerminalEvent).command}`;
      } else {
        const oc = e as OpencodeEvent;
        label = [oc.provider, oc.model].filter(Boolean).join("/") || undefined;

        const showTag = label && label !== lastLabelRef.current;
        if (label && label !== lastLabelRef.current) {
          lastLabelRef.current = label;
        }

        const tagPart = showTag ? `[${label}] ` : "";
        text = `${tagPart}(${oc.role}) ${oc.content.slice(0, 120)}`;
      }
      setEvents((prev) => {
        const entry: LogEntry = {
          id: nextId++,
          text,
          type: "event",
          timestamp: Date.now(),
          label,
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
      {/* Floor-to-ceiling black background - everything inside is black except text */}
      
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" paddingX={1} backgroundColor="black">
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

      {/* Divider */}
      <Box backgroundColor="black">
        <Text color="black"> </Text>
      </Box>

      {/* Event Feed */}
      <Box
        flexDirection="column"
        height={8}
        paddingX={1}
        overflow="hidden"
        backgroundColor="black"
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
              <Text color="white">{e.text}</Text>
            </Text>
          ))
        )}
      </Box>

      {/* Divider */}
      <Box backgroundColor="black">
        <Text color="black"> </Text>
      </Box>

      {/* Observations - BIG BLACK BOX - fills all remaining space */}
      <Box
        flexDirection="column"
        flexGrow={1}
        paddingX={1}
        overflow="hidden"
        backgroundColor="black"
      >
        <Text bold underline color="yellow">
          Observations
        </Text>
        <Box flexDirection="column" flexGrow={1}>
          {observations.length === 0 ? (
            <Text dimColor>Teller is watching... first analysis in ~15s</Text>
          ) : (
            observations.slice(-OBSERVATIONS_VISIBLE_COUNT).reverse().map((o) => (
              <Box key={o.id} flexDirection="column" marginBottom={1} backgroundColor="black">
                <Text dimColor>{time(o.timestamp)}</Text>
                <ColoredText text={o.text} mode="semantic" />
              </Box>
            ))
          )}
          {/* This empty box ensures the black space fills to the bottom */}
          <Box flexGrow={1} backgroundColor="black">
            <Text color="black"> </Text>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box paddingX={1} backgroundColor="black">
        <Text dimColor>Ctrl+C to quit</Text>
      </Box>
    </Box>
  );
}

export function renderApp(eventEmitter: AppProps["eventEmitter"]) {
  const instance = render(<App eventEmitter={eventEmitter} />);
  return instance;
}
