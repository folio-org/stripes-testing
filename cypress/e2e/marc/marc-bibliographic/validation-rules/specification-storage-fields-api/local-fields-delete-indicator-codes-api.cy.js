/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

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

  const LOCAL_FIELD_TAG = '997';

  function validateApiResponse(response, expectedStatus) {
    expect(response.status).to.eq(expectedStatus);
  }

  let user;
  let bibSpecId;
  let localFieldId;

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        // Find the specification with profile 'bibliographic'
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;

        // Clean up any existing local field with tag before test execution
        cy.getSpecificationFields(bibSpecId).then((response) => {
          if (response.status === 200) {
            const existingLocalField = response.body.fields.find(
              (f) => f.tag === LOCAL_FIELD_TAG && f.scope === 'local',
            );
            if (existingLocalField) {
              cy.deleteSpecificationField(existingLocalField.id, false);
            }
          }
        });

        // Create a local field for testing
        const localFieldPayload = {
          tag: LOCAL_FIELD_TAG,
          label: 'AT_C503100_Test Local Field',
          url: 'http://www.example.org/field997.html',
          repeatable: true,
          required: false,
          deprecated: false,
          scope: 'local',
        };

        cy.createSpecificationField(bibSpecId, localFieldPayload).then((fieldResp) => {
          expect(fieldResp.status).to.eq(201);
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

      // Step 1: Create indicator for the local field
      cy.createSpecificationFieldIndicator(localFieldId, {
        order: 1,
        label: 'AT_C503100_Test Indicator',
      }).then((indicatorResp) => {
        validateApiResponse(indicatorResp, 201);
        localFieldIndicator = indicatorResp.body;

        // Step 2: Create first indicator code
        cy.createSpecificationIndicatorCode(
          localFieldIndicator.id,
          {
            code: '0',
            label: 'AT_C503100_First indicator code',
            deprecated: false,
          },
          true,
        ).then((code1Resp) => {
          validateApiResponse(code1Resp, 201);
          indicatorCode1 = code1Resp.body;

          // Step 3: Create second indicator code
          cy.createSpecificationIndicatorCode(
            localFieldIndicator.id,
            {
              code: '1',
              label: 'AT_C503100_Second indicator code',
              deprecated: false,
            },
            true,
          ).then((code2Resp) => {
            validateApiResponse(code2Resp, 201);
            indicatorCode2 = code2Resp.body;

            // Step 1 (TestRail): Delete first indicator code of local field
            cy.deleteSpecificationIndicatorCode(indicatorCode1.id, true).then((deleteResp) => {
              expect(deleteResp.status, 'Step 1: Delete local field indicator code').to.eq(204);
            });

            // Step 2 (TestRail): Verify indicator code was deleted and second one still exists
            cy.getSpecificationIndicatorCodes(localFieldIndicator.id).then((verifyResp) => {
              expect(verifyResp.status, 'Step 2: Get indicator codes after deletion').to.eq(200);

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
                'AT_C503100_Second indicator code',
              );
              expect(remainingCode.deprecated, 'Remaining code has correct deprecated flag').to.eq(
                false,
              );

              // Verify the deleted code is not in the response
              const deletedCodeExists = verifyResp.body.codes.some(
                (code) => code.id === indicatorCode1.id,
              );
              expect(deletedCodeExists, 'Deleted indicator code should not exist').to.be.false;
            });
          });
        });
      });
    },
  );
});
