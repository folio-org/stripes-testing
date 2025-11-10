/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Create Deprecated Indicator Code API', () => {
  // User with all required permissions to create fields, indicators, and indicator codes
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
  ];

  const LOCAL_FIELD_TAG = '991'; // Using 991 as unique tag for this test
  const TEST_CASE_ID = 'C499671';

  let user;
  let bibliographicSpec;
  let fieldId;
  let indicator1Id;
  let testData;

  before('Setup test data', () => {
    cy.getAdminToken();

    // Get bibliographic specification and clean up
    getBibliographicSpec().then((spec) => {
      bibliographicSpec = spec;

      // Clean up any existing field with the same tag to ensure clean state
      cy.deleteSpecificationFieldByTag(bibliographicSpec.id, LOCAL_FIELD_TAG, false);

      // Create user with required permissions
      cy.createTempUser(requiredPermissions).then((createdUser) => {
        user = createdUser;

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

          // Create indicator 1 for the field using generated data
          const indicator1Data = testData.indicators[0];
          const indicator1Payload = {
            order: indicator1Data.order,
            label: indicator1Data.label,
            repeatable: false,
            required: false,
            deprecated: false,
            scope: 'local',
          };

          cy.createSpecificationFieldIndicator(fieldId, indicator1Payload).then(
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
    // Switch back to admin token for cleanup operations
    cy.getAdminToken();

    // Delete the field (cascades to indicators and codes)
    if (fieldId) {
      cy.deleteSpecificationField(fieldId, false);
    }

    // Delete the user
    if (user?.userId) {
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499671 Create Deprecated Indicator code of Local field for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C499671', 'spitfire'] },
    () => {
      // Use the created user's token
      cy.getUserToken(user.username, user.password).then(() => {
        // Step 1: Create indicator code with deprecated: true
        const deprecatedTruePayload = {
          code: '1',
          label: `AT_${TEST_CASE_ID}_Deprecated - true test`,
          deprecated: true,
        };

        cy.createSpecificationIndicatorCode(indicator1Id, deprecatedTruePayload).then(
          (createResponse1) => {
            validateApiResponse(createResponse1, 201);

            // Validate response structure and deprecated flag
            const responseBody1 = createResponse1.body;
            expect(responseBody1.id).to.exist;
            expect(responseBody1.indicatorId).to.eq(indicator1Id);
            expect(responseBody1.code).to.eq('1');
            expect(responseBody1.label).to.eq(`AT_${TEST_CASE_ID}_Deprecated - true test`);
            expect(responseBody1.deprecated).to.be.true;
            expect(responseBody1.scope).to.eq('local');
            expect(responseBody1.metadata).to.exist;
            expect(responseBody1.metadata.createdDate).to.exist;
            expect(responseBody1.metadata.updatedDate).to.exist;

            // Step 2: Create indicator code with deprecated: false
            const deprecatedFalsePayload = {
              code: '2',
              label: `AT_${TEST_CASE_ID}_Deprecated - false test`,
              deprecated: false,
            };

            cy.createSpecificationIndicatorCode(indicator1Id, deprecatedFalsePayload).then(
              (createResponse2) => {
                validateApiResponse(createResponse2, 201);

                // Validate response structure and deprecated flag
                const responseBody2 = createResponse2.body;
                expect(responseBody2.id).to.exist;
                expect(responseBody2.indicatorId).to.eq(indicator1Id);
                expect(responseBody2.code).to.eq('2');
                expect(responseBody2.label).to.eq(`AT_${TEST_CASE_ID}_Deprecated - false test`);
                expect(responseBody2.deprecated).to.be.false;
                expect(responseBody2.scope).to.eq('local');
                expect(responseBody2.metadata).to.exist;
                expect(responseBody2.metadata.createdDate).to.exist;
                expect(responseBody2.metadata.updatedDate).to.exist;

                // Step 3: Try to create indicator code with invalid deprecated value
                const invalidDeprecatedPayload = {
                  code: '3',
                  label: `AT_${TEST_CASE_ID}_Deprecated - invalid test`,
                  deprecated: 'test', // Invalid value - should be boolean
                };

                cy.createSpecificationIndicatorCode(
                  indicator1Id,
                  invalidDeprecatedPayload,
                  false,
                ).then((errorResponse) => {
                  // Validate error response
                  expect(errorResponse.status).to.eq(400);
                  expect(errorResponse.body).to.have.property('errors');
                  expect(errorResponse.body.errors).to.be.an('array');
                  expect(errorResponse.body.errors.length).to.be.greaterThan(0);

                  // Check for JSON parse error message
                  const errorMessage = errorResponse.body.errors[0].message;
                  expect(errorMessage).to.include('JSON parse error');
                  expect(errorMessage).to.include('Cannot deserialize value of type');
                  expect(errorMessage).to.include('java.lang.Boolean');
                  expect(errorMessage).to.include('test');
                });
              },
            );
          },
        );
      });
    },
  );
});
