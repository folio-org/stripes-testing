/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Update Local Field Invalid Required API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  const LOCAL_FIELD_TAG = '985';

  let user;
  let bibSpecId;
  let localFieldId;

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
          label: 'AT_C490949_Original Local Field',
          url: 'http://www.example.org/field985.html',
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
      // Clean up the created local field
      if (localFieldId) {
        cy.deleteSpecificationField(localFieldId, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C490949 Cannot update Local Field with invalid value in "required" field for MARC bib spec (API) (spitfire)',
    { tags: ['criticalPath', 'C490949', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Update field with invalid "required" value - should fail with validation error
      // Using string "test" instead of boolean to trigger validation error
      const updatePayload = {
        tag: LOCAL_FIELD_TAG,
        label: 'Name',
        url: 'http://www.example.org/field899.html',
        required: 'test',
        repeatable: false,
      };

      cy.updateSpecificationField(localFieldId, updatePayload, false).then((response) => {
        expect(response.status, 'Should return 400 status for invalid required value').to.eq(400);
        expect(response.body, 'Response body should exist').to.exist;
        expect(
          response.body.errors[0].message,
          'Should contain validation error about invalid required value',
        ).to.include('JSON parse error');
      });
    },
  );
});
