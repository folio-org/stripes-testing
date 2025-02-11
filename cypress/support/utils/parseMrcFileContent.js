import { Marc } from 'marcjs';
import { Readable } from 'stream';

/**
 * Parses an MRC file, retrieves a specific record, and performs assertions on that record.
 *
 * @param {string} fileName - The path to the MRC file.
 * @param {number} recordIndex - The index of the record to retrieve.
 * @param {Array} assertions - An array of functions that will perform assertions on the record.
 * @param {number} expectedTotalRecords - The expected total number of records in the file.
 * @returns {Promise<void>} - A promise that resolves when all assertions pass, or rejects with an error.
 */

export default function parseMrcFileContentAndVerify(
  fileName,
  recordIndexInFile,
  assertions,
  expectedTotalRecords,
) {
  return cy.readFile(`cypress/downloads/${fileName}`, 'binary').then((fileContent) => {
    if (!fileContent) {
      throw new Error('File content is undefined');
    }
    const readable = new Readable();
    readable.push(Buffer.from(fileContent, 'binary'));
    readable.push(null); // Signify end of stream

    const reader = Marc.stream(readable, 'Iso2709');
    let currentRecord = 0;
    let totalRecordsCount = 0;

    return new Promise((resolve, reject) => {
      reader.on('data', (record) => {
        totalRecordsCount++;
        if (currentRecord === recordIndexInFile) {
          try {
            assertions.forEach((assertion) => assertion(record));
            resolve();
          } catch (error) {
            reject(error);
          }
        }
        currentRecord++;
      });

      reader.on('error', (error) => reject(error));
      reader.on('end', () => {
        try {
          expect(totalRecordsCount).to.equal(expectedTotalRecords);
          resolve();
        } catch (error) {
          reject(new Error(`Total records count assertion failed: ${error.message}`));
        }
      });
    });
  });
}
