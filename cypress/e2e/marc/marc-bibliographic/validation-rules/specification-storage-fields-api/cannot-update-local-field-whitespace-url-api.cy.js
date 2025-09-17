/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Update Local Field Whitespace URL API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  const LOCAL_FIELD_TAG = '987';

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
          label: 'AT_C490947_Original Local Field',
          url: 'http://www.example.org/field987.html',
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
    'C490947 Cannot update Local Field with whitespace in "url" field for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C490947', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);
      const updatePayloadTemplate = {
        tag: LOCAL_FIELD_TAG,
        label: 'Name',
        repeatable: true,
        required: false,
      };

      // Step 1: Update field with concatenated URLs (no spaces) - should fail
      const updatePayloadConcatenatedUrls = {
        ...updatePayloadTemplate,
        url: 'http://www.example.org/field899.htmlhttps://www.example2.org/field899.html',
      };

      cy.updateSpecificationField(localFieldId, updatePayloadConcatenatedUrls, false).then(
        (updateResp1) => {
          expect(
            updateResp1.status,
            'Step 1: Update field with concatenated URLs should fail',
          ).to.eq(400);
          expect(updateResp1.body).to.exist;
          expect(updateResp1.body.errors).to.exist;
          expect(updateResp1.body.errors).to.be.an('array');
          expect(updateResp1.body.errors[0]).to.exist;
          expect(
            updateResp1.body.errors[0].message,
            'Should return validation error for concatenated URLs',
          ).to.eq("The 'url' field should be valid URL.");
        },
      );

      // Step 2: Update field with spaces in middle and at beginning/end - should fail
      const updatePayloadSpacesInMiddle = {
        ...updatePayloadTemplate,
        url: ' http://www.exam ple.org/field899.html ',
      };

      cy.updateSpecificationField(localFieldId, updatePayloadSpacesInMiddle, false).then(
        (updateResp2) => {
          expect(
            updateResp2.status,
            'Step 2: Update field with spaces in middle should fail',
          ).to.eq(400);
          expect(updateResp2.body).to.exist;
          expect(updateResp2.body.errors).to.exist;
          expect(updateResp2.body.errors).to.be.an('array');
          expect(updateResp2.body.errors[0]).to.exist;
          expect(
            updateResp2.body.errors[0].message,
            'Should return validation error for spaces in middle',
          ).to.eq("The 'url' field should be valid URL.");
        },
      );

      // Step 3: Update field with spaces only at beginning/end (trimming should work) - should succeed
      const updatePayloadSpacesAtEnds = {
        ...updatePayloadTemplate,
        url: ' http://www.example.org/field899.html ',
      };

      cy.updateSpecificationField(localFieldId, updatePayloadSpacesAtEnds).then((updateResp3) => {
        expect(updateResp3.status, 'Step 3: Update field with spaces at ends should succeed').to.eq(
          202,
        );
        expect(updateResp3.body).to.exist;
        expect(updateResp3.body.id).to.eq(localFieldId);
        expect(updateResp3.body.label).to.eq('Name');
        expect(updateResp3.body.tag).to.eq(LOCAL_FIELD_TAG);
        expect(updateResp3.body.url, 'URL should be trimmed').to.eq(
          'http://www.example.org/field899.html',
        );
        expect(updateResp3.body.repeatable).to.eq(true);
        expect(updateResp3.body.required).to.eq(false);
      });

      // Step 4: Update field with only spaces in URL - should fail
      const updatePayloadOnlySpaces = {
        ...updatePayloadTemplate,
        url: ' ',
      };

      cy.updateSpecificationField(localFieldId, updatePayloadOnlySpaces, false).then(
        (updateResp4) => {
          expect(updateResp4.status, 'Step 4: Update field with only spaces should fail').to.eq(
            400,
          );
          expect(updateResp4.body).to.exist;
          expect(updateResp4.body.errors).to.exist;
          expect(updateResp4.body.errors).to.be.an('array');
          expect(updateResp4.body.errors[0]).to.exist;
          expect(
            updateResp4.body.errors[0].message,
            'Should return validation error for only spaces',
          ).to.eq("The 'url' field should be valid URL.");
        },
      );
    },
  );
});
