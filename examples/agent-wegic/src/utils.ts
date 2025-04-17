export function fixFormat(text: string): string {
  // Remove blank lines
  const lines = text.split('\n').filter(line => line.trim() !== '');

  // Fix numbered titles (e.g., "1. Title" -> "1.Title")
  const fixedLines = lines.map(line => {
    // Match patterns like "1. ", "2. ", etc.
    let fixedLine = line.replace(/(\d+)\.\s+/g, '$1.');

    // Remove all bold formatting from unordered list items
    if (fixedLine.trim().startsWith('-')) {
      fixedLine = fixedLine.replace(/\*\*/g, '');
    }

    return fixedLine;
  });

  return fixedLines.join('\n');
}

export function checkWordCount(text: string): string {
  // Split by whitespace and filter out empty strings
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;

  return `Word count: ${wordCount} words`;
}
