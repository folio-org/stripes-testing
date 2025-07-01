/* eslint-disable no-unused-expressions */
import { Marc } from 'marcjs';
import { Readable } from 'stream';

/**
 * Returns an array of default assertions for a MARC record.
 */
const getDefaultAssertions = () => {
  return [
    (record) => expect(record.leader).to.exist,
    (record) => expect(record.get('001')).to.not.be.empty,
    (record) => expect(record.get('005')).to.not.be.empty,
    (record) => expect(record.get('005')[0].value).to.match(/^[0-9]{14}\.[0-9]{1}$/),
    (record) => expect(record.get('008')).to.not.be.empty,
  ];
};

/**
 * Parses an MRC file, retrieves records by their UUIDs stored in the '999' field,
 * and performs assertions on those records.
 *
 * @param {string} fileName - The path to the MRC file.
 * @param {Array<{ uuid: string, assertions: Array<Function> }>} recordsToVerify -
 *   An array of objects where each object contains:
 *     - `uuid` {string}: The unique identifier for the record (stored in the '999' field).
 *     - `assertions` {Array<Function>}: An array of assertion functions to validate the record.
 *       Each function receives the record as its argument and performs specific checks.
 * @param {number} expectedTotalRecords - The expected total number of records in the file.
 * @param {boolean} [isDefaultAssertionRequired=true] - Whether to run default assertions in addition to custom ones.
 * @param {boolean} [isAuthority=false] - A flag indicating whether the records are authority records.
 * @returns {Promise<void>} - A promise that resolves when all assertions pass, or rejects with an error.
 */

export default function parseMrcFileContentAndVerify(
  fileName,
  recordsToVerify,
  expectedTotalRecords,
  isDefaultAssertionRequired = true,
  isAuthority = false,
) {
  return cy.readFile(`cypress/downloads/${fileName}`, 'binary').then((fileContent) => {
    if (!fileContent) {
      throw new Error('File content is undefined');
    }
    const readable = new Readable();
    readable.push(Buffer.from(fileContent, 'binary'));
    readable.push(null); // Signify end of stream

    const reader = Marc.stream(readable, 'Iso2709');

    let totalRecordsCount = 0;
    const uuidAssertionsMap = new Map(
      recordsToVerify.map((record) => [record.uuid, record.assertions]),
    );

    return new Promise((resolve, reject) => {
      reader.on('data', (record) => {
        totalRecordsCount++;

        const uuidField = record.get('999');
        const recordUuid = isAuthority ? uuidField[0].subf[1][1] : uuidField[0].subf[0][1];

        if (uuidAssertionsMap.has(recordUuid)) {
          let assertions = uuidAssertionsMap.get(recordUuid);
          if (isDefaultAssertionRequired) {
            assertions = [...getDefaultAssertions(), ...assertions];
          }
          try {
            assertions.forEach((assertion) => assertion(record));
            uuidAssertionsMap.delete(recordUuid); // Remove the UUID once verified
          } catch (error) {
            reject(
              new Error(`Assertion failed for record with UUID ${recordUuid}: ${error.message}`),
            );
          }
        }
      });

      reader.on('error', (error) => reject(error));
      reader.on('end', () => {
        try {
          expect(totalRecordsCount).to.equal(expectedTotalRecords);
          if (uuidAssertionsMap.size > 0) {
            const missingUuids = Array.from(uuidAssertionsMap.keys());
            reject(
              new Error(
                `The following UUIDs were not found in the file: ${missingUuids.join(', ')}`,
              ),
            );
          } else {
            resolve();
          }
        } catch (error) {
          reject(new Error(`Total records count assertion failed: ${error.message}`));
        }
      });
    });
  });
}
