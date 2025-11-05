/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - System Fields Indicators API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageUpdateSpecificationFieldIndicator.gui,
  ];

  function findSystemField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'system');
  }

  let user;
  let authoritySpecId;
  let systemField;

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
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
    'C502990 Cannot update Indicator of System Field for MARC authority spec (API) (spitfire)',
    { tags: ['criticalPath', 'C502990', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC authority specification
      cy.getSpecificationFields(authoritySpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a system field (e.g., 999)
        systemField = findSystemField(response.body.fields, '999');
        expect(systemField, 'System field 999 exists').to.exist;

        // Get indicators for the system field
        cy.getSpecificationFieldIndicators(systemField.id).then((indicatorsResp) => {
          expect(indicatorsResp.status).to.eq(200);
          expect(indicatorsResp.body.indicators).to.have.length.greaterThan(0);

          // Store original indicators for verification
          const originalIndicators = [...indicatorsResp.body.indicators];

          // Define test cases for different indicator modifications
          const testCases = [
            {
              step: 1,
              description: 'Attempt to update first indicator label',
              indicatorIndex: 0,
              payload: {
                order: 1,
                label: 'Undefined Updated',
              },
              expectedErrorMessage: "The 'indicator' modification is not allowed for system scope.",
            },
            {
              step: 2,
              description: 'Attempt to update second indicator label',
              indicatorIndex: 1,
              payload: {
                order: 2,
                label: 'Undefined Updated',
              },
              expectedErrorMessage: "The 'indicator' modification is not allowed for system scope.",
            },
          ];

          // Execute each test case
          testCases.forEach((testCase) => {
            const indicatorToUpdate = originalIndicators[testCase.indicatorIndex];
            if (indicatorToUpdate) {
              cy.updateSpecificationFieldIndicator(
                indicatorToUpdate.id,
                testCase.payload,
                false,
              ).then((updateResp) => {
                expect(updateResp.status, `Step ${testCase.step}: ${testCase.description}`).to.eq(
                  400,
                );
                expect(updateResp.body.errors[0].message).to.contain(testCase.expectedErrorMessage);
              });
            }
          });

          // Step 3: Verify system field indicators didn't change
          cy.getSpecificationFieldIndicators(systemField.id).then((verifyResp) => {
            expect(verifyResp.status, 'Step 3: Get indicators after update attempts').to.eq(200);

            // Verify all indicators remain unchanged
            expect(verifyResp.body.indicators).to.have.length(originalIndicators.length);

            verifyResp.body.indicators.forEach((indicator, index) => {
              const originalIndicator = originalIndicators.find((orig) => orig.id === indicator.id);
              expect(originalIndicator, `Original indicator ${index} exists`).to.exist;
              expect(indicator.label, `Indicator ${index} label unchanged`).to.eq(
                originalIndicator.label,
              );
              expect(indicator.order, `Indicator ${index} order unchanged`).to.eq(
                originalIndicator.order,
              );
            });
          });
        });
      });
    },
  );
});
