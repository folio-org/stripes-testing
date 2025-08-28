/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - Standard Fields Indicator Codes API', () => {
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
    Permissions.specificationStorageDeleteSpecificationIndicatorCode.gui,
  ];

  const EXPECTED_ERROR_MESSAGE =
    "The 'indicator_code' modification is not allowed for standard scope.";
  const STANDARD_FIELD_TAG = '100';

  let user;
  let authoritySpecId;
  let standardField;
  let firstIndicator;
  let firstIndicatorCode;

  // Helper Functions
  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  function validateApiResponse(response, expectedStatus) {
    expect(response.status).to.eq(expectedStatus);
  }

  function createTestPayload(baseCode, field, newValue) {
    return {
      code: field === 'code' ? newValue : baseCode.code,
      label: field === 'label' ? newValue : baseCode.label,
      deprecated: field === 'deprecated' ? newValue : baseCode.deprecated,
    };
  }

  function getTestScenarios(baseIndicatorCode) {
    return [
      {
        description: 'Update code field',
        payload: createTestPayload(baseIndicatorCode, 'code', '4'),
      },
      {
        description: 'Update label field',
        payload: createTestPayload(baseIndicatorCode, 'label', 'Forename Updated'),
      },
      {
        description: 'Update deprecated field',
        payload: createTestPayload(baseIndicatorCode, 'deprecated', true),
      },
    ];
  }

  function testModificationAttempts(baseIndicatorCode) {
    const testScenarios = getTestScenarios(baseIndicatorCode);

    testScenarios.forEach((scenario, index) => {
      cy.updateSpecificationIndicatorCode(baseIndicatorCode.id, scenario.payload, false).then(
        (updateResp) => {
          expect(updateResp.status, `Step ${index + 1}: ${scenario.description}`).to.eq(400);
          expect(updateResp.body.errors[0].message).to.contain(EXPECTED_ERROR_MESSAGE);
        },
      );
    });
  }

  function verifyIndicatorCodesUnchanged(originalCodes) {
    cy.getSpecificationIndicatorCodes(firstIndicator.id).then((verifyResp) => {
      validateApiResponse(verifyResp, 200);
      expect(verifyResp.body.codes).to.have.length(originalCodes.length);

      verifyResp.body.codes.forEach((indicatorCode) => {
        const originalCode = originalCodes.find((orig) => orig.id === indicatorCode.id);
        expect(originalCode, 'Original indicator code exists').to.exist;
        expect(indicatorCode.code).to.eq(originalCode.code);
        expect(indicatorCode.label).to.eq(originalCode.label);
        expect(indicatorCode.deprecated).to.eq(originalCode.deprecated);
      });
    });
  }

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        // Find the specification with profile 'authority'
        const authoritySpec = specs.find((s) => s.profile === 'authority');
        expect(authoritySpec, 'MARC authority specification exists').to.exist;
        authoritySpecId = authoritySpec.id;
      });
    });
  });

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C502993 Cannot update Indicator Code of Standard Field for MARC authority spec (API) (spitfire)',
    { tags: ['criticalPath', 'C502993', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC authority specification
      cy.getSpecificationFields(authoritySpecId).then((response) => {
        validateApiResponse(response, 200);

        // Find a standard field (e.g., 100)
        standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
        expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

        // Get indicators for the standard field
        cy.getSpecificationFieldIndicators(standardField.id).then((indicatorsResp) => {
          validateApiResponse(indicatorsResp, 200);
          expect(indicatorsResp.body.indicators).to.have.length.greaterThan(0);

          // Get the first indicator
          firstIndicator = indicatorsResp.body.indicators[0];
          expect(firstIndicator, 'First indicator exists').to.exist;

          // Get indicator codes for the first indicator
          cy.getSpecificationIndicatorCodes(firstIndicator.id).then((codesResp) => {
            validateApiResponse(codesResp, 200);
            expect(codesResp.body.codes).to.have.length.greaterThan(0);

            // Store original indicator codes for verification
            const originalIndicatorCodes = [...codesResp.body.codes];
            firstIndicatorCode = originalIndicatorCodes[0];

            // Test all modification attempts
            testModificationAttempts(firstIndicatorCode);

            // Step 4: Verify indicator codes didn't change
            verifyIndicatorCodesUnchanged(originalIndicatorCodes);
          });
        });
      });
    },
  );

  it(
    'C502994 Update Local Indicator code of Standard field for MARC authority spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502994', 'spitfire'] },
    () => {
      let createdIndicatorCodeId;
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC authority specification
      cy.getSpecificationFields(authoritySpecId).then((response) => {
        standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
        expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

        // Get indicators for the standard field
        cy.getSpecificationFieldIndicators(standardField.id).then((indicatorsResp) => {
          // Get the first indicator
          firstIndicator = indicatorsResp?.body?.indicators[0];
          expect(firstIndicator, 'First indicator exists').to.exist;

          // Cleanup: Remove any existing test indicator code from previous failed runs
          cy.getSpecificationIndicatorCodes(firstIndicator.id).then((existingCodesResp) => {
            const existingTestCode = existingCodesResp.body.codes.filter(
              ({ code: { code } }) => code === 'z' || code === 'w',
            );
            existingTestCode.forEach((code) => {
              cy.deleteSpecificationIndicatorCode(code.id).then((_cleanupResp) => {
                cy.log('Cleaned up existing test indicator code from previous run');
              });
            });
          });

          // Create a local indicator code for testing
          const createPayload = {
            code: 'z',
            label: 'AT_C502994_Test Local Code',
            deprecated: false,
          };

          cy.createSpecificationIndicatorCode(firstIndicator.id, createPayload).then(
            (createResp) => {
              createdIndicatorCodeId = createResp.body.id;

              // Step 1: Update all fields of the created local indicator code
              const updatePayload = {
                code: 'w',
                label: 'Code 2 name updated',
                deprecated: false,
              };

              cy.updateSpecificationIndicatorCode(createdIndicatorCodeId, updatePayload, true).then(
                (updateResp) => {
                  expect(updateResp.status, 'Step 1: Update local indicator code').to.eq(202);
                  expect(updateResp.body.code).to.eq(updatePayload.code);
                  expect(updateResp.body.label).to.eq(updatePayload.label);
                  expect(updateResp.body.deprecated).to.eq(updatePayload.deprecated);

                  // Step 2: Verify the indicator code was updated
                  cy.getSpecificationIndicatorCodes(firstIndicator.id).then((verifyResp) => {
                    validateApiResponse(verifyResp, 200);

                    const updatedCode = verifyResp.body.codes.find(
                      (code) => code.id === createdIndicatorCodeId,
                    );
                    expect(updatedCode.code, 'Code field updated').to.eq(updatePayload.code);
                    expect(updatedCode.label, 'Label field updated').to.eq(updatePayload.label);
                    expect(updatedCode.deprecated, 'Deprecated field updated').to.eq(
                      updatePayload.deprecated,
                    );

                    cy.deleteSpecificationIndicatorCode(createdIndicatorCodeId);
                  });
                },
              );
            },
          );
        });
      });
    },
  );
});
