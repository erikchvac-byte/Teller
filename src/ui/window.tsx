import React, { useState, useEffect, useRef } from "react";
import { render, Box, Text } from "ink";
import type { TellerObservation } from "../agent/teller.js";
import type { TerminalEvent } from "../capture/terminal-hook.js";
import type { OpencodeEvent } from "../capture/opencode-watcher.js";

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
        return [...prev.slice(-19), entry]; // keep last 20
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
        return [...prev.slice(-9), entry]; // keep last 10
      });
    });

    eventEmitter.on("status", (msg: string) => {
      setStatus(msg);
    });

    eventEmitter.on("error", (err: Error) => {
      setStatus(`Error: ${err.message}`);
    });
  }, []);

  const time = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">
          TELLER
        </Text>
        <Text> — observational coding companion</Text>
        <Text dimColor>
          {"  "}[{eventCount} events captured]
        </Text>
      </Box>

      {/* Status */}
      <Box marginY={0} paddingX={1}>
        <Text dimColor>{status}</Text>
      </Box>

      {/* Two-pane layout */}
      <Box flexDirection="row" minHeight={16}>
        {/* Left: Event Feed */}
        <Box
          flexDirection="column"
          width="50%"
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
        >
          <Text bold underline>
            Event Feed
          </Text>
          {events.length === 0 ? (
            <Text dimColor>Waiting for terminal activity...</Text>
          ) : (
            events.map((e) => (
              <Text key={e.id} wrap="truncate">
                <Text dimColor>{time(e.timestamp)}</Text> <Text>{e.text}</Text>
              </Text>
            ))
          )}
        </Box>

        {/* Right: Observations */}
        <Box
          flexDirection="column"
          width="50%"
          borderStyle="single"
          borderColor="yellow"
          paddingX={1}
        >
          <Text bold underline color="yellow">
            Observations
          </Text>
          {observations.length === 0 ? (
            <Text dimColor>Teller is watching... first analysis in ~15s</Text>
          ) : (
            observations.map((o) => (
              <Box key={o.id} flexDirection="column" marginBottom={1}>
                <Text dimColor>{time(o.timestamp)}</Text>
                <Text color="yellow">{o.text}</Text>
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* Footer */}
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
