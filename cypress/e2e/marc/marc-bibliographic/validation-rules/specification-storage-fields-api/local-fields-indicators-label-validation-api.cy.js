/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  findLocalField,
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

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

  const TEST_CASE_ID = 'C502977';
  const LOCAL_FIELD_TAG = '997';

  // Generate test data using builder pattern
  const fieldTestDataBuilder = createFieldTestDataBuilder(TEST_CASE_ID);
  const testData = fieldTestDataBuilder
    .withField(LOCAL_FIELD_TAG, 'Local_Field')
    .withIndicator(1, 'Test_Indicator_Label')
    .build();

  const localFieldData = testData.field;
  const indicatorData = testData.indicators[0];

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;

        // Clean up any existing local field with tag before test execution
        cy.getSpecificationFields(bibSpecId).then((response) => {
          if (response.status === 200) {
            const existingLocalField = findLocalField(response.body.fields, LOCAL_FIELD_TAG);
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
        validateApiResponse(createResp, 201);
        localField = createResp.body;

        // Create indicator for the local field using builder data
        cy.createSpecificationFieldIndicator(localField.id, indicatorData).then((indicatorResp) => {
          validateApiResponse(indicatorResp, 201);
          localFieldIndicator = indicatorResp.body;

          // Step 1: Test update without "label" field
          cy.updateSpecificationFieldIndicator(localFieldIndicator.id, { order: 1 }, false).then(
            (updateResp) => {
              validateApiResponse(updateResp, 400);
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
            validateApiResponse(updateResp, 400);
            expect(updateResp.body.errors[0].message).to.include("The 'label' field is required.");
          });

          // Step 3: Test update with whitespace only in "label" field
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: 1, label: ' ' },
            false,
          ).then((updateResp) => {
            validateApiResponse(updateResp, 400);
            expect(updateResp.body.errors[0].message).to.include("The 'label' field is required.");
          });

          // Verification: Test valid label update to confirm the indicator works normally
          cy.updateSpecificationFieldIndicator(
            localFieldIndicator.id,
            { order: 1, label: 'Valid Label' },
            true,
          ).then((updateResp) => {
            validateApiResponse(updateResp, 202);
            expect(updateResp.body.order).to.eq(1);
            expect(updateResp.body.label).to.eq('Valid Label');
          });
        });
      });
    },
  );
});
