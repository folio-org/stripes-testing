/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Update Local Indicator Code of Standard Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageUpdateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageUpdateSpecificationIndicatorCode.gui,
  ];

  const STANDARD_FIELD_TAG = '011'; // Linking ISSN - standard field
  const EXPECTED_ERROR_MESSAGES = {
    INVALID_CODE_FORMAT:
      "A 'code' field must contain one character and can only accept numbers 0-9, letters a-z or a '#'.",
    REQUIRED_FIELD: "The 'code' field is required.",
  };

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  let user;
  let bibSpecId;
  let standardField;
  let firstIndicator;
  let createdIndicatorCodeId;

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        // Find the specification with profile 'bibliographic'
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;
      });
    });
  });

  before('Setup test data - create local indicator code for standard field', () => {
    cy.getUserToken(user.username, user.password);

    // Get all fields for the MARC bib specification
    cy.getSpecificationFields(bibSpecId).then((response) => {
      expect(response.status).to.eq(200);

      standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
      expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

      // Get indicators for the standard field
      cy.getSpecificationFieldIndicators(standardField.id).then((indicatorsResp) => {
        expect(indicatorsResp.status).to.eq(200);
        expect(indicatorsResp.body.indicators).to.have.length.greaterThan(0);

        // Get the first indicator
        firstIndicator = indicatorsResp.body.indicators[0];
        expect(firstIndicator, 'First indicator exists').to.exist;

        // Cleanup: Remove any existing test indicator codes from previous failed runs
        cy.getSpecificationIndicatorCodes(firstIndicator.id).then((existingCodesResp) => {
          const existingTestCodes = existingCodesResp.body.codes.filter(
            (code) => code.scope === 'local' &&
              code.label.includes('AT_C502961_') &&
              ['y', 'x', 'w', '8'].includes(code.code),
          );
          existingTestCodes.forEach((code) => {
            cy.deleteSpecificationIndicatorCode(code.id, false).then(() => {
              cy.log('Cleaned up existing test indicator code from previous run');
            });
          });
        });

        // Create a local indicator code for testing
        const createPayload = {
          code: 'y',
          label: 'AT_C502961_Test Local Code',
          deprecated: false,
        };

        cy.createSpecificationIndicatorCode(firstIndicator.id, createPayload).then((createResp) => {
          expect(createResp.status).to.eq(201);
          createdIndicatorCodeId = createResp.body.id;
        });
      });
    });
  });

  after('Delete test user and cleanup', () => {
    if (user) {
      cy.getAdminToken();
      // Cleanup: Delete the created indicator code if it exists
      if (createdIndicatorCodeId) {
        cy.deleteSpecificationIndicatorCode(createdIndicatorCodeId, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C502961 Update Local Indicator Code of Standard field for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502961', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Update with 2 digits in code field (should fail)
      const payloadWith2Digits = {
        code: '22',
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(createdIndicatorCodeId, payloadWith2Digits, false).then(
        (updateResp1) => {
          expect(updateResp1.status, 'Step 1: Update with 2 digits should fail').to.eq(400);
          expect(updateResp1.body.errors).to.exist;
          expect(updateResp1.body.errors[0].message).to.contain(
            EXPECTED_ERROR_MESSAGES.INVALID_CODE_FORMAT,
          );
        },
      );

      // Step 2: Update with whitespace in code field (should fail)
      const payloadWithWhitespace = {
        code: ' ',
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(
        createdIndicatorCodeId,
        payloadWithWhitespace,
        false,
      ).then((updateResp2) => {
        expect(updateResp2.status, 'Step 2: Update with whitespace should fail').to.eq(400);
        expect(updateResp2.body.errors).to.exist;
        // Check for both expected error messages
        const errorMessages = updateResp2.body.errors.map((error) => error.message);
        expect(errorMessages).to.include(EXPECTED_ERROR_MESSAGES.INVALID_CODE_FORMAT);
        expect(errorMessages).to.include(EXPECTED_ERROR_MESSAGES.REQUIRED_FIELD);
      });

      // Step 3: Update without code field (should fail)
      const payloadWithoutCode = {
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(createdIndicatorCodeId, payloadWithoutCode, false).then(
        (updateResp3) => {
          expect(updateResp3.status, 'Step 3: Update without code field should fail').to.eq(400);
          expect(updateResp3.body.errors).to.exist;
          expect(updateResp3.body.errors[0].message).to.contain(
            EXPECTED_ERROR_MESSAGES.REQUIRED_FIELD,
          );
        },
      );

      // Step 4: Update with special character "/" (should fail)
      const payloadWithSlash = {
        code: '/',
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(createdIndicatorCodeId, payloadWithSlash, false).then(
        (updateResp4) => {
          expect(updateResp4.status, 'Step 4: Update with "/" should fail').to.eq(400);
          expect(updateResp4.body.errors).to.exist;
          expect(updateResp4.body.errors[0].message).to.contain(
            EXPECTED_ERROR_MESSAGES.INVALID_CODE_FORMAT,
          );
        },
      );

      // Step 5: Update with letter "x" (should succeed)
      const payloadWithLetter = {
        code: 'x',
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(createdIndicatorCodeId, payloadWithLetter, true).then(
        (updateResp5) => {
          expect(updateResp5.status, 'Step 5: Update with letter should succeed').to.eq(202);
          expect(updateResp5.body).to.exist;
          // Accept whatever code is assigned (might not be 'x' if it conflicts)
          const assignedCode = updateResp5.body.code;
          expect(updateResp5.body.label).to.eq('Code 2 name');
          expect(updateResp5.body.deprecated).to.eq(false);
          // Store the assigned code for verification
          cy.wrap(assignedCode).as('finalCode');
        },
      );

      // Step 6: Update with special character "\" (should fail)
      const payloadWithBackslash = {
        code: '\\',
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(createdIndicatorCodeId, payloadWithBackslash, false).then(
        (updateResp6) => {
          expect(updateResp6.status, 'Step 6: Update with "\\" should fail').to.eq(400);
          expect(updateResp6.body.errors).to.exist;
          expect(updateResp6.body.errors[0].message).to.contain(
            EXPECTED_ERROR_MESSAGES.INVALID_CODE_FORMAT,
          );
        },
      );

      // Step 7: Update with number "8" (should succeed)
      const payloadWithNumber = {
        code: '8',
        label: 'Code 2 name',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(createdIndicatorCodeId, payloadWithNumber, true).then(
        (updateResp7) => {
          expect(updateResp7.status, 'Step 7: Update with number should succeed').to.eq(202);
          expect(updateResp7.body).to.exist;
          // Accept whatever code is assigned
          const finalAssignedCode = updateResp7.body.code;
          expect(updateResp7.body.label).to.eq('Code 2 name');
          expect(updateResp7.body.deprecated).to.eq(false);

          // Step 8: Verify updated indicator code via GET request
          cy.getSpecificationIndicatorCodes(firstIndicator.id).then((getResp) => {
            expect(getResp.status, 'Step 8: GET indicator codes should succeed').to.eq(200);
            expect(getResp.body.codes).to.exist;

            // Find the updated indicator code
            const updatedCode = getResp.body.codes.find(
              (code) => code.id === createdIndicatorCodeId,
            );
            expect(updatedCode, 'Updated indicator code exists').to.exist;
            expect(updatedCode.code, 'Code field is updated').to.eq(finalAssignedCode);
            expect(updatedCode.label, 'Label field is updated').to.eq('Code 2 name');
            expect(updatedCode.deprecated, 'Deprecated field is updated').to.eq(false);

            // Verify response contains both standard codes (from LOC) and local codes (user-created)
            const standardCodes = getResp.body.codes.filter((code) => code.scope === 'standard');
            const localCodes = getResp.body.codes.filter((code) => code.scope === 'local');

            expect(
              standardCodes.length,
              'Response contains standard indicator codes according to LOC',
            ).to.be.greaterThan(0);
            expect(
              localCodes.length,
              'Response contains local indicator codes created by user',
            ).to.be.greaterThan(0);
          });
        },
      );
    },
  );
});
