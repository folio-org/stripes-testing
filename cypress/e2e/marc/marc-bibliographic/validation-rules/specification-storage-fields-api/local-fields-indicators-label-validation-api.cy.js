/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Local Fields Indicators Label Validation API', () => {
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
  const TAG = '997';

  const localFieldData = {
    tag: TAG,
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

        // Clean up any existing local field with tag before test execution
        cy.getSpecificationFields(bibSpecId).then((response) => {
          if (response.status === 200) {
            const existingLocalField = response.body.fields.find(
              (f) => f.tag === TAG && f.scope === 'local',
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
    'C502977 Cannot update Indicators of Local field with empty "label" for MARC bib spec (API) (spitfire)',
    { tags: ['criticalPath', 'C502977', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Create local field since we cleaned up any existing one in before hook
      cy.createSpecificationField(bibSpecId, localFieldData).then((createResp) => {
        expect(createResp.status).to.eq(201);
        localField = createResp.body;

        // Create indicator for the local field
        cy.createSpecificationFieldIndicator(localField.id, {
          order: 1,
          label: 'Test Indicator Label',
        }).then((indicatorResp) => {
          expect(indicatorResp.status).to.eq(201);
          localFieldIndicator = indicatorResp.body;

          // Step 1: Test update without "label" field
          cy.updateSpecificationFieldIndicator(localFieldIndicator.id, { order: 1 }, false).then(
            (updateResp) => {
              expect(updateResp.status, 'Step 1: Missing label field').to.eq(400);
              expect(updateResp.body.errors[0].message).to.include(
                "The 'label' field is required.",
              );
            },
          );

          // Step 2: Test update with empty "label" field
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: 1, label: '' },
            false,
          ).then((updateResp) => {
            expect(updateResp.status, 'Step 2: Empty label field').to.eq(400);
            expect(updateResp.body.errors[0].message).to.include("The 'label' field is required.");
          });

          // Step 3: Test update with whitespace only in "label" field
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: 1, label: ' ' },
            false,
          ).then((updateResp) => {
            expect(updateResp.status, 'Step 3: Whitespace only label field').to.eq(400);
            expect(updateResp.body.errors[0].message).to.include("The 'label' field is required.");
          });

          // Verification: Test valid label update to confirm the indicator works normally
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: 1, label: 'Valid Label' },
            true,
          ).then((updateResp) => {
            expect(updateResp.status, 'Verification: Valid label update').to.eq(202);
            expect(updateResp.body.order).to.eq(1);
            expect(updateResp.body.label).to.eq('Valid Label');
          });
        });
      });
    },
  );
});
