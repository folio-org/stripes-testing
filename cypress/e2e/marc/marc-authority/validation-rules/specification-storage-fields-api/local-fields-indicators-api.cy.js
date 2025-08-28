/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - Local Fields Indicators API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
    Permissions.specificationStorageDeleteSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageUpdateSpecificationFieldIndicator.gui,
  ];

  let user;
  let authoritySpecId;
  let localFieldId;
  let createdIndicatorId;

  function validateApiResponse(response, expectedStatus) {
    expect(response.status).to.eq(expectedStatus);
  }

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
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
    'C502995 Update Indicator of Local field for MARC authority spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502995', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      cy.getSpecificationFields(authoritySpecId)
        .then((fieldsResp) => {
          validateApiResponse(fieldsResp, 200);
          // Find the local field (e.g., 890)
          localFieldId = fieldsResp.body.fields.find((f) => f.tag === '890')?.id;
          if (!localFieldId) {
            const createFieldPayload = {
              tag: '890',
              label: 'AT_C502995_Test Local Field',
              url: 'http://example.com/test-field',
              repeatable: true,
              required: false,
              deprecated: false,
            };
            cy.createSpecificationField(authoritySpecId, createFieldPayload).then((fieldResp) => {
              expect(fieldResp.status, 'Create local field').to.eq(201);
              localFieldId = fieldResp.body.id;
            });
          }
        })
        .then(() => {
          // Create an indicator for the local field
          const createIndicatorPayload = {
            order: 1,
            label: 'AT_C502995_Test Indicator',
          };

          cy.createSpecificationFieldIndicator(localFieldId, createIndicatorPayload).then(
            (indicatorResp) => {
              expect(indicatorResp.status, 'Create indicator for local field').to.eq(201);
              createdIndicatorId = indicatorResp.body.id;

              // Step 1: Update the indicator with new order and label
              const updatePayload = {
                order: 2,
                label: 'Updated name',
              };

              cy.updateSpecificationFieldIndicator(createdIndicatorId, updatePayload, true).then(
                (updateResp) => {
                  expect(updateResp.status, 'Step 1: Update indicator').to.eq(202);
                  expect(updateResp.body.order).to.eq(updatePayload.order);
                  expect(updateResp.body.label).to.eq(updatePayload.label);

                  // Step 2: Verify the indicator was updated
                  cy.getSpecificationFieldIndicators(localFieldId).then((verifyResp) => {
                    validateApiResponse(verifyResp, 200);

                    const updatedIndicator = verifyResp.body.indicators.find(
                      (indicator) => indicator.id === createdIndicatorId,
                    );
                    expect(updatedIndicator, 'Updated indicator exists').to.exist;
                    expect(updatedIndicator.order, 'Order field updated').to.eq(
                      updatePayload.order,
                    );
                    expect(updatedIndicator.label, 'Label field updated').to.eq(
                      updatePayload.label,
                    );

                    // Cleanup: Delete the created local field (this will also remove all its indicators)
                    cy.deleteSpecificationField(localFieldId, true).then((deleteFieldResp) => {
                      expect(deleteFieldResp.status, 'Cleanup: Delete local field').to.eq(204);
                    });
                  });
                },
              );
            },
          );
        });
    },
  );
});
