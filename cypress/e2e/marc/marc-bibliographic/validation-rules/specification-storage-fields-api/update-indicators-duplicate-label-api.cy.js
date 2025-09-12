/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Update Indicators Duplicate Label API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageUpdateSpecificationFieldIndicator.gui,
  ];

  const LOCAL_FIELD_TAG = '984';
  const DUPLICATE_LABEL = 'Same Ind $ name';

  let user;
  let bibSpecId;
  let localFieldId;
  let indicator1Id;
  let indicator2Id;

  before('Create user and setup test data', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;

        // Clean up any existing local field with tag before test execution
        cy.getSpecificationFields(bibSpecId).then((response) => {
          const existingLocalField = response.body.fields.find(
            (f) => f.tag === LOCAL_FIELD_TAG && f.scope === 'local',
          );
          if (existingLocalField) {
            cy.deleteSpecificationField(existingLocalField.id, false);
          }
        });

        // Create a local field for testing indicators
        const localFieldPayload = {
          tag: LOCAL_FIELD_TAG,
          label: 'AT_C502980_Local Field with Two Indicators',
          url: 'http://www.example.org/field984.html',
          repeatable: true,
          required: false,
          deprecated: false,
          scope: 'local',
        };

        cy.createSpecificationField(bibSpecId, localFieldPayload).then((fieldResp) => {
          expect(fieldResp.status).to.eq(201);
          localFieldId = fieldResp.body.id;

          // Create first indicator
          const indicator1Payload = {
            order: 1,
            label: DUPLICATE_LABEL,
          };

          cy.createSpecificationFieldIndicator(localFieldId, indicator1Payload).then(
            (indicator1Resp) => {
              expect(indicator1Resp.status).to.eq(201);
              indicator1Id = indicator1Resp.body.id;

              // Create second indicator with different label initially
              const indicator2Payload = {
                order: 2,
                label: 'Different Initial Label',
              };

              cy.createSpecificationFieldIndicator(localFieldId, indicator2Payload).then(
                (indicator2Resp) => {
                  expect(indicator2Resp.status).to.eq(201);
                  indicator2Id = indicator2Resp.body.id;
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
      // Clean up the created local field (this will also delete its indicators)
      if (localFieldId) {
        cy.deleteSpecificationField(localFieldId, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C502980 Update Indicators of Local field with duplicate "label" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502980', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Update second indicator to have the same label as the first indicator
      const updatePayload = {
        order: 2,
        label: DUPLICATE_LABEL,
      };

      cy.updateSpecificationFieldIndicator(indicator2Id, updatePayload).then((response) => {
        expect(response.status, 'Step 1: Update with duplicate label should succeed').to.eq(202);
        expect(response.body, 'Response body should exist').to.exist;
        expect(response.body.id).to.eq(indicator2Id);
        expect(response.body.label).to.eq(DUPLICATE_LABEL);
        expect(response.body.order).to.eq(2);
      });

      // Step 2: GET indicators to verify the update was successful
      cy.getSpecificationFieldIndicators(localFieldId).then((response) => {
        expect(response.status, 'Step 2: GET indicators should succeed').to.eq(200);
        expect(response.body, 'Response body should exist').to.exist;
        expect(response.body.indicators, 'Should contain indicators array').to.exist;
        expect(response.body.indicators).to.have.length(2);

        // Verify both indicators now have the same label
        const indicator1 = response.body.indicators.find((ind) => ind.id === indicator1Id);
        const indicator2 = response.body.indicators.find((ind) => ind.id === indicator2Id);

        expect(indicator1, 'First indicator should exist').to.exist;
        expect(indicator1.label).to.eq(DUPLICATE_LABEL);
        expect(indicator1.order).to.eq(1);

        expect(indicator2, 'Second indicator should exist').to.exist;
        expect(indicator2.label).to.eq(DUPLICATE_LABEL);
        expect(indicator2.order).to.eq(2);
      });
    },
  );
});
