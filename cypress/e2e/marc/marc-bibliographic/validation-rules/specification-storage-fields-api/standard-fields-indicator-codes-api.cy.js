/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Standard Fields Indicator Codes API', () => {
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

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  let user;
  let bibSpecId;
  let standardField;
  let firstIndicator;
  let firstIndicatorCode;

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
    'C502958 Cannot update Indicator code of Standard field for MARC bib spec (API) (spitfire)',
    { tags: ['criticalPath', 'C502958', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC bib specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a standard field (e.g., 243)
        standardField = findStandardField(response.body.fields, '243');
        expect(standardField, 'Standard field 243 exists').to.exist;

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
            expect(codesResp.body.codes).to.have.length.greaterThan(0);

            // Store original indicator codes for verification
            const originalIndicatorCodes = [...codesResp.body.codes];
            firstIndicatorCode = originalIndicatorCodes[0];

            // Define test scenarios for different indicator code modifications
            const testScenarios = [
              {
                step: 1,
                description: 'Attempt to update code field only',
                payload: {
                  code: '4',
                  label: firstIndicatorCode.label,
                  deprecated: firstIndicatorCode.deprecated,
                },
                expectedErrorMessage:
                  "The 'indicator_code' modification is not allowed for standard scope.",
              },
              {
                step: 2,
                description: 'Attempt to update label field only',
                payload: {
                  code: firstIndicatorCode.code,
                  label: 'Forename Updated',
                  deprecated: firstIndicatorCode.deprecated,
                },
                expectedErrorMessage:
                  "The 'indicator_code' modification is not allowed for standard scope.",
              },
              {
                step: 3,
                description: 'Attempt to update deprecated field only',
                payload: {
                  code: firstIndicatorCode.code,
                  label: firstIndicatorCode.label,
                  deprecated: true,
                },
                expectedErrorMessage:
                  "The 'indicator_code' modification is not allowed for standard scope.",
              },
            ];

            // Execute each test scenario
            testScenarios.forEach((scenario) => {
              cy.updateSpecificationIndicatorCode(
                firstIndicatorCode.id,
                scenario.payload,
                false,
              ).then((updateResp) => {
                expect(updateResp.status).to.eq(400);
                expect(updateResp.body.errors[0].message).to.contain(scenario.expectedErrorMessage);
              });
            });

            // Step 4: Verify indicator codes didn't change
            cy.getSpecificationIndicatorCodes(firstIndicator.id).then((verifyResp) => {
              expect(verifyResp.status).to.eq(200);

              // Verify all indicator codes remain unchanged
              expect(verifyResp.body.codes).to.have.length(originalIndicatorCodes.length);

              verifyResp.body.codes.forEach((indicatorCode) => {
                const originalCode = originalIndicatorCodes.find(
                  (orig) => orig.id === indicatorCode.id,
                );
                expect(originalCode, 'Original indicator code exists').to.exist;
                expect(indicatorCode.code).to.eq(originalCode.code);
                expect(indicatorCode.label).to.eq(originalCode.label);
                expect(indicatorCode.deprecated).to.eq(originalCode.deprecated);
              });
            });
          });
        });
      });
    },
  );
});
