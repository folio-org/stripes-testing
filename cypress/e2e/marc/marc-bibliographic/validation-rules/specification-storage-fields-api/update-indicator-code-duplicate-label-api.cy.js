/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Update Indicator Code Duplicate Label API', () => {
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
  ];

  const LOCAL_FIELD_TAG = '982';
  const DUPLICATE_LABEL = 'Duplicate label$ - test 1';

  let user;
  let bibSpecId;
  let localFieldId;
  let indicatorId;
  let indicatorCode1Id;
  let indicatorCode2Id;

  before('Create user and setup test data', () => {
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
              (f) => f.tag === LOCAL_FIELD_TAG && f.scope === 'local',
            );
            if (existingLocalField) {
              cy.deleteSpecificationField(existingLocalField.id, false);
            }
          }
        });

        // Create a local field for testing indicator codes
        const localFieldPayload = {
          tag: LOCAL_FIELD_TAG,
          label: 'AT_C502987_Local Field with Indicator Codes',
          url: 'http://www.example.org/field982.html',
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
            label: 'AT_C502987_Test Indicator',
          };

          cy.createSpecificationFieldIndicator(localFieldId, indicatorPayload).then(
            (indicatorResp) => {
              expect(indicatorResp.status).to.eq(201);
              indicatorId = indicatorResp.body.id;

              // Create first indicator code with the duplicate label
              const indicatorCode1Payload = {
                code: '0',
                label: DUPLICATE_LABEL,
                deprecated: false,
              };

              cy.createSpecificationIndicatorCode(indicatorId, indicatorCode1Payload).then(
                (code1Resp) => {
                  expect(code1Resp.status).to.eq(201);
                  indicatorCode1Id = code1Resp.body.id;

                  // Create second indicator code with different label initially
                  const indicatorCode2Payload = {
                    code: '1',
                    label: 'Different Initial Label',
                    deprecated: false,
                  };

                  cy.createSpecificationIndicatorCode(indicatorId, indicatorCode2Payload).then(
                    (code2Resp) => {
                      expect(code2Resp.status).to.eq(201);
                      indicatorCode2Id = code2Resp.body.id;
                    },
                  );
                },
              );
            },
          );
        });
      });
    });
  });

  after('Delete test user and cleanup', () => {
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
    'C502987 Update Indicator code of Local field with duplicate "label" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502987', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Update second indicator code to have the same label as the first indicator code
      const updatePayload = {
        code: '4',
        label: DUPLICATE_LABEL,
      };

      cy.updateSpecificationIndicatorCode(indicatorCode2Id, updatePayload).then((response) => {
        expect(response.status, 'Step 1: Update with duplicate label should succeed').to.eq(202);
        expect(response.body, 'Response body should exist').to.exist;
        expect(response.body.id).to.eq(indicatorCode2Id);
        expect(response.body.code).to.eq('4');
        expect(response.body.label).to.eq(DUPLICATE_LABEL);
        expect(response.body.deprecated).to.eq(false);
      });

      // Step 2: GET indicator codes to verify the update was successful
      cy.getSpecificationIndicatorCodes(indicatorId).then((response) => {
        expect(response.status, 'Step 2: GET indicator codes should succeed').to.eq(200);
        expect(response.body, 'Response body should exist').to.exist;
        expect(response.body.codes, 'Should contain indicator codes array').to.exist;
        expect(response.body.codes).to.have.length(2);

        // Verify both indicator codes now have the same label
        const indicatorCode1 = response.body.codes.find((code) => code.id === indicatorCode1Id);
        const indicatorCode2 = response.body.codes.find((code) => code.id === indicatorCode2Id);

        expect(indicatorCode1, 'First indicator code should exist').to.exist;
        expect(indicatorCode1.label).to.eq(DUPLICATE_LABEL);
        expect(indicatorCode1.code).to.eq('0');

        expect(indicatorCode2, 'Second indicator code should exist').to.exist;
        expect(indicatorCode2.label).to.eq(DUPLICATE_LABEL);
        expect(indicatorCode2.code).to.eq('4');
      });
    },
  );
});
