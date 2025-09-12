/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Update Local Field Invalid URL Protocol API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  const LOCAL_FIELD_TAG = '988';

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
          label: 'AT_C490946_Original Local Field',
          url: 'http://www.example.org/field988.html',
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
    'C490946 Cannot update Local Field with invalid protocol in "url" field for MARC bib spec (API) (spitfire)',
    { tags: ['criticalPath', 'C490946', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Update field with URL missing protocol - should fail
      const baseUpdatePayload = {
        tag: LOCAL_FIELD_TAG,
        label: 'Name',
        repeatable: false,
        required: false,
      };

      const updatePayloadMissingProtocol = {
        ...baseUpdatePayload,
        url: 'www.example.org/field899.html',
      };

      cy.updateSpecificationField(localFieldId, updatePayloadMissingProtocol, false).then(
        (updateResp1) => {
          expect(
            updateResp1.status,
            'Step 1: Update field with missing protocol should fail',
          ).to.eq(400);
          expect(updateResp1.body).to.exist;
          expect(updateResp1.body.errors).to.exist;
          expect(updateResp1.body.errors).to.be.an('array');
          expect(updateResp1.body.errors[0]).to.exist;
          expect(
            updateResp1.body.errors[0].message,
            'Should return validation error for missing protocol',
          ).to.eq("The 'url' field should be valid URL.");
        },
      );

      // Step 2: Update field with invalid protocol format - should fail
      const updatePayloadInvalidProtocol = {
        ...baseUpdatePayload,
        url: 'httpswww.example.org/field899.html',
      };

      cy.updateSpecificationField(localFieldId, updatePayloadInvalidProtocol, false).then(
        (updateResp2) => {
          expect(
            updateResp2.status,
            'Step 2: Update field with invalid protocol should fail',
          ).to.eq(400);
          expect(updateResp2.body).to.exist;
          expect(updateResp2.body.errors).to.exist;
          expect(updateResp2.body.errors).to.be.an('array');
          expect(updateResp2.body.errors[0]).to.exist;
          expect(
            updateResp2.body.errors[0].message,
            'Should return validation error for invalid protocol',
          ).to.eq("The 'url' field should be valid URL.");
        },
      );

      // Step 3: Update field with valid protocol - should succeed
      const updatePayloadValidProtocol = {
        tag: LOCAL_FIELD_TAG,
        label: 'Name',
        url: 'http://www.updatedurlexample.org/field899.html',
        repeatable: true,
        required: false,
      };

      cy.updateSpecificationField(localFieldId, updatePayloadValidProtocol).then((updateResp3) => {
        expect(updateResp3.status, 'Step 3: Update field with valid protocol should succeed').to.eq(
          202,
        );
        expect(updateResp3.body).to.exist;
        expect(updateResp3.body.id).to.eq(localFieldId);
        expect(updateResp3.body.label).to.eq('Name');
        expect(updateResp3.body.tag).to.eq(LOCAL_FIELD_TAG);
        expect(updateResp3.body.url).to.eq('http://www.updatedurlexample.org/field899.html');
        expect(updateResp3.body.repeatable).to.eq(true);
        expect(updateResp3.body.required).to.eq(false);
      });
    },
  );
});
