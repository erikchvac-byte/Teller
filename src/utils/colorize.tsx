import React from "react";
import { Text } from "ink";

// Color codes for dyslexia-friendly high contrast
const COLORS = {
  red: "red",      // ERROR, FAILED, STOP, CRITICAL
  yellow: "yellow", // WARNING, CAUTION, ATTENTION, NOTE
  green: "green",   // OK, DONE, SUCCESS, COMPLETE, READY
} as const;

type ColorKey = keyof typeof COLORS;

// Keywords that trigger each color
const KEYWORDS: Record<ColorKey, RegExp> = {
  red: /\b(ERROR|FAILED|STOP|CRITICAL|PROBLEM|ISSUE|BROKEN)\b/gi,
  yellow: /\b(WARNING|CAUTION|ATTENTION|NOTE|NOTICE|ALERT|CAREFUL)\b/gi,
  green: /\b(OK|DONE|SUCCESS|COMPLETE|READY|WORKING|GOOD|GREAT|EXCELLENT)\b/gi,
};

/**
 * Parses text and returns an array of segments with color information.
 * Each segment is either colored (has a color prop) or plain text.
 */
export function parseColoredText(text: string): Array<{ text: string; color?: ColorKey }> {
  const segments: Array<{ text: string; color?: ColorKey }> = [];
  let remaining = text;
  
  // Find all keyword matches and their positions
  const matches: Array<{ start: number; end: number; color: ColorKey; text: string }> = [];
  
  for (const [color, regex] of Object.entries(KEYWORDS)) {
    let match;
    const regexCopy = new RegExp(regex.source, regex.flags);
    while ((match = regexCopy.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        color: color as ColorKey,
        text: match[0],
      });
    }
  }
  
  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);
  
  // Remove overlapping matches (keep first occurrence)
  const filteredMatches: typeof matches = [];
  for (const match of matches) {
    const overlaps = filteredMatches.some(
      m => (match.start >= m.start && match.start < m.end) || 
           (match.end > m.start && match.end <= m.end)
    );
    if (!overlaps) {
      filteredMatches.push(match);
    }
  }
  
  // Build segments
  let lastEnd = 0;
  for (const match of filteredMatches) {
    if (match.start > lastEnd) {
      segments.push({ text: text.slice(lastEnd, match.start) });
    }
    segments.push({ text: match.text, color: match.color });
    lastEnd = match.end;
  }
  
  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd) });
  }
  
  // If no matches, return the whole text
  if (segments.length === 0) {
    segments.push({ text });
  }
  
  return segments;
}

/**
 * React component that renders text with colored keywords.
 */
export function ColoredText({ text }: { text: string }): React.ReactElement {
  const segments = parseColoredText(text);
  
  return (
    <Text>
      {segments.map((segment, index) => (
        segment.color ? (
          <Text key={index} color={COLORS[segment.color]} bold>
            {segment.text}
          </Text>
        ) : (
          <Text key={index}>{segment.text}</Text>
        )
      ))}
    </Text>
  );
}
