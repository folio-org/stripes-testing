import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic - Indicator Code Deprecated API', () => {
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

  // Use a field tag that's not used by other tests
  const LOCAL_FIELD_TAG = '980';

  let user;
  let bibSpecId;
  let localFieldId;
  let indicatorId;
  let indicatorCodeId;

  before('Create user and setup test data', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
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

          // Create a local field for testing indicator codes
          const localFieldPayload = {
            tag: LOCAL_FIELD_TAG,
            label: 'AT_C502988_Local Field with Deprecated Indicator Code',
            url: 'http://www.example.org/field980.html',
            repeatable: true,
            required: false,
            deprecated: false,
            scope: 'local',
          };

          cy.createSpecificationField(bibSpecId, localFieldPayload).then((fieldResp) => {
            expect(fieldResp.status).to.eq(201);
            localFieldId = fieldResp.body.id;

            // Create indicator for the local field
            const indicatorPayload = {
              order: 1,
              label: 'AT_C502988_Test Indicator',
            };

            cy.createSpecificationFieldIndicator(localFieldId, indicatorPayload).then(
              (indicatorResp) => {
                expect(indicatorResp.status).to.eq(201);
                indicatorId = indicatorResp.body.id;

                // Create an indicator code for testing deprecated field updates
                const indicatorCodePayload = {
                  code: '0',
                  label: 'AT_C502988_Test Indicator Code',
                  deprecated: false,
                };

                cy.createSpecificationIndicatorCode(indicatorId, indicatorCodePayload).then(
                  (codeResp) => {
                    expect(codeResp.status).to.eq(201);
                    indicatorCodeId = codeResp.body.id;
                  },
                );
              },
            );
          });
        });
      });
    });
  });

  after('Complete cleanup', () => {
    if (user) {
      cy.getAdminToken();
      // Clean up the created local field (this will also delete its indicators and indicator codes)
      if (localFieldId) {
        cy.deleteSpecificationField(localFieldId, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C502988 Update Deprecated Indicator code of Local field for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502988', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Update indicator code with deprecated: true
      const updatePayload1 = {
        code: '0',
        label: 'AT_C502988_Test Indicator Code',
        deprecated: true,
      };

      cy.updateSpecificationIndicatorCode(indicatorCodeId, updatePayload1).then((response1) => {
        expect(response1.status, 'Step 1: Update with deprecated: true should succeed').to.eq(202);
        expect(response1.body.id).to.eq(indicatorCodeId);
        expect(response1.body.code).to.eq(updatePayload1.code);
        expect(response1.body.label).to.eq(updatePayload1.label);
        expect(response1.body.deprecated).to.eq(updatePayload1.deprecated);
        expect(response1.body.scope).to.eq('local');

        // Step 2: Update indicator code with deprecated: false
        const updatePayload2 = {
          code: '0',
          label: 'AT_C502988_Test Indicator Code',
          deprecated: false,
        };

        cy.updateSpecificationIndicatorCode(indicatorCodeId, updatePayload2).then((response2) => {
          expect(response2.status, 'Step 2: Update with deprecated: false should succeed').to.eq(
            202,
          );
          expect(response2.body.id).to.eq(indicatorCodeId);
          expect(response2.body.code).to.eq(updatePayload2.code);
          expect(response2.body.label).to.eq(updatePayload2.label);
          expect(response2.body.deprecated).to.eq(updatePayload2.deprecated);
          expect(response2.body.scope).to.eq('local');

          // Step 3: Update indicator code with invalid deprecated value (should fail)
          const updatePayload3 = {
            code: '0',
            label: 'AT_C502988_Test Indicator Code',
            deprecated: 'invalid_value',
          };

          cy.updateSpecificationIndicatorCode(indicatorCodeId, updatePayload3, false).then(
            (response3) => {
              expect(
                response3.status,
                'Step 3: Update with invalid deprecated value should fail',
              ).to.eq(400);
              expect(response3.body.errors.length).to.be.greaterThan(0);

              // Verify error message contains JSON parse error information
              const errorMessage = response3.body.errors[0].message;
              expect(errorMessage).to.contain('JSON parse error');
            },
          );
        });
      });
    },
  );
});
