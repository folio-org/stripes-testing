/**
 * @typedef {Object} ParseEdiFileOptions
 * @property {string} [segmentTerminator="'"] EDI segment terminator.
 */

/**
 * @typedef {Object} ParseEdiFileResult
 * @property {string} normalizedContent EDI content without line breaks.
 * @property {string[]} segments Parsed and trimmed EDI segments.
 * @property {Record<string, string[]>} segmentsByTag Segments grouped by EDI tag.
 */

/**
 * Parses EDI file content into normalized segments.
 *
 * @param {string} fileContent - The raw EDI file content.
 * @param {ParseEdiFileOptions} [options] - Parse options.
 * @returns {ParseEdiFileResult}
 */
export default function parseEdiFile(fileContent, options = {}) {
  const { segmentTerminator = "'" } = options;

  if (typeof fileContent !== 'string') {
    throw new TypeError('EDI parser expects file content as a string');
  }

  const normalizedContent = fileContent.replaceAll(/\r?\n/g, '');

  const segments = normalizedContent
    .split(segmentTerminator)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const segmentsByTag = segments.reduce((acc, segment) => {
    const [tag] = segment.split('+', 1);

    if (!acc[tag]) {
      acc[tag] = [];
    }

    acc[tag].push(segment);

    return acc;
  }, /** @type {Record<string, string[]>} */ ({}));

  return { normalizedContent, segments, segmentsByTag };
}
