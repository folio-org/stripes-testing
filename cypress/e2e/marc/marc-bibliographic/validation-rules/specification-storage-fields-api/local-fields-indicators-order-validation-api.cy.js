/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  findLocalField,
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

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

  const TEST_CASE_ID = 'C502976';
  const LOCAL_FIELD_TAG = '998';

  // Generate test data using builder pattern
  const fieldTestDataBuilder = createFieldTestDataBuilder(TEST_CASE_ID);
  const testData = fieldTestDataBuilder
    .withField(LOCAL_FIELD_TAG, 'Local_Field')
    .withIndicator(1, 'Ind_1')
    .build();

  const localFieldData = testData.field;
  const indicatorData = testData.indicators[0];

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;

        // Clean up any existing local field with tag 999 before test execution
        cy.getSpecificationFields(bibSpecId).then((response) => {
          if (response.status === 200) {
            const existingLocalField = findLocalField(response.body.fields, '999');
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
        validateApiResponse(createResp, 201);
        localField = createResp.body;

        // Create indicator for the local field using builder data
        cy.createSpecificationFieldIndicator(localField.id, indicatorData).then((indicatorResp) => {
          validateApiResponse(indicatorResp, 201);
          localFieldIndicator = indicatorResp.body;

          // Step 1: Test order value 0 (below valid range)
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: 0, label: 'Ind 1 name' },
            false,
          ).then((updateResp) => {
            validateApiResponse(updateResp, 400);
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
            validateApiResponse(updateResp, 400);
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
            validateApiResponse(updateResp, 400);
            expect(updateResp.body.errors[0].message).to.contain("The 'order' field is required.");
          });

          // Step 4: Test order field with 2 characters
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: '11', label: 'Ind 1 name' },
            false,
          ).then((updateResp) => {
            validateApiResponse(updateResp, 400);
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
            validateApiResponse(updateResp, 400);
            expect(updateResp.body.errors[0].message).to.contain('JSON parse error');
          });

          // Step 6: Test order field with special character
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: '$', label: 'Ind 1 name' },
            false,
          ).then((updateResp) => {
            validateApiResponse(updateResp, 400);
            expect(updateResp.body.errors[0].message).to.contain('JSON parse error');
          });

          // Step 7: Test valid order value 2
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: 2, label: 'Ind 2 name' },
            true,
          ).then((updateResp) => {
            validateApiResponse(updateResp, 202);
            expect(updateResp.body.order).to.eq(2);
            expect(updateResp.body.label).to.eq('Ind 2 name');
          });
        });
      });
    },
  );
});
