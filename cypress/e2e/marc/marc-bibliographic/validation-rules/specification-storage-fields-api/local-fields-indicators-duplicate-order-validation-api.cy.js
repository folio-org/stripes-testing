/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Local Fields Indicators Duplicate Order Validation API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
  ];

  let user;
  let bibSpecId;
  let localField;
  let firstIndicator;
  let secondIndicator;

  const localFieldData = {
    tag: '996',
    label: 'AT_C499657 Test Local Field for Duplicate Order Validation',
    url: 'http://www.example.org/field996.html',
    repeatable: true,
    required: false,
    deprecated: false,
    scope: 'local',
  };

  before('Create user and setup local field', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;

        // Clean up any existing field with the same tag and create a new one
        cy.deleteSpecificationFieldByTag(bibSpecId, localFieldData.tag, false).then(() => {
          cy.createSpecificationField(bibSpecId, localFieldData).then((response) => {
            expect(response.status).to.eq(201);
            localField = response.body;
            expect(localField.tag).to.eq(localFieldData.tag);
            expect(localField.scope).to.eq('local');
          });
        });
      });
    });
  });

  after('Delete test user and cleanup', () => {
    if (user) {
      cy.getAdminToken();
      if (localField && localField.scope === 'local') {
        cy.deleteSpecificationField(localField.id, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499657 Cannot create Indicators of Local field with duplicate "order" for MARC bib spec (spitfire)',
    { tags: ['C499657', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Create first indicator with order: 1
      const firstIndicatorPayload = {
        order: 1,
        label: 'Ind 1 name',
      };

      cy.createSpecificationFieldIndicator(localField.id, firstIndicatorPayload).then(
        (response) => {
          expect(response.status, 'Step 1: Create first indicator').to.eq(201);
          expect(response.body.fieldId).to.eq(localField.id);
          expect(response.body.order).to.eq(1);
          expect(response.body.label).to.eq('Ind 1 name');
          expect(response.body.id).to.exist;
          expect(response.body.metadata).to.exist;

          firstIndicator = response.body;

          // Step 2: Create second indicator with order: 2
          const secondIndicatorPayload = {
            order: 2,
            label: 'Ind 2 name',
          };

          cy.createSpecificationFieldIndicator(localField.id, secondIndicatorPayload).then(
            (response2) => {
              expect(response2.status, 'Step 2: Create second indicator').to.eq(201);
              expect(response2.body.fieldId).to.eq(localField.id);
              expect(response2.body.order).to.eq(2);
              expect(response2.body.label).to.eq('Ind 2 name');
              expect(response2.body.id).to.exist;
              expect(response2.body.metadata).to.exist;

              secondIndicator = response2.body;

              // Step 3: Attempt to create third indicator with duplicate order: 1 (same as first indicator)
              const duplicateOrder1Payload = {
                order: 1,
                label: 'Ind 1 name test duplicate',
              };

              cy.createSpecificationFieldIndicator(
                localField.id,
                duplicateOrder1Payload,
                false,
              ).then((response3) => {
                expect(response3.status, 'Step 3: Create indicator with duplicate order 1').to.eq(
                  400,
                );
                expect(response3.body.errors[0].message).to.contain("The 'order' must be unique.");
              });

              // Step 4: Attempt to create fourth indicator with duplicate order: 2 (same as second indicator)
              const duplicateOrder2Payload = {
                order: 2,
                label: 'Ind 2 name test duplicate',
              };

              cy.createSpecificationFieldIndicator(
                localField.id,
                duplicateOrder2Payload,
                false,
              ).then((response4) => {
                expect(response4.status, 'Step 4: Create indicator with duplicate order 2').to.eq(
                  400,
                );
                expect(response4.body.errors[0].message).to.contain("The 'order' must be unique.");
              });

              // Step 5: Verify only the original two indicators exist
              cy.getSpecificationFieldIndicators(localField.id).then((getResponse) => {
                expect(getResponse.status, 'Step 5: Get field indicators').to.eq(200);
                expect(getResponse.body.indicators).to.have.length(2);

                // Verify first indicator in response
                const retrievedIndicator1 = getResponse.body.indicators.find(
                  (ind) => ind.order === 1,
                );
                expect(retrievedIndicator1, 'First indicator found in response').to.exist;
                expect(retrievedIndicator1.id).to.eq(firstIndicator.id);
                expect(retrievedIndicator1.fieldId).to.eq(localField.id);
                expect(retrievedIndicator1.order).to.eq(1);
                expect(retrievedIndicator1.label).to.eq('Ind 1 name');

                // Verify second indicator in response
                const retrievedIndicator2 = getResponse.body.indicators.find(
                  (ind) => ind.order === 2,
                );
                expect(retrievedIndicator2, 'Second indicator found in response').to.exist;
                expect(retrievedIndicator2.id).to.eq(secondIndicator.id);
                expect(retrievedIndicator2.fieldId).to.eq(localField.id);
                expect(retrievedIndicator2.order).to.eq(2);
                expect(retrievedIndicator2.label).to.eq('Ind 2 name');
              });
            },
          );
        },
      );
    },
  );
});
