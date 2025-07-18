/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - Local Fields Delete Indicator Codes API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageUpdateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageUpdateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageDeleteSpecificationIndicatorCode.gui,
  ];

  const TAG = '997';

  let user;
  let authoritySpecId;
  let localField;
  let localFieldIndicator;
  let indicatorCode1;
  let indicatorCode2;

  const localFieldData = {
    tag: TAG,
    label: 'Test Local Field',
    repeatable: true,
    required: false,
    deprecated: false,
    scope: 'local',
  };

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
    'C503104 Delete Indicator Code of Local Field for MARC authority spec (API) (spitfire)',
    { tags: ['criticalPath', 'C503104', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Create local field
      cy.createSpecificationField(authoritySpecId, localFieldData).then((createResp) => {
        expect(createResp.status).to.eq(201);
        localField = createResp.body;

        // Create indicator for the local field
        cy.createSpecificationFieldIndicator(localField.id, {
          order: 1,
          label: 'Test Indicator',
        }).then((indicatorResp) => {
          expect(indicatorResp.status).to.eq(201);
          localFieldIndicator = indicatorResp.body;

          // Create first indicator code
          cy.createSpecificationIndicatorCode(
            localFieldIndicator.id,
            {
              code: '0',
              label: 'First indicator code',
              deprecated: false,
            },
            true,
          ).then((code1Resp) => {
            expect(code1Resp.status).to.eq(201);
            indicatorCode1 = code1Resp.body;

            // Create second indicator code
            cy.createSpecificationIndicatorCode(
              localFieldIndicator.id,
              {
                code: '1',
                label: 'Second indicator code',
                deprecated: false,
              },
              true,
            ).then((code2Resp) => {
              expect(code2Resp.status).to.eq(201);
              indicatorCode2 = code2Resp.body;

              // Step 1: Delete first indicator code of local field
              cy.deleteSpecificationIndicatorCode(indicatorCode1.id, true).then((deleteResp) => {
                expect(deleteResp.status, 'Step 1: Delete local field indicator code').to.eq(204);
              });

              // Step 2: Verify indicator code was deleted and second one still exists
              cy.getSpecificationIndicatorCodes(localFieldIndicator.id).then((verifyResp) => {
                expect(verifyResp.status, 'Step 2: Get indicator codes after delete').to.eq(200);

                // Should have one less indicator code now
                expect(verifyResp.body.codes).to.have.length(1);

                // The remaining code should be the second one
                const remainingCode = verifyResp.body.codes[0];
                expect(remainingCode.id).to.eq(indicatorCode2.id);
                expect(remainingCode.code).to.eq('1');
                expect(remainingCode.label).to.eq('Second indicator code');
                expect(remainingCode.deprecated).to.eq(false);

                // Verify the deleted code is not in the response
                const deletedCodeExists = verifyResp.body.codes.some(
                  (code) => code.id === indicatorCode1.id,
                );
                expect(deletedCodeExists, 'Deleted indicator code should not exist').to.be.false;
              });
            });
          });
        });
      });
    },
  );
});
