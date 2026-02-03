import React from "react";
import { Text, Box } from "ink";
import { parseColoredText, type ColorMode, type Segment } from "../utils/colorize.js";

// BDA (British Dyslexia Association) Style Guidelines:
// - Left-aligned text (never justified) - default in terminals
// - Wider line spacing (1.5-2x)
// - Shorter line length (50-70 characters)
// - Clear paragraph breaks with extra spacing
// - Sans-serif fonts handled by terminal emulator

interface WrappedSegment extends Segment {
  lineIndex: number;
}

/**
 * Wrap text to target line length while preserving color segments
 * Uses a "soft wrap" approach that breaks at word boundaries
 */
function wrapSegmentsToLines(
  segments: Segment[],
  targetLineLength: number = 60
): Segment[][] {
  const lines: Segment[][] = [];
  let currentLine: Segment[] = [];
  let currentLineLength = 0;

  for (const segment of segments) {
    const segmentText = segment.text;
    const segmentLength = segmentText.length;

    // If this segment fits entirely on current line, add it
    if (currentLineLength + segmentLength <= targetLineLength) {
      currentLine.push(segment);
      currentLineLength += segmentLength;
      continue;
    }

    // Need to split this segment
    let remainingText = segmentText;
    let remainingLength = segmentLength;

    while (remainingLength > 0) {
      const spaceLeft = targetLineLength - currentLineLength;

      if (spaceLeft <= 0) {
        // Current line is full, start a new one
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentLineLength = 0;
        continue;
      }

      // Take what fits
      const takeLength = Math.min(spaceLeft, remainingLength);
      const takeText = remainingText.slice(0, takeLength);

      currentLine.push({
        text: takeText,
        color: segment.color,
        bold: segment.bold,
      });

      remainingText = remainingText.slice(takeLength);
      remainingLength = remainingText.length;
      currentLineLength += takeLength;

      // If we've filled the line and there's more, flush it
      if (currentLineLength >= targetLineLength && remainingLength > 0) {
        lines.push(currentLine);
        currentLine = [];
        currentLineLength = 0;
      }
    }
  }

  // Don't forget the last line
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Detect paragraph breaks and split text into paragraphs
 * Paragraph breaks are: double newlines, or clear structural indicators
 */
function splitIntoParagraphs(text: string): string[] {
  // Split on double newlines or multiple blank lines
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

interface DyslexiaFriendlyTextProps {
  text: string;
  mode?: ColorMode;
  targetLineLength?: number;
  /**
   * Line spacing multiplier: 1 = normal, 1.5 = 1.5x, 2 = double
   * BDA recommends 1.5-2x for better readability
   */
  lineSpacing?: 1 | 1.5 | 2;
  /**
   * Extra spacing between paragraphs
   */
  paragraphSpacing?: boolean;
}

/**
 * Dyslexia-friendly text renderer following BDA guidelines
 * 
 * Features:
 * - Preserves all color coding from original ColoredText
 * - Wraps lines to 50-70 characters (optimal for dyslexic readers)
 * - Adds 1.5x or 2x line spacing for reduced visual crowding
 * - Provides clear paragraph breaks with extra spacing
 * - Maintains left alignment (never justified)
 */
export function DyslexiaFriendlyText({
  text,
  mode = "semantic",
  targetLineLength = 60,
  lineSpacing = 1.5,
  paragraphSpacing = true,
}: DyslexiaFriendlyTextProps): React.ReactElement {
  // Split into paragraphs first
  const paragraphs = splitIntoParagraphs(text);

  // If single paragraph with no breaks, treat whole text as one
  const contentToRender =
    paragraphs.length === 0 ? [text] : paragraphs.length === 1 ? [text] : paragraphs;

  return (
    <Box flexDirection="column">
      {contentToRender.map((paragraph, pIndex) => {
        // Parse colors for this paragraph
        const segments = parseColoredText(paragraph, mode);

        // Wrap to target line length
        const lines = wrapSegmentsToLines(segments, targetLineLength);

        // Calculate spacing: for 1.5x, we add a blank line after every 2 text lines
        // For 2x, we add a blank line after every text line
        const renderWithSpacing = () => {
          const result: React.ReactElement[] = [];

          lines.forEach((lineSegments, lineIndex) => {
            // Render the text line with preserved colors
            result.push(
              <Box key={`line-${pIndex}-${lineIndex}`} flexDirection="row">
                {lineSegments.map((segment, segIndex) => {
                  const key = `seg-${pIndex}-${lineIndex}-${segIndex}`;
                  if (segment.color) {
                    return (
                      <Text key={key} color={segment.color} bold={segment.bold}>
                        {segment.text}
                      </Text>
                    );
                  }
                  return <Text key={key}>{segment.text}</Text>;
                })}
              </Box>
            );

            // Add line spacing (blank lines)
            if (lineSpacing === 2) {
              // Double spacing: blank line after every line
              result.push(
                <Box key={`space-${pIndex}-${lineIndex}`}>
                  <Text> </Text>
                </Box>
              );
            } else if (lineSpacing === 1.5) {
              // 1.5 spacing: blank line after every second line
              if (lineIndex % 2 === 1) {
                result.push(
                  <Box key={`space-${pIndex}-${lineIndex}`}>
                    <Text> </Text>
                  </Box>
                );
              }
            }
          });

          return result;
        };

        return (
          <Box
            key={`para-${pIndex}`}
            flexDirection="column"
            marginBottom={paragraphSpacing && pIndex < contentToRender.length - 1 ? 1 : 0}
          >
            {renderWithSpacing()}
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * Simplified wrapper that can be used as a drop-in replacement for ColoredText
 * in the observations dialog, applying all BDA guidelines by default
 */
export function DyslexiaText({
  text,
  mode = "semantic",
}: {
  text: string;
  mode?: ColorMode;
}): React.ReactElement {
  return (
    <DyslexiaFriendlyText
      text={text}
      mode={mode}
      targetLineLength={60}
      lineSpacing={1.5}
      paragraphSpacing={true}
    />
  );
}
