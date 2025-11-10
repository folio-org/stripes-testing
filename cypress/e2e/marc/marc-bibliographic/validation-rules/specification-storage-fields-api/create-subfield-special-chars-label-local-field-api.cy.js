/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Create Subfield with Special Characters in Label for Local Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
  ];

  const LOCAL_FIELD_TAG = '970';
  const TEST_CASE_ID = 'C499717';
  const SPECIAL_CHAR_LABEL = `AT_${TEST_CASE_ID}_Subfield code 1 name$ | test / with spec. - char. 789`;

  let user;
  let bibSpecId;
  let localFieldId;
  let createdSubfieldId;

  before('Setup test data', () => {
    cy.getAdminToken();

    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;

      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;

        cy.deleteSpecificationFieldByTag(bibSpecId, LOCAL_FIELD_TAG, false);

        const fieldTestDataBuilder = createFieldTestDataBuilder(TEST_CASE_ID);
        const testData = fieldTestDataBuilder
          .withField(LOCAL_FIELD_TAG, 'Local Field for Special Characters Test', {
            url: `http://www.example.org/field${LOCAL_FIELD_TAG}.html`,
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

  after('Complete cleanup', () => {
    cy.getAdminToken();
    if (localFieldId) {
      cy.deleteSpecificationField(localFieldId, false);
    }
    if (user?.userId) {
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499717 Create Subfield code of Local field with special characters in "label" for MARC bib spec (API) (spitfire)',
    { tags: ['C499717', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Create subfield with special characters in label
      const subfieldPayload = {
        code: 'a',
        label: SPECIAL_CHAR_LABEL,
      };

      cy.createSpecificationFieldSubfield(localFieldId, subfieldPayload).then((createResponse) => {
        validateApiResponse(createResponse, 201);
        const responseBody = createResponse.body;
        createdSubfieldId = responseBody.id;

        expect(responseBody.id, 'Subfield should have an ID').to.exist;
        expect(responseBody.fieldId, 'Subfield should be linked to field').to.eq(localFieldId);
        expect(responseBody.code, 'Subfield should have code "a"').to.eq('a');
        expect(responseBody.label, 'Subfield should have label with special characters').to.eq(
          SPECIAL_CHAR_LABEL,
        );
        expect(responseBody.scope, 'Subfield should have local scope').to.eq('local');
        expect(responseBody.metadata, 'Subfield should have metadata').to.exist;

        // Step 2: Verify the subfield was created with special characters in label
        cy.getSpecificationFieldSubfields(localFieldId).then((getResponse) => {
          validateApiResponse(getResponse, 200);

          const createdSubfield = getResponse.body.subfields.find(
            (sf) => sf.id === createdSubfieldId,
          );
          expect(createdSubfield.label).to.eq(SPECIAL_CHAR_LABEL);
        });
      });
    },
  );
});
