/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Local Fields Indicators Order Validation API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageUpdateSpecificationFieldIndicator.gui,
  ];

  let user;
  let bibSpecId;
  let localField;
  let localFieldIndicator;

  const localFieldData = {
    tag: '998',
    label: 'Test Local Field',
    repeatable: true,
    required: false,
    deprecated: false,
    scope: 'local',
  };

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;

        // Clean up any existing local field with tag 999 before test execution
        cy.getSpecificationFields(bibSpecId).then((response) => {
          if (response.status === 200) {
            const existingLocalField = response.body.fields.find(
              (f) => f.tag === '999' && f.scope === 'local',
            );
            if (existingLocalField) {
              cy.deleteSpecificationField(existingLocalField.id, false);
            }
          }
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
    'C502976 Cannot update Indicator of Local field with invalid "order" value for MARC bib spec (API) (spitfire)',
    { tags: ['criticalPath', 'C502976', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Create local field since we cleaned up any existing one in before hook
      cy.createSpecificationField(bibSpecId, localFieldData).then((createResp) => {
        expect(createResp.status).to.eq(201);
        localField = createResp.body;

        // Create indicator for the local field
        cy.createSpecificationFieldIndicator(localField.id, {
          order: 1,
          label: 'Ind 1',
        }).then((indicatorResp) => {
          expect(indicatorResp.status).to.eq(201);
          localFieldIndicator = indicatorResp.body;

          // Step 1: Test order value 0 (below valid range)
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: 0, label: 'Ind 1 name' },
            false,
          ).then((updateResp) => {
            expect(updateResp.status, 'Step 1: Order value 0').to.eq(400);
            expect(updateResp.body.errors[0].message).to.contain(
              "The indicator 'order' field can only accept numbers 1-2.",
            );
          });

          // Step 2: Test order value 3 (above valid range)
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: 3, label: 'Ind 1 name' },
            false,
          ).then((updateResp) => {
            expect(updateResp.status, 'Step 2: Order value 3').to.eq(400);
            expect(updateResp.body.errors[0].message).to.contain(
              "The indicator 'order' field can only accept numbers 1-2.",
            );
          });

          // Step 3: Test empty order field
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: '', label: 'Ind 1 name' },
            false,
          ).then((updateResp) => {
            expect(updateResp.status, 'Step 3: Empty order field').to.eq(400);
            expect(updateResp.body.errors[0].message).to.contain("The 'order' field is required.");
          });

          // Step 4: Test order field with 2 characters
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: '11', label: 'Ind 1 name' },
            false,
          ).then((updateResp) => {
            expect(updateResp.status, 'Step 4: Order field with 2 characters').to.eq(400);
            expect(updateResp.body.errors[0].message).to.contain(
              "The indicator 'order' field can only accept numbers 1-2.",
            );
          });

          // Step 5: Test order field with letter
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: 'a', label: 'Ind 1 name' },
            false,
          ).then((updateResp) => {
            expect(updateResp.status, 'Step 5: Order field with letter').to.eq(400);
            expect(updateResp.body.errors[0].message).to.contain('JSON parse error');
          });

          // Step 6: Test order field with special character
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: '$', label: 'Ind 1 name' },
            false,
          ).then((updateResp) => {
            expect(updateResp.status, 'Step 6: Order field with special character').to.eq(400);
            expect(updateResp.body.errors[0].message).to.contain('JSON parse error');
          });

          // Step 7: Test valid order value 2
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: 2, label: 'Ind 2 name' },
            true,
          ).then((updateResp) => {
            expect(updateResp.status, 'Step 7: Valid order value 2').to.eq(202);
            expect(updateResp.body.order).to.eq(2);
            expect(updateResp.body.label).to.eq('Ind 2 name');
          });
        });
      });
    },
  );
});
