/* eslint-disable no-unused-expressions */
import { Marc } from 'marcjs';
import { Readable } from 'stream';
import DateTools from './dateTools';

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
 * Parses an MRC file, retrieves records by their unique identifiers (UUIDs),
 * and performs assertions on those records.
 *
 * The function automatically searches for the UUID across multiple MARC fields by iterating
 * through all subfields in each record. It matches any subfield value that exists in the
 * provided recordsToVerify array, making it flexible for different export mapping profiles.
 *
 * @param {string} fileName - The path to the MRC file (relative to cypress/downloads/).
 * @param {Array<{ uuid: string, assertions: Array<Function> }>} recordsToVerify -
 *   An array of objects where each object contains:
 *     - `uuid` {string}: The unique identifier for the record. This will be automatically
 *       located within any MARC field/subfield in the exported record.
 *     - `assertions` {Array<Function>}: An array of assertion functions to validate the record.
 *       Each function receives the record as its argument and performs specific checks.
 * @param {number} expectedTotalRecords - The expected total number of records in the file.
 * @param {boolean} [isDefaultAssertionRequired=true] - Whether to run default assertions
 *   (leader, 001, 005, 008 fields) in addition to custom ones.
 * @returns {Promise<void>} - A promise that resolves when all assertions pass, or rejects with an error.
 */

export default function parseMrcFileContentAndVerify(
  fileName,
  recordsToVerify,
  expectedTotalRecords,
  isDefaultAssertionRequired = true,
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

        // Iterate through all fields to find a unique identifier that matches our assertions map
        let recordIdentifier = null;

        for (const field of record.fields) {
          if (Array.isArray(field) && field.length > 2) {
            // Check all subfields in the current field
            for (let i = 2; i < field.length; i += 2) {
              const subfieldValue = field[i + 1];
              if (subfieldValue && uuidAssertionsMap.has(subfieldValue)) {
                recordIdentifier = subfieldValue;
                break;
              }
            }
            if (recordIdentifier) break;
          }
        }

        if (!recordIdentifier) {
          return;
        }

        if (uuidAssertionsMap.has(recordIdentifier)) {
          let assertions = uuidAssertionsMap.get(recordIdentifier);
          if (isDefaultAssertionRequired) {
            assertions = [...getDefaultAssertions(), ...assertions];
          }
          try {
            assertions.forEach((assertion) => assertion(record));
            uuidAssertionsMap.delete(recordIdentifier); // Remove the UUID once verified
          } catch (error) {
            reject(
              new Error(
                `Assertion failed for record with identifier ${recordIdentifier}: ${error.message}`,
              ),
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

export function verifyMarcFieldByTag(record, tag, { ind1 = ' ', ind2 = ' ', subfields = [] }) {
  const field = record.get(tag)[0];

  expect(field.ind1, `MARC tag ${tag} ind1`).to.eq(ind1);
  expect(field.ind2, `MARC tag ${tag} ind2`).to.eq(ind2);

  if (subfields.length > 0) {
    // Check if it's a single subfield ['a', 'value'] or multiple [['a', 'value1'], ['b', 'value2']]
    const isSingleSubfield = typeof subfields[0] === 'string';

    if (isSingleSubfield) {
      // Handle single subfield format: ['a', 'value']
      expect(field.subf[0], `MARC tag ${tag} subfield`).to.deep.eq(subfields);
    } else {
      // Handle multiple subfields format: [['a', 'value1'], ['b', 'value2']]
      subfields.forEach(([subfieldCode, subfieldValue]) => {
        expect(
          field.subf.some((sf) => sf[0] === subfieldCode && sf[1] === subfieldValue),
          `MARC tag ${tag} subfield $${subfieldCode}`,
        ).to.equal(true);
      });
    }
  }
}

export function verifyMarcFieldByTagWithMultipleSubfieldsInStrictOrder(
  record,
  tag,
  { ind1 = ' ', ind2 = ' ', subfields = [] },
) {
  verifyMarcFieldByTag(record, tag, { ind1, ind2 });

  if (subfields.length > 0) {
    const field = record.get(tag)[0];

    subfields.forEach(([subfieldCode, subfieldValue], index) => {
      expect(field.subf[index], `MARC tag ${tag} subfield at position ${index}`).to.deep.equal([
        subfieldCode,
        subfieldValue,
      ]);
    });
  }
}

export function verify001FieldValue(record, expectedValue) {
  const field001 = record.get('001')[0];

  expect(field001.value, 'MARC tag 001').to.eq(expectedValue);
}

export function verify005FieldValue(record, expectedValue = null) {
  const field005 = record.get('005')[0];
  const valueToCheck = expectedValue || DateTools.getCurrentDateYYYYMMDD();

  expect(field005.value.startsWith(valueToCheck), 'MARC tag 005').to.be.true;
}

export function verify008FieldValue(record, expectedValue) {
  const field008 = record.get('008')[0];

  expect(field008.value, 'MARC tag 008').to.eq(expectedValue);
}

export function verifyLeaderPositions(record, positions = {}) {
  expect(record.leader, 'Leader field').to.exist;

  Object.entries(positions).forEach(([position, expectedValue]) => {
    const pos = parseInt(position, 10);

    expect(record.leader[pos], `Leader position ${position}`).to.eq(expectedValue);
  });
}

export function verifyMarcFieldByFindingSubfield(
  record,
  tag,
  { ind1 = ' ', ind2 = ' ', findBySubfield, findByValue, subfields = [] },
) {
  const fields = record.get(tag);

  expect(fields, `MARC tag ${tag} should exist`).to.exist;
  expect(fields.length, `MARC tag ${tag} should have at least one occurrence`).to.be.greaterThan(0);

  // Find the field that contains the specified subfield value
  const targetField = fields.find((field) => {
    return field.subf.some((sf) => sf[0] === findBySubfield && sf[1] === findByValue);
  });

  expect(targetField, `MARC tag ${tag} with $${findBySubfield} = "${findByValue}" should exist`).to
    .exist;
  expect(targetField.ind1, `MARC tag ${tag} ind1`).to.eq(ind1);
  expect(targetField.ind2, `MARC tag ${tag} ind2`).to.eq(ind2);

  // Verify subfields in strict order if provided
  if (subfields.length > 0) {
    subfields.forEach(([subfieldCode, subfieldValue], index) => {
      expect(
        targetField.subf[index],
        `MARC tag ${tag} subfield at position ${index}`,
      ).to.deep.equal([subfieldCode, subfieldValue]);
    });
  }
}

export function verifyMarcFieldAbsence(record, tag) {
  const field = record.get(tag);

  expect(field, `MARC tag ${tag} should not exist`).to.be.empty;
}

export function verifyMarcFieldsWithIdenticalTagsAndSubfieldValues(
  record,
  tag,
  { ind1 = ' ', ind2 = ' ', expectedCount, subfields = [] },
) {
  const fields = record.get(tag);

  expect(fields, `MARC tag ${tag} should exist`).to.exist;
  expect(fields.length, `Number of ${tag} fields`).to.equal(expectedCount);

  // Verify each field has the correct indicators and subfields
  fields.forEach((field, fieldIndex) => {
    expect(field.ind1, `${tag} field ${fieldIndex + 1} ind1`).to.eq(ind1);
    expect(field.ind2, `${tag} field ${fieldIndex + 1} ind2`).to.eq(ind2);

    // Verify each specified subfield exists and has the expected value
    if (subfields.length > 0) {
      subfields.forEach(([subfieldCode, subfieldValue]) => {
        const subf = field.subf.find((sf) => sf[0] === subfieldCode);
        expect(subf, `${tag} field ${fieldIndex + 1} $${subfieldCode}`).to.exist;
        expect(subf[1], `${tag} field ${fieldIndex + 1} $${subfieldCode}`).to.eq(subfieldValue);
      });
    }
  });
}
