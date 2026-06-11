/* eslint-disable no-unused-expressions */
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

/**
 * Converts field values to CSV header format
 * CSV exports use regular dashes (-) while UI field values use em dashes (—)
 */
const convertToCsvHeaders = (fieldValues) => {
  return Object.entries(fieldValues).reduce((acc, [key, value]) => {
    acc[key] = value.replace('—', '-');
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

export default {
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
