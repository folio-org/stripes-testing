/* eslint-disable no-unused-expressions */
import { recurse } from 'cypress-recurse';

import FileManager from '../../utils/fileManager';
import {
  instanceFieldValues,
  holdingsFieldValues,
  itemFieldValues,
  usersFieldValues,
  transactionFieldValues,
  organizationFieldValues,
  purchaseOrderLinesFieldValues,
} from '../bulk-edit/query-modal';
import { LOANS_FIELDS } from '../../constants/query-builder/loansFields';

/**
 * Converts field values to CSV header format
 * CSV exports use regular dashes (-) while UI field values use em dashes (—)
 * Handles both flat and nested objects
 */
export const convertToCsvHeaders = (fieldValues) => {
  return Object.entries(fieldValues).reduce((acc, [key, value]) => {
    if (typeof value === 'object' && value !== null) {
      // Recursively handle nested objects
      acc[key] = convertToCsvHeaders(value);
    } else if (typeof value === 'string') {
      // Convert em dash to regular dash for strings
      acc[key] = value.replace(/—/g, '-');
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
};

// Pre-converted CSV headers for all field types
export const instanceCsvHeaders = convertToCsvHeaders(instanceFieldValues);
export const holdingsCsvHeaders = convertToCsvHeaders(holdingsFieldValues);
export const itemCsvHeaders = convertToCsvHeaders(itemFieldValues);
export const usersCsvHeaders = convertToCsvHeaders(usersFieldValues);
export const transactionCsvHeaders = convertToCsvHeaders(transactionFieldValues);
export const organizationCsvHeaders = convertToCsvHeaders(organizationFieldValues);
export const purchaseOrderLinesCsvHeaders = convertToCsvHeaders(purchaseOrderLinesFieldValues);
export const loansCsvHeaders = convertToCsvHeaders(LOANS_FIELDS);

export default {
  /**
   * Verifies that a downloaded Lists CSV contains the requested headers and values.
   * Header order is intentionally ignored because all-columns exports can gain fields.
   *
   * @param {string} fileName Exported list name without the `.csv` extension.
   * @param {object} expectedContent Expected CSV content.
   * @param {string[]} [expectedContent.headers=[]] Column names that must be present.
   * @param {Array<string|number|boolean>} [expectedContent.values=[]] Values that must
   *   occur in at least one parsed CSV cell.
   * @returns {Cypress.Chainable} Cypress chainable resolving with the parsed CSV rows.
   */
  verifyDownloadedCsvContains(fileName, { headers = [], values = [] }) {
    const fileMask = `${fileName}.csv`;
    const timeout = Math.max(Number(Cypress.env('downloadTimeout')) || 0, 30000);
    // Lists exports replace em dashes with hyphens and expand POL to PO line.
    // Normalizing expected and actual headers lets UI field constants serve both views.
    const normalizeHeader = (header) => String(header)
      .replace(/ — /g, ' - ')
      .replace(/\bPOL\b/g, 'PO line');
    const includesExpectedRawContent = (content) => {
      if (typeof content !== 'string' || content.trim() === '') return false;

      const normalizedContent = normalizeHeader(content);
      return (
        headers.every((header) => normalizedContent.includes(normalizeHeader(header))) &&
        values.every((value) => content.includes(String(value)))
      );
    };

    // Chrome can expose a new download before it has finished writing it. Each retry
    // performs a fresh read. Parse only after the expected content is present, because
    // feeding a partially written quoted field to the CSV parser can fail immediately.
    return recurse(
      () => FileManager.findDownloadedFilesByMask(fileMask).then((matchingFiles) => {
        if (!matchingFiles?.length) return null;

        const sortedFiles = matchingFiles.sort();
        return FileManager.readFile(sortedFiles[sortedFiles.length - 1]);
      }),
      includesExpectedRawContent,
      { delay: 500, timeout, log: false },
    )
      .then((content) => {
        // Reuse the repository parser so quoted commas, escaped quotes, BOMs, and embedded
        // line breaks are interpreted as CSV structure instead of ordinary string content.
        return cy.task('convertCsvToJson', content, { log: false });
      })
      .then((rows) => {
        expect(rows, 'parsed downloaded CSV rows').to.be.an('array').and.not.be.empty;

        const parsedHeaders = Object.keys(rows[0]).map(normalizeHeader);
        const parsedValues = rows.flatMap((row) => Object.values(row).map(String));

        headers.forEach((header) => {
          expect(parsedHeaders, 'CSV headers').to.include(normalizeHeader(header));
        });
        values.forEach((value) => {
          expect(
            parsedValues.some((cell) => cell.includes(String(value))),
            `CSV contains value "${value}"`,
          ).to.equal(true);
        });

        return rows;
      });
  },

  /**
   * Verifies CSV file headers and values by finding a row with a specific identifier
   * @param {string} listName - Name of the list (used to construct CSV filename)
   * @param {string} identifierHeader - Column name to use for finding the target row
   * @param {string} identifierValue - Value to match in the identifier column
   * @param {Array<{header: string, value: string}>} targetValues - Array of header-value pairs to verify
   * @returns {Cypress.Chainable} Cypress chainable
   */
  verifyHeaderAndValuesInCsvFileByIdentifier(
    listName,
    identifierHeader,
    identifierValue,
    targetValues,
  ) {
    const fileName = `${listName}.csv`;

    return FileManager.convertCsvToJson(fileName).then((jsonDataArray) => {
      expect(jsonDataArray).to.be.an('array').and.not.be.empty;

      const targetRow = jsonDataArray.find((row) => row[identifierHeader] === identifierValue);

      expect(targetRow).to.exist;

      targetValues.forEach((pair) => {
        const actualValue = targetRow[pair.header];

        expect(actualValue).to.equal(pair.value);
      });
    });
  },
};
