/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot Create Subfield with Invalid Repeatable Value API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
  ];

  const LOCAL_FIELD_TAG = '969';
  const TEST_CASE_ID = 'C499718';

  let user;
  let bibSpecId;
  let localFieldId;

  before('Create user and setup local field', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;

        cy.deleteSpecificationFieldByTag(bibSpecId, LOCAL_FIELD_TAG, false);

        const fieldTestDataBuilder = createFieldTestDataBuilder(TEST_CASE_ID);
        const testData = fieldTestDataBuilder
          .withField(LOCAL_FIELD_TAG, 'Local Field for Invalid Repeatable Test', {
            url: 'http://www.example.org/field969.html',
            repeatable: true,
            required: false,
            deprecated: false,
          })
          .build();

        cy.createSpecificationField(bibSpecId, testData.field).then((fieldResponse) => {
          validateApiResponse(fieldResponse, 201);
          localFieldId = fieldResponse.body.id;
        });
      });
    });
  });

  after('Delete test user and clean up created field', () => {
    if (user) {
      cy.getAdminToken();
      if (localFieldId) {
        cy.deleteSpecificationField(localFieldId, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499718 Cannot create Subfield code of Local field with invalid "repeatable" field value for MARC bib spec (API) (spitfire)',
    { tags: ['C499718', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      const subfieldPayload = {
        code: 't',
        label: 'Name',
        repeatable: 'test', // Invalid value - should be boolean
      };

      cy.createSpecificationFieldSubfield(localFieldId, subfieldPayload, false).then(
        (createResponse) => {
          expect(createResponse.status, 'Should return 400 for invalid repeatable value').to.eq(
            400,
          );
          expect(createResponse.body.errors, 'Response should contain errors').to.exist;
          const { errors } = createResponse.body;
          expect(
            errors.map((error) => error.message).some((msg) => msg.includes('JSON parse error')),
            `Expected "JSON parse error" message not found. Actual errors: ${JSON.stringify(errors)}`,
          ).to.be.true;
        },
      );
    },
  );
});
