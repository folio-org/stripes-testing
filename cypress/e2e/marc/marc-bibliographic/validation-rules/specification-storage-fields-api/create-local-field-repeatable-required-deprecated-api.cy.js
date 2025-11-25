/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Create Local Field (repeatable, required, deprecated) API', () => {
  // User with minimal required permissions to create fields
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
  ];

  const LOCAL_FIELD_TAG = '890';
  const TEST_CASE_ID = 'C490915';

  let user;
  let bibSpecId;
  let fieldId;

  before('Create user and get bibliographic specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;
      });
    });
  });

  after('Delete test user and clean up created field', () => {
    if (user) {
      cy.getAdminToken();
      if (fieldId) {
        cy.deleteSpecificationField(fieldId, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C490915 Create Local Field (repeatable, required, deprecated) for MARC bib spec (API) (spitfire)',
    { tags: ['C490915', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      const testCaseId = TEST_CASE_ID;
      const fieldTestDataBuilder = createFieldTestDataBuilder(testCaseId);
      const testData = fieldTestDataBuilder
        .withField(LOCAL_FIELD_TAG, 'Custom Field - Contributor Data', {
          url: 'http://www.example.org/field888.html',
          repeatable: true,
          required: false,
          deprecated: true,
        })
        .build();

      cy.createSpecificationField(bibSpecId, testData.field).then((response) => {
        validateApiResponse(response, 201);
        const createdField = response.body;
        fieldId = createdField.id;

        expect(createdField.id, 'Field should have an ID').to.exist;
        expect(createdField.specificationId, 'Field should be linked to bibliographic spec').to.eq(
          bibSpecId,
        );
        expect(createdField.tag, 'Field should have correct tag').to.eq(testData.field.tag);
        expect(createdField.label, 'Field should have correct label from test data').to.eq(
          testData.field.label,
        );
        expect(createdField.url, 'Field should have correct URL from test data').to.eq(
          testData.field.url,
        );
        expect(
          createdField.repeatable,
          'Field should match repeatable setting from test data',
        ).to.eq(testData.field.repeatable);
        expect(createdField.required, 'Field should match required setting from test data').to.eq(
          testData.field.required,
        );
        expect(
          createdField.deprecated,
          'Field should match deprecated setting from test data',
        ).to.eq(testData.field.deprecated);
        expect(createdField.scope, 'Field should have local scope').to.eq('local');
        expect(createdField.metadata, 'Field should have metadata').to.exist;

        cy.log(`Successfully created local field ${testData.field.tag} with ID: ${fieldId}`);
      });
    },
  );
});
