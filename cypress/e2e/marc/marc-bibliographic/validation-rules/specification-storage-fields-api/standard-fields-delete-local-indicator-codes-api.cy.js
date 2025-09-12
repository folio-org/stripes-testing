/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Standard Fields Delete Local Indicator Codes API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageDeleteSpecificationIndicatorCode.gui,
  ];

  const STANDARD_FIELD_TAG = '243';

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  let user;
  let bibSpecId;
  let standardField;
  let firstIndicator;

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        // Find the specification with profile 'bibliographic'
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;
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
    'C503103 Delete Local Indicator Code of Standard Field for MARC bib spec (API) (spitfire)',
    { tags: ['criticalPath', 'C503103', 'spitfire'] },
    () => {
      let createdIndicatorCodeId;

      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC bib specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a standard field (e.g., 243)
        standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
        expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

        // Get indicators for the standard field
        cy.getSpecificationFieldIndicators(standardField.id).then((indicatorsResp) => {
          expect(indicatorsResp.status).to.eq(200);
          expect(indicatorsResp.body.indicators).to.have.length.greaterThan(0);

          // Get the first indicator
          firstIndicator = indicatorsResp.body.indicators[0];
          expect(firstIndicator, 'First indicator exists').to.exist;

          // Get indicator codes for the first indicator
          cy.getSpecificationIndicatorCodes(firstIndicator.id).then((codesResp) => {
            expect(codesResp.status).to.eq(200);

            // Store original indicator codes count for verification
            const originalIndicatorCodesCount = codesResp.body.codes.length;

            // Cleanup: Remove any existing test indicator code from previous failed runs
            const existingTestCode = codesResp.body.codes.filter(
              ({ code: { code } }) => code === 'z',
            );
            existingTestCode.forEach((code) => {
              cy.deleteSpecificationIndicatorCode(code.id).then((_cleanupResp) => {
                cy.log('Cleaned up existing test indicator code from previous run');
              });
            });

            // Create a local indicator code for testing deletion
            const createPayload = {
              code: 'z',
              label: 'AT_C503103_Test Local Code for Deletion',
              deprecated: false,
            };

            cy.createSpecificationIndicatorCode(firstIndicator.id, createPayload).then(
              (createResp) => {
                expect(createResp.status).to.eq(201);
                createdIndicatorCodeId = createResp.body.id;

                // Step 1: Delete the local indicator code
                cy.deleteSpecificationIndicatorCode(createdIndicatorCodeId).then((deleteResp) => {
                  expect(deleteResp.status, 'Step 1: Delete local indicator code').to.eq(204);
                });

                // Step 2: Verify the local indicator code was deleted
                cy.getSpecificationIndicatorCodes(firstIndicator.id).then((verifyResp) => {
                  expect(verifyResp.status, 'Step 2: Get indicator codes after deletion').to.eq(
                    200,
                  );

                  // Verify the deleted indicator code is no longer present
                  const deletedCode = verifyResp.body.codes.find(
                    (code) => code.id === createdIndicatorCodeId,
                  );
                  expect(deletedCode, 'Deleted local indicator code should not exist').to.not.exist;

                  // Verify the total count is back to original (or original + 1 if cleanup happened)
                  expect(verifyResp.body.codes.length).to.be.at.most(originalIndicatorCodesCount);
                });
              },
            );
          });
        });
      });
    },
  );
});
