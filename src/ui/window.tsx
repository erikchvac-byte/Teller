import React, { useState, useEffect, useRef } from "react";
import { render, Box, Text } from "ink";
import type { TellerObservation } from "../agent/teller.js";
import type { TerminalEvent } from "../capture/terminal-hook.js";
import type { OpencodeEvent } from "../capture/opencode-watcher.js";
import { ColoredText } from "../utils/colorize.js";

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
        text = `${tagPart}(${oc.role}) ${oc.content.slice(0, 60)}`;
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
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" paddingX={1} backgroundColor="black">
        <Text bold color="cyan" backgroundColor="black">
          TELLER_CLCC
        </Text>
        <Text dimColor color="cyan" backgroundColor="black">
          [{eventCount} events]
        </Text>
        <Text dimColor color="cyan" backgroundColor="black">
          {status}
        </Text>
      </Box>

      {/* Divider */}
      <Box backgroundColor="black">
        <Text backgroundColor="black"> </Text>
      </Box>

      {/* Event Feed */}
      <Box
        flexDirection="column"
        height={8}
        paddingX={1}
        overflow="hidden"
        backgroundColor="black"
      >
        <Text bold underline backgroundColor="black" color="gray">
          Events
        </Text>
        {events.length === 0 ? (
          <Text dimColor backgroundColor="black">Waiting for activity...</Text>
        ) : (
          events.slice(-6).map((e) => (
            <Text key={e.id} wrap="truncate" backgroundColor="black">
              <Text dimColor backgroundColor="black">{time(e.timestamp)}</Text>{" "}
              <Text backgroundColor="black">{e.text}</Text>
            </Text>
          ))
        )}
      </Box>

      {/* Divider */}
      <Box backgroundColor="black">
        <Text backgroundColor="black"> </Text>
      </Box>

      {/* Observations - fills all remaining space */}
      <Box
        flexDirection="column"
        flexGrow={1}
        paddingX={1}
        overflow="hidden"
        backgroundColor="black"
      >
        <Text bold underline color="yellow" backgroundColor="black">
          Observations
        </Text>
        {observations.length === 0 ? (
          <Text dimColor backgroundColor="black">Teller is watching... first analysis in ~15s</Text>
        ) : (
          observations.slice(-OBSERVATIONS_VISIBLE_COUNT).map((o) => (
            <Box key={o.id} flexDirection="column" marginBottom={1} backgroundColor="black">
              <Text dimColor backgroundColor="black">{time(o.timestamp)}</Text>
              <ColoredText text={o.text} />
            </Box>
          ))
        )}
      </Box>

      {/* Footer */}
      <Box paddingX={1} backgroundColor="black">
        <Text dimColor backgroundColor="black">Ctrl+C to quit</Text>
      </Box>
    </Box>
  );
}

export function renderApp(eventEmitter: AppProps["eventEmitter"]) {
  const instance = render(<App eventEmitter={eventEmitter} />);
  return instance;
}
