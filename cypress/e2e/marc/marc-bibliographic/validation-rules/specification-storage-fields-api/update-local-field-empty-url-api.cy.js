/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Update Local Field Empty URL API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  const LOCAL_FIELD_TAG = '989';

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
          label: 'AT_C490945_Original Local Field',
          url: 'http://www.example.org/field989.html',
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
    cy.getAdminToken();
    if (user) {
      Users.deleteViaApi(user.userId);
    }
    if (localFieldId) {
      cy.deleteSpecificationField(localFieldId, false);
    }
  });

  it(
    'C490945 Update Local Field with empty "url" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C490945', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Update the local field WITHOUT url field - should succeed
      const updatePayloadWithoutUrl = {
        tag: LOCAL_FIELD_TAG,
        label: 'Test name',
        repeatable: true,
        required: false,
      };

      cy.updateSpecificationField(localFieldId, updatePayloadWithoutUrl).then((updateResp) => {
        expect(updateResp.status, 'Step 1: Update field without url should succeed').to.eq(202);
        expect(updateResp.body).to.exist;
        expect(updateResp.body.id).to.eq(localFieldId);
        expect(updateResp.body.label).to.eq('Test name');
        expect(updateResp.body.tag).to.eq(LOCAL_FIELD_TAG);
        expect(updateResp.body.repeatable).to.eq(true);
        expect(updateResp.body.required).to.eq(false);
        // The url field should not be present in response when not provided in request
        expect(updateResp.body).to.not.have.property('url');
      });

      // Step 2: Update the local field WITH empty url field - should fail
      const updatePayloadWithEmptyUrl = {
        tag: LOCAL_FIELD_TAG,
        label: 'Test name',
        url: '',
        repeatable: true,
        required: false,
      };

      cy.updateSpecificationField(localFieldId, updatePayloadWithEmptyUrl, false).then(
        (updateResp) => {
          expect(updateResp.status, 'Step 2: Update field with empty url should fail').to.eq(400);
          expect(updateResp.body).to.exist;
          expect(updateResp.body.errors).to.exist;
          expect(updateResp.body.errors).to.be.an('array');
          expect(updateResp.body.errors[0]).to.exist;
          expect(
            updateResp.body.errors[0].message,
            'Should return validation error for empty URL',
          ).to.eq("The 'url' field should be valid URL.");
        },
      );
    },
  );
});
