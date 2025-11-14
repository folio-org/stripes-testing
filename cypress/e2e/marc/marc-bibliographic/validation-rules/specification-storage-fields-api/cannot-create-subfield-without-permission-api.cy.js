/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot Create Subfield without Permission API', () => {
  // User with permissions to create fields, indicators, and indicator codes but NOT subfields
  const limitedPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    // NOTE: Missing Permissions.specificationStorageCreateSpecificationFieldSubfield.gui
  ];

  const LOCAL_FIELD_TAG = '973'; // Unique tag for this test
  const TEST_CASE_ID = 'C499706';

  let user;
  let bibSpecId;
  let localFieldId;

  before('Create user and setup local field', () => {
    cy.getAdminToken();
    cy.createTempUser(limitedPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;

        // Clean up any existing field with the same tag
        cy.deleteSpecificationFieldByTag(bibSpecId, LOCAL_FIELD_TAG, false);

        // Create local field for subfield testing (using admin token)
        const fieldTestDataBuilder = createFieldTestDataBuilder(TEST_CASE_ID);
        const testData = fieldTestDataBuilder
          .withField(LOCAL_FIELD_TAG, 'Local Field for Subfield Permission Test', {
            url: 'http://www.example.org/field973.html',
            repeatable: false,
            required: false,
            deprecated: false,
          })
          .build();

        cy.createSpecificationField(bibSpecId, testData.field).then((fieldResponse) => {
          validateApiResponse(fieldResponse, 201);
          localFieldId = fieldResponse.body.id;
          expect(fieldResponse.body.scope).to.eq('local');
        });
      });
    });
  });

  after('Delete test user and clean up created field', () => {
    if (user) {
      cy.getAdminToken();
      // Clean up created field (subfields will be automatically deleted)
      if (localFieldId) {
        cy.deleteSpecificationField(localFieldId, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499706 Cannot create Subfield code of Local field for MARC bib spec without required permission (API) (spitfire)',
    { tags: ['C499706', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      const subfieldPayload = {
        code: 'a',
        label: 'AT_C499706_Subfield a',
      };

      cy.createSpecificationFieldSubfield(localFieldId, subfieldPayload, false).then((response) => {
        expect(response.status).to.eq(403);
        expect(response.body.errors, 'Response should contain error details').to.exist;
        expect(response.body.errors).to.have.length.greaterThan(0);
        const errorMessage = response.body.errors[0].message || response.body.errors[0].description;
        expect(errorMessage, 'Error should indicate access denied').to.include('Access Denied');
      });
    },
  );
});
