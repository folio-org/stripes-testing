/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Update Local Field Label API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  const LOCAL_FIELD_TAG = '990';

  let user;
  let bibSpecId;
  let localFieldId;

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

        // Create a local field for testing update
        const localFieldPayload = {
          tag: LOCAL_FIELD_TAG,
          label: 'AT_C490944_Original Local Field',
          url: 'http://www.example.org/field990.html',
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
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C490944 Update Local Field "label" for MARC bib spec (API) (spitfire)',
    { tags: ['criticalPath', 'C490944', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      const updatedLabel = 'Field name with updates made by user';

      // Step 1: Update the local field with new label
      const updatePayload = {
        tag: LOCAL_FIELD_TAG,
        label: updatedLabel,
        url: 'http://www.example.org/field100.html',
        repeatable: true,
        required: true,
      };

      cy.updateSpecificationField(localFieldId, updatePayload).then((updateResp) => {
        expect(updateResp.status, 'Step 1: Update field label').to.eq(202);
        expect(updateResp.body).to.exist;
        expect(updateResp.body.id).to.eq(localFieldId);
        expect(updateResp.body.label).to.eq(updatedLabel);
        expect(updateResp.body.tag).to.eq(LOCAL_FIELD_TAG);
        expect(updateResp.body.url).to.eq('http://www.example.org/field100.html');
        expect(updateResp.body.repeatable).to.eq(true);
        expect(updateResp.body.required).to.eq(true);
      });

      // Step 2: Get all fields to verify the update
      cy.getSpecificationFields(bibSpecId).then((getResp) => {
        expect(getResp.status, 'Step 2: Get all fields after update').to.eq(200);
        expect(getResp.body.fields).to.exist;

        // Find the updated field in the response
        const updatedField = getResp.body.fields.find((field) => field.id === localFieldId);
        expect(updatedField, 'Updated field should exist in fields collection').to.exist;
        expect(updatedField.label, 'Field should have the updated label').to.eq(updatedLabel);
        expect(updatedField.tag, 'Field should maintain the same tag').to.eq(LOCAL_FIELD_TAG);
        expect(updatedField.url, 'Field should have the updated URL').to.eq(
          'http://www.example.org/field100.html',
        );
        expect(updatedField.repeatable, 'Field should have updated repeatable flag').to.eq(true);
        expect(updatedField.required, 'Field should have updated required flag').to.eq(true);
        expect(updatedField.scope, 'Field should maintain local scope').to.eq('local');
      });
    },
  );
});
