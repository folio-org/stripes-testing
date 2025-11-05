/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot Create Local Field with Empty URL API', () => {
  // User with both GET and POST permissions to create fields
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
  ];

  let user;
  let bibSpecId;
  const createdFieldIds = [];

  const LOCAL_FIELD_TAG_BASE = '987'; // Use for first test scenario
  const LOCAL_FIELD_TAG_EMPTY_URL = '988'; // Use for second test scenario

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;
      });
    });
  });

  after('Delete test user and clean up created fields', () => {
    // Clean up any successfully created fields
    if (createdFieldIds.length > 0) {
      cy.getAdminToken();
      createdFieldIds.forEach((fieldId) => {
        cy.deleteSpecificationField(fieldId, false);
      });
    }

    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C490929 Create Local Field with empty "url" for MARC bib spec (API) (spitfire)',
    { tags: ['C490929', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Test 1: Create field WITHOUT URL property (TestRail expects 201)
      const fieldWithoutUrl = {
        tag: LOCAL_FIELD_TAG_BASE,
        label: 'AT_C490929_Test name',
        repeatable: true,
        required: false,
        deprecated: false,
        scope: 'local',
      };

      cy.createSpecificationField(bibSpecId, fieldWithoutUrl, false).then((response) => {
        expect(response.body.id).to.exist;
        expect(response.body.tag).to.eq(LOCAL_FIELD_TAG_BASE);
        expect(response.body.label).to.eq('AT_C490929_Test name');
        expect(response.body).to.not.have.property('url'); // URL key should not be present
        createdFieldIds.push(response.body.id);
      });

      // Test 2: Create field WITH empty URL (should fail with 400)
      const fieldWithEmptyUrl = {
        tag: LOCAL_FIELD_TAG_EMPTY_URL,
        label: 'AT_C490929_Test name',
        url: '', // Empty URL string should cause validation error
        repeatable: true,
        required: false,
        deprecated: false,
        scope: 'local',
      };

      cy.createSpecificationField(bibSpecId, fieldWithEmptyUrl, false).then((response) => {
        validateApiResponse(response, 400);

        // Validate error response structure
        expect(response.body).to.exist;
        expect(response.body.errors).to.exist;
        expect(response.body.errors).to.have.length.greaterThan(0);

        const errorMessages = response.body.errors.map((error) => error.message);
        expect(
          errorMessages.some((msg) => msg.includes("The 'url' field should be valid URL.")),
          `Expected error message "The 'url' field should be valid URL." not found. Actual errors: ${JSON.stringify(errorMessages)}`,
        ).to.be.true;
      });
    },
  );
});
