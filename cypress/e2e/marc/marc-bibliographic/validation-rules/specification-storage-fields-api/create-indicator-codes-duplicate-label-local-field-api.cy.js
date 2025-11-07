/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Create Indicator Code with Duplicate Label API', () => {
  // User with all required permissions to create fields, indicators, and indicator codes
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
  ];

  const LOCAL_FIELD_TAG = '985';
  const TEST_CASE_ID = 'C499665';
  const DUPLICATE_LABEL = `AT_${TEST_CASE_ID}_Duplicate label$ - test 1`;

  let user;
  let bibliographicSpec;
  let fieldId;
  let indicator1Id;
  let indicatorCode1Id;
  let indicatorCode2Id;
  let testData;

  before('Setup test data', () => {
    cy.getAdminToken();

    // Create user with required permissions
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;

      // Get bibliographic specification
      getBibliographicSpec().then((spec) => {
        bibliographicSpec = spec;

        // Clean up any existing field with the same tag
        cy.deleteSpecificationFieldByTag(bibliographicSpec.id, LOCAL_FIELD_TAG, false);

        // Create local field for testing
        const fieldTestDataBuilder = createFieldTestDataBuilder(TEST_CASE_ID);
        testData = fieldTestDataBuilder
          .withField(LOCAL_FIELD_TAG, 'Local Field', {
            repeatable: true,
            required: false,
            deprecated: false,
          })
          .withIndicator(1, 'Indicator 1')
          .build();

        cy.createSpecificationField(bibliographicSpec.id, testData.field).then((fieldResponse) => {
          validateApiResponse(fieldResponse, 201);
          fieldId = fieldResponse.body.id;
          const indicator1Data = testData.indicators[0];
          cy.createSpecificationFieldIndicator(fieldId, indicator1Data).then(
            (indicator1Response) => {
              validateApiResponse(indicator1Response, 201);
              indicator1Id = indicator1Response.body.id;
            },
          );
        });
      });
    });
  });

  after('Complete cleanup', () => {
    // Delete the field (cascades to indicators and codes)
    cy.getAdminToken();
    if (fieldId) {
      cy.deleteSpecificationField(fieldId, false);
    }

    // Delete the user
    if (user?.userId) {
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499665 Create Indicator code of Local field with duplicate "label" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C499665', 'spitfire'] },
    () => {
      // Use the created user's token
      cy.getUserToken(user.username, user.password).then(() => {
        // Step 1: Create first indicator code with specific label
        const indicatorCode1Payload = {
          code: '1',
          label: DUPLICATE_LABEL,
        };

        cy.createSpecificationIndicatorCode(indicator1Id, indicatorCode1Payload).then(
          (createResponse1) => {
            validateApiResponse(createResponse1, 201);
            indicatorCode1Id = createResponse1.body.id;

            // Validate response structure and content
            const responseBody1 = createResponse1.body;
            expect(responseBody1.id).to.exist;
            expect(responseBody1.indicatorId).to.eq(indicator1Id);
            expect(responseBody1.code).to.eq('1');
            expect(responseBody1.label).to.eq(DUPLICATE_LABEL);
            expect(responseBody1.deprecated).to.be.false;
            expect(responseBody1.scope).to.eq('local');
            expect(responseBody1.metadata).to.exist;
            expect(responseBody1.metadata.createdDate).to.exist;
            expect(responseBody1.metadata.updatedDate).to.exist;

            // Step 2: Create second indicator code with the same label but different code
            const indicatorCode2Payload = {
              code: '2',
              label: DUPLICATE_LABEL, // Same label as first code
            };

            cy.createSpecificationIndicatorCode(indicator1Id, indicatorCode2Payload).then(
              (createResponse2) => {
                validateApiResponse(createResponse2, 201);
                indicatorCode2Id = createResponse2.body.id;

                // Validate response structure and content for second code
                const responseBody2 = createResponse2.body;
                expect(responseBody2.id).to.exist;
                expect(responseBody2.id).to.not.eq(indicatorCode1Id); // Different IDs
                expect(responseBody2.indicatorId).to.eq(indicator1Id);
                expect(responseBody2.code).to.eq('2'); // Different code
                expect(responseBody2.label).to.eq(DUPLICATE_LABEL); // Same label as first
                expect(responseBody2.deprecated).to.be.false;
                expect(responseBody2.scope).to.eq('local');
                expect(responseBody2.metadata).to.exist;
                expect(responseBody2.metadata.createdDate).to.exist;
                expect(responseBody2.metadata.updatedDate).to.exist;

                // Step 3: Verify both codes exist by retrieving all codes for the indicator
                cy.getSpecificationIndicatorCodes(indicator1Id).then((getResponse) => {
                  validateApiResponse(getResponse, 200);
                  const codes = getResponse.body.codes;

                  expect(codes, 'Indicator should have exactly 2 codes').to.have.length(2);

                  // Find and validate both codes
                  const code1 = codes.find((c) => c.code === '1');
                  const code2 = codes.find((c) => c.code === '2');

                  expect(code1, 'Code 1 should exist').to.exist;
                  expect(code1.id).to.eq(indicatorCode1Id);
                  expect(code1.label).to.eq(DUPLICATE_LABEL);

                  expect(code2, 'Code 2 should exist').to.exist;
                  expect(code2.id).to.eq(indicatorCode2Id);
                  expect(code2.label).to.eq(DUPLICATE_LABEL);

                  // Verify both codes have the same label but different codes and IDs
                  expect(code1.label).to.eq(code2.label, 'Both codes should have the same label');
                  expect(code1.code).to.not.eq(code2.code, 'Codes should be different');
                  expect(code1.id).to.not.eq(code2.id, 'IDs should be different');
                });
              },
            );
          },
        );
      });
    },
  );
});
