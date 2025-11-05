/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

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

  const TEST_CASE_ID = 'C499657';
  const LOCAL_FIELD_TAG = '996';

  // Generate test data using builder pattern
  const fieldTestDataBuilder = createFieldTestDataBuilder(TEST_CASE_ID);
  const testData = fieldTestDataBuilder
    .withField(LOCAL_FIELD_TAG, 'Test_Local_Field_for_Duplicate_Order_Validation', {
      url: 'http://www.example.org/field996.html',
    })
    .withIndicator(1, 'Ind_1_name')
    .withIndicator(2, 'Ind_2_name')
    .build();

  const localFieldData = testData.field;
  const firstIndicatorData = testData.indicators[0];
  const secondIndicatorData = testData.indicators[1];

  before('Create user and setup local field', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;

        // Clean up any existing field with the same tag and create a new one
        cy.deleteSpecificationFieldByTag(bibSpecId, localFieldData.tag, false).then(() => {
          cy.createSpecificationField(bibSpecId, localFieldData).then((response) => {
            validateApiResponse(response, 201);
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
      cy.createSpecificationFieldIndicator(localField.id, firstIndicatorData).then((response) => {
        validateApiResponse(response, 201);
        expect(response.body.fieldId).to.eq(localField.id);
        expect(response.body.order).to.eq(1);
        expect(response.body.label).to.eq(firstIndicatorData.label);
        expect(response.body.id).to.exist;
        expect(response.body.metadata).to.exist;

        firstIndicator = response.body;

        // Step 2: Create second indicator with order: 2
        cy.createSpecificationFieldIndicator(localField.id, secondIndicatorData).then(
          (response2) => {
            validateApiResponse(response2, 201);
            expect(response2.body.fieldId).to.eq(localField.id);
            expect(response2.body.order).to.eq(2);
            expect(response2.body.label).to.eq(secondIndicatorData.label);
            expect(response2.body.id).to.exist;
            expect(response2.body.metadata).to.exist;

            secondIndicator = response2.body;

            // Step 3: Attempt to create third indicator with duplicate order: 1 (same as first indicator)
            const duplicateOrder1Payload = {
              order: 1,
              label: `AT_${TEST_CASE_ID}_Ind_1_name_test_duplicate`,
            };

            cy.createSpecificationFieldIndicator(localField.id, duplicateOrder1Payload, false).then(
              (response3) => {
                validateApiResponse(response3, 400);
                expect(response3.body.errors[0].message).to.contain("The 'order' must be unique.");
              },
            );

            // Step 4: Attempt to create fourth indicator with duplicate order: 2 (same as second indicator)
            const duplicateOrder2Payload = {
              order: 2,
              label: `AT_${TEST_CASE_ID}_Ind_2_name_test_duplicate`,
            };

            cy.createSpecificationFieldIndicator(localField.id, duplicateOrder2Payload, false).then(
              (response4) => {
                validateApiResponse(response4, 400);
                expect(response4.body.errors[0].message).to.contain("The 'order' must be unique.");
              },
            );

            // Step 5: Verify only the original two indicators exist
            cy.getSpecificationFieldIndicators(localField.id).then((getResponse) => {
              validateApiResponse(getResponse, 200);
              expect(getResponse.body.indicators).to.have.length(2);

              // Verify first indicator in response
              const retrievedIndicator1 = getResponse.body.indicators.find(
                (ind) => ind.order === 1,
              );
              expect(retrievedIndicator1, 'First indicator found in response').to.exist;
              expect(retrievedIndicator1.id).to.eq(firstIndicator.id);
              expect(retrievedIndicator1.fieldId).to.eq(localField.id);
              expect(retrievedIndicator1.order).to.eq(1);
              expect(retrievedIndicator1.label).to.eq(firstIndicatorData.label);

              // Verify second indicator in response
              const retrievedIndicator2 = getResponse.body.indicators.find(
                (ind) => ind.order === 2,
              );
              expect(retrievedIndicator2, 'Second indicator found in response').to.exist;
              expect(retrievedIndicator2.id).to.eq(secondIndicator.id);
              expect(retrievedIndicator2.fieldId).to.eq(localField.id);
              expect(retrievedIndicator2.order).to.eq(2);
              expect(retrievedIndicator2.label).to.eq(secondIndicatorData.label);
            });
          },
        );
      });
    },
  );
});
