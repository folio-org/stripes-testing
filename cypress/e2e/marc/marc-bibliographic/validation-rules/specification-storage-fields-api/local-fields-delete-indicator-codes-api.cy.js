/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  findLocalField,
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Local Fields Delete Indicator Codes API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageDeleteSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageDeleteSpecificationIndicatorCode.gui,
  ];

  const TEST_CASE_ID = 'C503100';
  const LOCAL_FIELD_TAG = '997';

  // Generate test data using builder pattern
  const fieldTestDataBuilder = createFieldTestDataBuilder(TEST_CASE_ID);
  const testData = fieldTestDataBuilder
    .withField(LOCAL_FIELD_TAG, 'Test_Local_Field', {
      url: 'http://www.example.org/field997.html',
    })
    .withIndicator(1, 'Test_Indicator', [
      { code: '0', label: 'First_indicator_code' },
      { code: '1', label: 'Second_indicator_code' },
    ])
    .build();

  const localFieldData = testData.field;
  const indicatorData = testData.indicators[0];
  const indicatorCode1Data = indicatorData.codes[0];
  const indicatorCode2Data = indicatorData.codes[1];

  let user;
  let bibSpecId;
  let localFieldId;

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

        // Create a local field for testing using builder data
        cy.createSpecificationField(bibSpecId, localFieldData).then((fieldResp) => {
          validateApiResponse(fieldResp, 201);
          localFieldId = fieldResp.body.id;
        });
      });
    });
  });

  after('Delete test user and cleanup', () => {
    if (user) {
      cy.getAdminToken();
      // Clean up local field
      if (localFieldId) {
        cy.deleteSpecificationField(localFieldId, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C503100 Delete Indicator Code of Local Field for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C503100', 'spitfire'] },
    () => {
      let localFieldIndicator;
      let indicatorCode1;
      let indicatorCode2;

      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Create indicator for the local field using builder data
      cy.createSpecificationFieldIndicator(localFieldId, indicatorData).then((indicatorResp) => {
        validateApiResponse(indicatorResp, 201);
        localFieldIndicator = indicatorResp.body;

        // Step 2: Create first indicator code using builder data
        cy.createSpecificationIndicatorCode(localFieldIndicator.id, indicatorCode1Data, true).then(
          (code1Resp) => {
            validateApiResponse(code1Resp, 201);
            indicatorCode1 = code1Resp.body;

            // Step 3: Create second indicator code using builder data
            cy.createSpecificationIndicatorCode(
              localFieldIndicator.id,
              indicatorCode2Data,
              true,
            ).then((code2Resp) => {
              validateApiResponse(code2Resp, 201);
              indicatorCode2 = code2Resp.body;

              // Step 1 (TestRail): Delete first indicator code of local field
              cy.deleteSpecificationIndicatorCode(indicatorCode1.id, true).then((deleteResp) => {
                validateApiResponse(deleteResp, 204);
              });

              // Step 2 (TestRail): Verify indicator code was deleted and second one still exists
              cy.getSpecificationIndicatorCodes(localFieldIndicator.id).then((verifyResp) => {
                validateApiResponse(verifyResp, 200);

                // Should have one less indicator code now
                expect(
                  verifyResp.body.codes,
                  'Should have 1 remaining indicator code',
                ).to.have.length(1);

                // The remaining code should be the second one
                const remainingCode = verifyResp.body.codes[0];
                expect(remainingCode.id, 'Remaining code should be the second one').to.eq(
                  indicatorCode2.id,
                );
                expect(remainingCode.code, 'Remaining code has correct code').to.eq('1');
                expect(remainingCode.label, 'Remaining code has correct label').to.eq(
                  indicatorCode2Data.label,
                );
                expect(
                  remainingCode.deprecated,
                  'Remaining code has correct deprecated flag',
                ).to.eq(false);

                // Verify the deleted code is not in the response
                const deletedCodeExists = verifyResp.body.codes.some(
                  (code) => code.id === indicatorCode1.id,
                );
                expect(deletedCodeExists, 'Deleted indicator code should not exist').to.be.false;
              });
            });
          },
        );
      });
    },
  );
});
