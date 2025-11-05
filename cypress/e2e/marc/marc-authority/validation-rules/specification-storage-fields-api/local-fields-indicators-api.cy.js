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
      cy.getSpecificationIds().then((specs) => {
        const authoritySpec = specs.find((s) => s.profile === 'authority');
        expect(authoritySpec, 'MARC authority specification exists').to.exist;
        authoritySpecId = authoritySpec.id;
      });
    });
  });

  beforeEach('Create local field for test', () => {
    // Ensure token is set for the user before API calls
    cy.getUserToken(user.username, user.password);

    // Get current test title to determine which field to create
    const testId = Cypress.currentTest.title.match(/C\d+/)?.[0] || '';
    const label = `AT_${testId}_Test Local Field`;
    const tag = '889';
    const localFieldData = {
      tag,
      label,
      url: 'http://www.example.org/field-test.html',
      repeatable: true,
      required: false,
      deprecated: false,
    };

    // Clean up any existing field with the same tag first
    cy.getSpecificationFields(authoritySpecId).then((fieldsResp) => {
      validateApiResponse(fieldsResp, 200);
      const existingField = fieldsResp.body.fields.find(
        (f) => f.tag === tag && f.scope === 'local',
      );
      if (existingField) {
        cy.deleteSpecificationField(existingField.id, false);
      }
    });

    // Create the local field
    cy.createSpecificationField(authoritySpecId, localFieldData).then((createResp) => {
      validateApiResponse(createResp, 201);
      localFieldId = createResp.body.id;
    });
  });

  afterEach('Delete local field and cleanup', () => {
    if (localFieldId) {
      cy.deleteSpecificationField(localFieldId, true).then((deleteResp) => {
        validateApiResponse(deleteResp, 204);
      });
      localFieldId = null;
    }
  });

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499696 Create Indicators of Local field for MARC authority spec (API) (spitfire)',
    { tags: ['extendedPath', 'C499696', 'spitfire'] },
    () => {
      let firstIndicatorId;
      let secondIndicatorId;

      // Step 1: Create first indicator (order: 1, label: "Ind 1 name")
      const firstIndicatorPayload = {
        order: 1,
        label: 'Ind 1 name',
      };

      cy.createSpecificationFieldIndicator(localFieldId, firstIndicatorPayload).then(
        (firstIndicatorResp) => {
          validateApiResponse(firstIndicatorResp, 201);
          firstIndicatorId = firstIndicatorResp.body.id;

          // Verify response body structure for first indicator
          expect(firstIndicatorResp.body).to.include({
            fieldId: localFieldId,
            order: firstIndicatorPayload.order,
            label: firstIndicatorPayload.label,
          });
          expect(firstIndicatorResp.body.id, 'First indicator has ID').to.exist;
          expect(firstIndicatorResp.body.metadata, 'First indicator has metadata').to.exist;

          // Step 2: Create second indicator (order: 2, label: "Ind 2 name")
          const secondIndicatorPayload = {
            order: 2,
            label: 'Ind 2 name',
          };

          cy.createSpecificationFieldIndicator(localFieldId, secondIndicatorPayload).then(
            (secondIndicatorResp) => {
              validateApiResponse(secondIndicatorResp, 201);
              secondIndicatorId = secondIndicatorResp.body.id;

              // Verify response body structure for second indicator
              expect(secondIndicatorResp.body).to.include({
                fieldId: localFieldId,
                order: secondIndicatorPayload.order,
                label: secondIndicatorPayload.label,
              });
              expect(secondIndicatorResp.body.id, 'Second indicator has ID').to.exist;
              expect(secondIndicatorResp.body.metadata, 'Second indicator has metadata').to.exist;

              // Step 3: Verify both indicators exist via GET request
              cy.getSpecificationFieldIndicators(localFieldId).then((getResp) => {
                validateApiResponse(getResp, 200);

                // Response body should contain both created indicators
                expect(getResp.body.indicators, 'Indicators array exists').to.exist;
                expect(getResp.body.indicators, 'Contains both indicators').to.have.length(2);

                // Find and verify first indicator
                const foundFirstIndicator = getResp.body.indicators.find(
                  (indicator) => indicator.id === firstIndicatorId,
                );
                expect(foundFirstIndicator, 'First indicator found in response').to.exist;
                expect(foundFirstIndicator).to.include({
                  fieldId: localFieldId,
                  order: firstIndicatorPayload.order,
                  label: firstIndicatorPayload.label,
                });

                // Find and verify second indicator
                const foundSecondIndicator = getResp.body.indicators.find(
                  (indicator) => indicator.id === secondIndicatorId,
                );
                expect(foundSecondIndicator, 'Second indicator found in response').to.exist;
                expect(foundSecondIndicator).to.include({
                  fieldId: localFieldId,
                  order: secondIndicatorPayload.order,
                  label: secondIndicatorPayload.label,
                });
              });
            },
          );
        },
      );
    },
  );

  it(
    'C499698 Cannot create Indicators for Local Field 002, 004, 009 of MARC authority spec (API) (spitfire)',
    { tags: ['extendedPath', 'C499698', 'spitfire'] },
    () => {
      const controlFieldIds = {};

      // First, create the three control fields (002, 004, 009)
      const createControlField = (tag) => {
        const controlFieldData = {
          tag,
          label: `AT_C499698_Control Field ${tag}`,
          url: 'http://www.example.org/control-field.html',
          repeatable: false,
          required: false,
          deprecated: false,
        };

        return cy
          .getSpecificationFields(authoritySpecId)
          .then((fieldsResp) => {
            validateApiResponse(fieldsResp, 200);
            const existingField = fieldsResp.body.fields.find(
              (f) => f.tag === tag && f.scope === 'local',
            );
            if (existingField) {
              cy.deleteSpecificationField(existingField.id, false);
            }
          })
          .then(() => {
            return cy
              .createSpecificationField(authoritySpecId, controlFieldData)
              .then((createResp) => {
                validateApiResponse(createResp, 201);
                controlFieldIds[tag] = createResp.body.id;
                return createResp.body.id;
              });
          });
      };

      // Create all three control fields sequentially
      createControlField('002').then(() => {
        createControlField('004').then(() => {
          createControlField('009').then(() => {
            // Step 1: Attempt to create indicator for 002 field
            const firstIndicatorPayload = {
              order: 1,
              label: 'Ind 1 name',
            };

            cy.createSpecificationFieldIndicator(
              controlFieldIds['002'],
              firstIndicatorPayload,
              false,
            ).then((firstResp) => {
              expect(firstResp.status, 'Step 1: Cannot create indicator for 002 field').to.eq(400);
              expect(firstResp.body.errors[0].message).to.contain(
                'Cannot define indicators for 00X control fields.',
              );

              // Step 2: Attempt to create indicator for 004 field
              const secondIndicatorPayload = {
                order: 2,
                label: 'Ind 2 name',
              };

              cy.createSpecificationFieldIndicator(
                controlFieldIds['004'],
                secondIndicatorPayload,
                false,
              ).then((secondResp) => {
                expect(secondResp.status, 'Step 2: Cannot create indicator for 004 field').to.eq(
                  400,
                );
                expect(secondResp.body.errors[0].message).to.contain(
                  'Cannot define indicators for 00X control fields.',
                );

                // Step 3: Attempt to create indicator for 009 field
                const thirdIndicatorPayload = {
                  order: 1,
                  label: 'Ind 1 name',
                };

                cy.createSpecificationFieldIndicator(
                  controlFieldIds['009'],
                  thirdIndicatorPayload,
                  false,
                ).then((thirdResp) => {
                  expect(thirdResp.status, 'Step 3: Cannot create indicator for 009 field').to.eq(
                    400,
                  );
                  expect(thirdResp.body.errors[0].message).to.contain(
                    'Cannot define indicators for 00X control fields.',
                  );

                  // Cleanup: Delete all created control fields
                  cy.deleteSpecificationField(controlFieldIds['002'], true);
                  cy.deleteSpecificationField(controlFieldIds['004'], true);
                  cy.deleteSpecificationField(controlFieldIds['009'], true);
                });
              });
            });
          });
        });
      });
    },
  );

  it(
    'C502995 Update Indicator of Local field for MARC authority spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502995', 'spitfire'] },
    () => {
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
                expect(updatedIndicator.order, 'Order field updated').to.eq(updatePayload.order);
                expect(updatedIndicator.label, 'Label field updated').to.eq(updatePayload.label);
              });
            },
          );
        },
      );
    },
  );
});
