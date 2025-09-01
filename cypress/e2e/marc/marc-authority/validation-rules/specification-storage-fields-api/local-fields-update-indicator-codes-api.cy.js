/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - Local Fields Update Indicator Codes API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
    Permissions.specificationStorageDeleteSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageUpdateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageUpdateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageDeleteSpecificationIndicatorCode.gui,
  ];

  const TAG = '998';
  const AT_PREFIX = 'AT_C502996';

  let user;
  let authoritySpecId;
  let localField;
  let localFieldIndicator;
  let indicatorCode;

  const localFieldData = {
    tag: TAG,
    label: `${AT_PREFIX}_Test Local Field`,
    repeatable: true,
    required: false,
    deprecated: false,
    scope: 'local',
  };

  function validateApiResponse(response, expectedStatus) {
    expect(response.status).to.eq(expectedStatus);
  }

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        // Find the specification with profile 'authority'
        const authoritySpec = specs.find((s) => s.profile === 'authority');
        expect(authoritySpec, 'MARC authority specification exists').to.exist;
        authoritySpecId = authoritySpec.id;

        // Clean up any existing local field with tag before test execution
        cy.getSpecificationFields(authoritySpecId).then((response) => {
          const existingLocalField = response.body.fields.find(
            (f) => f.tag === TAG && f.scope === 'local',
          );
          if (existingLocalField) {
            cy.deleteSpecificationField(existingLocalField.id, false);
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
    'C502996 Update Indicator Code of Local Field for MARC authority spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502996', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Create local field
      cy.createSpecificationField(authoritySpecId, localFieldData).then((createResp) => {
        validateApiResponse(createResp, 201);
        localField = createResp.body;
        expect(localField.scope, 'Created field is local').to.eq('local');

        // Step 2: Create indicator for the local field
        cy.createSpecificationFieldIndicator(localField.id, {
          order: 1,
          label: `${AT_PREFIX}_Test Indicator`,
        }).then((indicatorResp) => {
          validateApiResponse(indicatorResp, 201);
          localFieldIndicator = indicatorResp.body;

          // Step 3: Create indicator code for the local field indicator
          const initialIndicatorCodeData = {
            code: '0',
            label: `${AT_PREFIX}_Initial Code`,
            deprecated: false,
          };

          cy.createSpecificationIndicatorCode(
            localFieldIndicator.id,
            initialIndicatorCodeData,
            true,
          ).then((codeResp) => {
            validateApiResponse(codeResp, 201);
            indicatorCode = codeResp.body;
            expect(indicatorCode.code, 'Indicator code created with correct code').to.eq(
              initialIndicatorCodeData.code,
            );
            expect(indicatorCode.label, 'Indicator code created with correct label').to.eq(
              initialIndicatorCodeData.label,
            );
            expect(
              indicatorCode.deprecated,
              'Indicator code created with correct deprecated flag',
            ).to.eq(initialIndicatorCodeData.deprecated);

            // Step 4: Update the indicator code with new values
            const updatePayload = {
              code: '1',
              label: `${AT_PREFIX}_Updated Code Label`,
              deprecated: true,
            };

            cy.updateSpecificationIndicatorCode(indicatorCode.id, updatePayload, true).then(
              (updateResp) => {
                validateApiResponse(updateResp, 202);
                expect(updateResp.body.code, 'Updated code field correctly').to.eq(
                  updatePayload.code,
                );
                expect(updateResp.body.label, 'Updated label field correctly').to.eq(
                  updatePayload.label,
                );
                expect(updateResp.body.deprecated, 'Updated deprecated field correctly').to.eq(
                  updatePayload.deprecated,
                );

                // Step 5: Verify the indicator code was updated via GET request
                cy.getSpecificationIndicatorCodes(localFieldIndicator.id).then((verifyResp) => {
                  validateApiResponse(verifyResp, 200);

                  const updatedCode = verifyResp.body.codes.find(
                    (code) => code.id === indicatorCode.id,
                  );
                  expect(updatedCode, 'Updated indicator code exists in response').to.exist;
                  expect(updatedCode.code, 'Verified updated code field').to.eq(updatePayload.code);
                  expect(updatedCode.label, 'Verified updated label field').to.eq(
                    updatePayload.label,
                  );
                  expect(updatedCode.deprecated, 'Verified updated deprecated field').to.eq(
                    updatePayload.deprecated,
                  );
                });
              },
            );
          });
        });
      });
    },
  );
});
