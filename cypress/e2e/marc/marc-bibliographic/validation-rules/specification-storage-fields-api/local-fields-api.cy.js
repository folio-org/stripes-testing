/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  cleanupField,
} from '../../../../../support/api/specifications-helper';

const BASE_FIELD_TAG = '975'; // Unique tag not used by other tests
const BASE_URL = 'http://www.example.org/field975.html';

// Define tags that will be used in tests (minimal set since we cleanup after each test)
const TEST_TAGS = [
  BASE_FIELD_TAG, // 975 - used by most tests
  '897', // C490936 - needs different tag for permission test
];

// Cleanup function to remove existing fields with test tags
const cleanupTestFields = (specId) => {
  cy.getSpecificationFields(specId).then((response) => {
    if (response.body && response.body.fields) {
      const fieldsToDelete = response.body.fields.filter((field) => TEST_TAGS.includes(field.tag));

      const cleanupPromises = fieldsToDelete.map((field) => cleanupField(field.id));
      return Cypress.Promise.all(cleanupPromises);
    }
    return Cypress.Promise.resolve();
  });
};

const requiredPermissions = [
  Permissions.specificationStorageCreateSpecificationField.gui,
  Permissions.specificationStorageDeleteSpecificationField.gui,
  Permissions.specificationStorageGetSpecificationFields.gui,
  Permissions.specificationStorageUpdateSpecificationField.gui,
];

const limitedPermissions = [
  Permissions.specificationStorageGetSpecificationFields.gui,
  Permissions.specificationStorageCreateSpecificationField.gui,
  Permissions.specificationStorageDeleteSpecificationField.gui,
  // No update permission included
];

describe('Specification Storage - Create Field API', () => {
  let user;
  let limitedUser;
  let fieldId;
  let bibSpecId;

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;
        // Clean up any existing fields with tags we'll use in tests
        cleanupTestFields(bibSpecId);
      });
    });
  });

  afterEach('Cleanup: delete field', () => {
    cy.getAdminToken();
    if (fieldId) {
      cleanupField(fieldId);
    }
  });

  after('Cleanup: delete user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Users.deleteViaApi(limitedUser.userId);
  });

  it(
    'C490917 Create Local Field (not repeatable, not required, not deprecated) for MARC bib spec (API) (spitfire)',
    { tags: ['C490917', 'criticalPath', 'spitfire'] },
    () => {
      const payload = {
        tag: BASE_FIELD_TAG,
        label: 'AT_C490917_Custom Field - Contributor Data',
        url: BASE_URL,
        repeatable: false,
        required: false,
        deprecated: false,
      };

      cy.getUserToken(user.username, user.password);
      cy.createSpecificationField(bibSpecId, payload).then((response) => {
        validateApiResponse(response, 201);
        const respBody = response.body;
        fieldId = respBody.id;
        expect(respBody).to.include({
          ...payload,
          specificationId: bibSpecId,
          scope: 'local',
        });
      });
    },
  );

  it(
    'C490918 Create Local Field (not repeatable, not required, not deprecated selected as default) for MARC bib spec (API) (spitfire)',
    { tags: ['C490918', 'criticalPath', 'spitfire'] },
    () => {
      const payload = {
        tag: BASE_FIELD_TAG,
        label: 'AT_C490918_Custom Field - Contributor Data',
        url: BASE_URL,
      };

      cy.getUserToken(user.username, user.password);
      cy.createSpecificationField(bibSpecId, payload).then((response) => {
        validateApiResponse(response, 201);
        const respBody = response.body;
        fieldId = respBody.id;
        expect(respBody).to.include({
          ...payload,
          repeatable: true,
          required: false,
          deprecated: false,
          specificationId: bibSpecId,
          scope: 'local',
        });
      });
    },
  );

  it(
    'C490928 Create Local Field with duplicate "label" for MARC bib spec (API) (spitfire)',
    { tags: ['C490928', 'criticalPath', 'spitfire'] },
    () => {
      const labels = ['Control Number', 'Title Statement', 'Local'];
      labels.forEach((label) => {
        const payload = {
          tag: BASE_FIELD_TAG,
          label: `AT_C490928_${label}`,
          url: BASE_URL,
        };

        cy.getUserToken(user.username, user.password);
        cy.createSpecificationField(bibSpecId, payload)
          .then((response) => {
            validateApiResponse(response, 201);
            const respBody = response.body;
            fieldId = respBody.id;
          })
          .then(() => {
            cy.deleteSpecificationField(fieldId);
          });
      });
    },
  );

  it(
    'C490951 Update all fields in Local Field for MARC bib spec (API) (spitfire)',
    { tags: ['C490951', 'criticalPath', 'spitfire'] },
    () => {
      // Step 1: Create a Local MARC field with all flags true
      const initialPayload = {
        tag: BASE_FIELD_TAG,
        label: 'AT_C490951_Custom Field - Contributor Data',
        url: BASE_URL,
        repeatable: true,
        required: false,
        deprecated: true,
      };

      cy.getUserToken(user.username, user.password);
      cy.createSpecificationField(bibSpecId, initialPayload).then((response) => {
        validateApiResponse(response, 201);
        const respBody = response.body;
        fieldId = respBody.id;
        expect(respBody).to.include({
          ...initialPayload,
          specificationId: bibSpecId,
          scope: 'local',
        });

        // Step 2: Update the field with all flags false
        const updatePayload1 = {
          tag: BASE_FIELD_TAG, // Keep same tag, just update other properties
          label: 'AT_C490951_Field name with updates made by user',
          url: 'http://www.example.org/updated',
          repeatable: false,
          required: false,
          deprecated: false,
        };

        cy.updateSpecificationField(fieldId, updatePayload1).then((updateResp1) => {
          validateApiResponse(updateResp1, 202);
          expect(updateResp1.body).to.include({
            ...updatePayload1,
            specificationId: bibSpecId,
            scope: 'local',
          });

          // Step 3: GET all fields and verify the update
          cy.getSpecificationFields(bibSpecId).then((getResp1) => {
            validateApiResponse(getResp1, 200);
            const updatedField1 = getResp1.body.fields.find((f) => f.id === fieldId);
            expect(updatedField1).to.include({
              ...updatePayload1,
              specificationId: bibSpecId,
              scope: 'local',
            });

            // Step 4: Update the field again with all flags true and new values
            const updatePayload2 = {
              tag: BASE_FIELD_TAG, // Keep same tag
              label: 'AT_C490951_Field name with updates made by user #2',
              url: 'http://www.example.org/updated2',
              repeatable: true,
              required: false,
              deprecated: true,
            };

            cy.updateSpecificationField(fieldId, updatePayload2).then((updateResp2) => {
              validateApiResponse(updateResp2, 202);
              expect(updateResp2.body).to.include({
                ...updatePayload2,
                specificationId: bibSpecId,
                scope: 'local',
              });

              // Step 5: GET all fields and verify the second update
              cy.getSpecificationFields(bibSpecId).then((getResp2) => {
                validateApiResponse(getResp2, 200);
                const updatedField2 = getResp2.body.fields.find((f) => f.id === fieldId);
                expect(updatedField2).to.include({
                  ...updatePayload2,
                  specificationId: bibSpecId,
                  scope: 'local',
                });
              });
            });
          });
        });
      });
    },
  );

  it(
    'C490936 Cannot update Local field for MARC bib spec without required permission (API) (spitfire)',
    { tags: ['C490936', 'criticalPath', 'spitfire'] },
    () => {
      // Step 1: Create a user with only GET and POST permissions (no PUT)
      cy.getAdminToken();
      cy.createTempUser(limitedPermissions).then((createdUser) => {
        limitedUser = createdUser;

        const payload = {
          tag: '897',
          label: 'AT_C490936_Custom Field - Contributor Data',
          url: BASE_URL,
        };

        cy.getUserToken(limitedUser.username, limitedUser.password);

        // Step 2: Create a Local MARC field as this user
        cy.createSpecificationField(bibSpecId, payload).then((response) => {
          validateApiResponse(response, 201);
          fieldId = response.body.id;

          // Step 3: Attempt to update the field (should fail with 403)
          const updatePayload = {
            label: 'AT_C490936_Name test field',
          };

          cy.updateSpecificationField(fieldId, updatePayload, false).then((updateResp) => {
            validateApiResponse(updateResp, 403);
            expect(updateResp.body.errors[0].message).to.include('Access Denied');
          });
        });
      });
    },
  );
});
