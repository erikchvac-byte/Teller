import React from "react";
import { Text } from "ink";

// Color codes for dyslexia-friendly high contrast
const COLORS = {
  red: "red",
  yellow: "yellow",
  green: "green",
  cyan: "cyan",
  magenta: "magenta",
  white: "white",
} as const;

type ColorKey = keyof typeof COLORS;

// Keywords that trigger each color (original behavior)
const KEYWORDS: Record<ColorKey, RegExp> = {
  red: /\b(ERROR|FAILED|STOP|CRITICAL|PROBLEM|ISSUE|BROKEN)\b/gi,
  yellow: /\b(WARNING|CAUTION|ATTENTION|NOTE|NOTICE|ALERT|CAREFUL)\b/gi,
  green: /\b(OK|DONE|SUCCESS|COMPLETE|READY|WORKING|GOOD|GREAT|EXCELLENT)\b/gi,
  cyan: /\b(INFO|DEBUG|LOG|TRACE)\b/gi,
  magenta: /\b(IMPORTANT|URGENT|PRIORITY)\b/gi,
  white: /\b(NORMAL|STANDARD|DEFAULT)\b/gi,
};

// Common prefixes and their meanings
const PREFIXES = [
  { prefix: "un", color: "cyan" as ColorKey },
  { prefix: "re", color: "cyan" as ColorKey },
  { prefix: "in", color: "cyan" as ColorKey },
  { prefix: "im", color: "cyan" as ColorKey },
  { prefix: "dis", color: "cyan" as ColorKey },
  { prefix: "over", color: "cyan" as ColorKey },
  { prefix: "mis", color: "cyan" as ColorKey },
  { prefix: "pre", color: "cyan" as ColorKey },
  { prefix: "sub", color: "cyan" as ColorKey },
  { prefix: "inter", color: "cyan" as ColorKey },
  { prefix: "semi", color: "cyan" as ColorKey },
  { prefix: "anti", color: "cyan" as ColorKey },
  { prefix: "auto", color: "cyan" as ColorKey },
  { prefix: "bi", color: "cyan" as ColorKey },
  { prefix: "co", color: "cyan" as ColorKey },
  { prefix: "de", color: "cyan" as ColorKey },
  { prefix: "en", color: "cyan" as ColorKey },
  { prefix: "ex", color: "cyan" as ColorKey },
  { prefix: "mono", color: "cyan" as ColorKey },
  { prefix: "non", color: "cyan" as ColorKey },
  { prefix: "out", color: "cyan" as ColorKey },
  { prefix: "post", color: "cyan" as ColorKey },
  { prefix: "pro", color: "cyan" as ColorKey },
  { prefix: "trans", color: "cyan" as ColorKey },
  { prefix: "tri", color: "cyan" as ColorKey },
  { prefix: "under", color: "cyan" as ColorKey },
];

// Common suffixes and their meanings
const SUFFIXES = [
  { suffix: "ing", color: "magenta" as ColorKey },
  { suffix: "ed", color: "magenta" as ColorKey },
  { suffix: "er", color: "magenta" as ColorKey },
  { suffix: "or", color: "magenta" as ColorKey },
  { suffix: "ion", color: "magenta" as ColorKey },
  { suffix: "tion", color: "magenta" as ColorKey },
  { suffix: "ation", color: "magenta" as ColorKey },
  { suffix: "sion", color: "magenta" as ColorKey },
  { suffix: "ly", color: "magenta" as ColorKey },
  { suffix: "ful", color: "magenta" as ColorKey },
  { suffix: "less", color: "magenta" as ColorKey },
  { suffix: "ness", color: "magenta" as ColorKey },
  { suffix: "ment", color: "magenta" as ColorKey },
  { suffix: "able", color: "magenta" as ColorKey },
  { suffix: "ible", color: "magenta" as ColorKey },
  { suffix: "ous", color: "magenta" as ColorKey },
  { suffix: "ive", color: "magenta" as ColorKey },
  { suffix: "ize", color: "magenta" as ColorKey },
  { suffix: "ise", color: "magenta" as ColorKey },
  { suffix: "en", color: "magenta" as ColorKey },
  { suffix: "ify", color: "magenta" as ColorKey },
  { suffix: "ty", color: "magenta" as ColorKey },
  { suffix: "ity", color: "magenta" as ColorKey },
  { suffix: "al", color: "magenta" as ColorKey },
  { suffix: "ial", color: "magenta" as ColorKey },
  { suffix: "ic", color: "magenta" as ColorKey },
  { suffix: "ical", color: "magenta" as ColorKey },
];

export interface Segment {
  text: string;
  color?: ColorKey;
  bold?: boolean;
}

/**
 * Parse text and apply keyword-based coloring
 */
function parseKeywordText(text: string): Segment[] {
  const segments: Segment[] = [];
  const matches: Array<{ start: number; end: number; color: ColorKey; text: string }> = [];

  for (const [color, regex] of Object.entries(KEYWORDS)) {
    const regexCopy = new RegExp(regex.source, regex.flags);
    let currentMatch = regexCopy.exec(text);
    while (currentMatch !== null) {
      matches.push({
        start: currentMatch.index,
        end: currentMatch.index + currentMatch[0].length,
        color: color as ColorKey,
        text: currentMatch[0],
      });
      currentMatch = regexCopy.exec(text);
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const filteredMatches: typeof matches = [];
  for (const match of matches) {
    const overlaps = filteredMatches.some(
      (m) =>
        (match.start >= m.start && match.start < m.end) ||
        (match.end > m.start && match.end <= m.end)
    );
    if (!overlaps) {
      filteredMatches.push(match);
    }
  }

  let lastEnd = 0;
  for (const match of filteredMatches) {
    if (match.start > lastEnd) {
      segments.push({ text: text.slice(lastEnd, match.start) });
    }
    segments.push({ text: match.text, color: match.color, bold: true });
    lastEnd = match.end;
  }

  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd) });
  }

  if (segments.length === 0) {
    segments.push({ text });
  }

  return segments;
}

/**
 * Split word into syllables using vowel patterns
 */
function splitSyllables(word: string): string[] {
  const vowels = "aeiouy";
  const syllables: string[] = [];
  let current = "";
  let lastWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const char = word[i].toLowerCase();
    const isVowel = vowels.includes(char);

    if (isVowel && !lastWasVowel && current.length > 0) {
      // Check if next chars form a common pattern
      const nextChars = word.slice(i, i + 2).toLowerCase();
      if (
        nextChars === "io" ||
        nextChars === "ia" ||
        nextChars === "ie" ||
        nextChars === "ua"
      ) {
        // Keep diphthongs together
      } else if (current.length >= 2) {
        syllables.push(current);
        current = "";
      }
    }

    current += word[i];
    lastWasVowel = isVowel;
  }

  if (current) {
    syllables.push(current);
  }

  // If no syllables split, return the whole word
  if (syllables.length === 0) {
    return [word];
  }

  return syllables;
}

/**
 * Apply syllable segmentation coloring
 * Alternates between cyan, yellow, and green for each syllable
 */
function parseSyllableText(text: string): Segment[] {
  const segments: Segment[] = [];
  const syllableColors: ColorKey[] = ["cyan", "yellow", "green"];
  let colorIndex = 0;

  // Split by whitespace to process each word
  const parts = text.split(/(\s+)/);

  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      // Whitespace - no color
      segments.push({ text: part });
    } else if (/^[^a-zA-Z]*$/.test(part)) {
      // Punctuation/numbers only
      segments.push({ text: part });
    } else {
      // Word - split into syllables
      const syllables = splitSyllables(part);
      for (const syllable of syllables) {
        segments.push({
          text: syllable,
          color: syllableColors[colorIndex % syllableColors.length],
        });
        colorIndex++;
      }
    }
  }

  return segments;
}

/**
 * Apply semantic contrast - highlight prefixes and suffixes
 */
function parseSemanticText(text: string): Segment[] {
  const segments: Segment[] = [];

  // Split by whitespace
  const parts = text.split(/(\s+)/);

  for (const part of parts) {
    if (/^\s+$/.test(part) || /^[^a-zA-Z]*$/.test(part)) {
      segments.push({ text: part });
      continue;
    }

    // Find prefix
    let remaining = part;
    let prefixMatch = null;
    for (const { prefix, color } of PREFIXES) {
      const regex = new RegExp(`^${prefix}`, "i");
      if (regex.test(remaining) && remaining.length > prefix.length + 2) {
        prefixMatch = { prefix, color, length: prefix.length };
        break;
      }
    }

    // Find suffix
    let suffixMatch = null;
    for (const { suffix, color } of SUFFIXES) {
      const regex = new RegExp(`${suffix}$`, "i");
      if (
        regex.test(remaining) &&
        remaining.length > suffix.length + (prefixMatch ? prefixMatch.length : 0) + 2
      ) {
        suffixMatch = { suffix, color, length: suffix.length };
        break;
      }
    }

    // Build segments for this word
    let pos = 0;
    let hasSegments = false;

    if (prefixMatch) {
      const prefixText = part.slice(0, prefixMatch.length);
      segments.push({ text: prefixText, color: prefixMatch.color, bold: true });
      pos = prefixMatch.length;
      hasSegments = true;
    }

    const coreStart = pos;
    const coreEnd = suffixMatch ? part.length - suffixMatch.length : part.length;

    if (coreEnd > coreStart) {
      segments.push({ text: part.slice(coreStart, coreEnd) });
      hasSegments = true;
    }

    if (suffixMatch) {
      const suffixText = part.slice(part.length - suffixMatch.length);
      segments.push({ text: suffixText, color: suffixMatch.color, bold: true });
      hasSegments = true;
    }

    // If no prefix or suffix found, just add the word
    if (!hasSegments) {
      segments.push({ text: part });
    }
  }

  return segments;
}

/**
 * Apply "disappearing" trick - color only first and last letters
 */
function parseDisappearingText(text: string): Segment[] {
  const segments: Segment[] = [];
  const parts = text.split(/(\s+)/);

  for (const part of parts) {
    if (/^\s+$/.test(part) || /^[^a-zA-Z]*$/.test(part) || part.length <= 2) {
      segments.push({ text: part });
      continue;
    }

    const first = part[0];
    const middle = part.slice(1, -1);
    const last = part[part.length - 1];

    // First letter - cyan
    segments.push({ text: first, color: "cyan", bold: true });
    // Middle - dimmed (no color, appears to disappear)
    segments.push({ text: middle });
    // Last letter - cyan
    segments.push({ text: last, color: "cyan", bold: true });
  }

  return segments;
}

export type ColorMode = "keywords" | "syllables" | "semantic" | "disappearing";

/**
 * Parse text based on the selected coloring mode
 */
export function parseColoredText(text: string, mode: ColorMode = "keywords"): Segment[] {
  switch (mode) {
    case "syllables":
      return parseSyllableText(text);
    case "semantic":
      return parseSemanticText(text);
    case "disappearing":
      return parseDisappearingText(text);
    case "keywords":
    default:
      return parseKeywordText(text);
  }
}

interface ColoredTextProps {
  text: string;
  mode?: ColorMode;
}

/**
 * React component that renders text with dyslexia-friendly coloring
 */
export function ColoredText({ text, mode = "keywords" }: ColoredTextProps): React.ReactElement {
  const segments = parseColoredText(text, mode);

  // Wrap all segments in a single <Text> so they render inline (not one-per-line)
  return (
    <Text>
      {segments.map((segment, index) => {
        const key = `${index}-${segment.color ?? 'nc'}`;
        if (segment.color) {
          return (
            <Text key={key} color={COLORS[segment.color]} bold={segment.bold}>
              {segment.text}
            </Text>
          );
        }
        return segment.text;
      })}
    </Text>
  );
}

interface ObservationSection {
  type: "main" | "confidence" | "evidence" | "risk" | "next";
  text: string;
}

const SECTION_COLORS: Record<string, ColorKey> = {
  confidence: "yellow",
  evidence: "cyan",
  risk: "red",
  next: "green",
};

/**
 * Parse observation text into sections with type and content
 */
function parseObservationSections(text: string): ObservationSection[] {
  const sections: ObservationSection[] = [];
  
  // First try | separator format
  const pipeParts = text.split('|').map(p => p.trim());
  let usedPipeFormat = false;
  
  for (const part of pipeParts) {
    const lowerPart = part.toLowerCase();
    
    if (lowerPart.startsWith('confidence:') || lowerPart.startsWith('confidence:')) {
      usedPipeFormat = true;
      break;
    }
  }
  
  if (usedPipeFormat) {
    // Parse | separated format
    for (const part of pipeParts) {
      const lowerPart = part.toLowerCase();
      
      if (lowerPart.startsWith('confidence:')) {
        sections.push({
          type: 'confidence',
          text: part.substring('confidence:'.length).trim()
        });
      } else if (lowerPart.startsWith('evidence:')) {
        sections.push({
          type: 'evidence',
          text: part.substring('evidence:'.length).trim()
        });
      } else if (lowerPart.startsWith('risk:')) {
        sections.push({
          type: 'risk',
          text: part.substring('risk:'.length).trim()
        });
      } else if (lowerPart.startsWith('next:')) {
        sections.push({
          type: 'next',
          text: part.substring('next:'.length).trim()
        });
      } else if (part.length > 0) {
        sections.push({
          type: 'main',
          text: part
        });
      }
    }
  } else {
    // Parse bracket format: [CONFIDENCE] MEDIUM, [EVIDENCE] ..., etc.
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (/^\[CONFIDENCE\]/i.test(trimmedLine)) {
        sections.push({
          type: 'confidence',
          text: trimmedLine.replace(/^\[CONFIDENCE\]\s*/i, '').trim()
        });
      } else if (/^\[EVIDENCE\]/i.test(trimmedLine)) {
        sections.push({
          type: 'evidence',
          text: trimmedLine.replace(/^\[EVIDENCE\]\s*/i, '').trim()
        });
      } else if (/^\[RISK\]/i.test(trimmedLine)) {
        sections.push({
          type: 'risk',
          text: trimmedLine.replace(/^\[RISK\]\s*/i, '').trim()
        });
      } else if (/^\[NEXT\]/i.test(trimmedLine)) {
        sections.push({
          type: 'next',
          text: trimmedLine.replace(/^\[NEXT\]\s*/i, '').trim()
        });
      } else if (trimmedLine.length > 0) {
        sections.push({
          type: 'main',
          text: trimmedLine
        });
      }
    }
  }
  
  return sections;
}

interface ObservationTextProps {
  text: string;
  mode?: ColorMode;
}

/**
 * React component that renders observation text with colored section prefixes
 */
export function ObservationText({ text, mode = "semantic" }: ObservationTextProps): React.ReactElement {
  const sections = parseObservationSections(text);
  
  return (
    <Text>
      {sections.map((section) => {
        const isMain = section.type === 'main';
        const sectionId = `${section.type}-${section.text.slice(0, 20)}`;
        
        if (isMain) {
          // Main text without prefix, just colored by mode
          const segments = parseColoredText(section.text, mode);
          return (
            <React.Fragment key={`main-${sectionId}`}>
              {segments.map((segment, segIndex) => {
                const key = `${sectionId}-seg-${segIndex}-${segment.color ?? 'nc'}`;
                if (segment.color) {
                  return (
                    <Text key={key} color={COLORS[segment.color]} bold={segment.bold}>
                      {segment.text}
                    </Text>
                  );
                }
                return segment.text;
              })}
              {'\n'}
            </React.Fragment>
          );
        } else {
          // Section with colored prefix
          const color = SECTION_COLORS[section.type];
          const prefixLabel = section.type.toUpperCase();
          return (
            <React.Fragment key={`${sectionId}`}>
              <Text color={COLORS[color]} bold>
                [{prefixLabel}]
              </Text>
              {' '}
              <Text>
                {section.text}
              </Text>
              {'\n'}
            </React.Fragment>
          );
        }
      })}
    </Text>
  );
}
