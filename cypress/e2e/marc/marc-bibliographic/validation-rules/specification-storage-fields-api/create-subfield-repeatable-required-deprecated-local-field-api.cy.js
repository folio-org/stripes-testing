/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Create Subfield (repeatable, required, deprecated) for Local Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
  ];

  const LOCAL_FIELD_TAG = '972';
  const TEST_CASE_ID = 'C499707';

  let user;
  let bibSpecId;
  let localFieldId;
  let createdSubfieldId;

  before('Create user and setup local field', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;

        cy.deleteSpecificationFieldByTag(bibSpecId, LOCAL_FIELD_TAG, false);

        const fieldTestDataBuilder = createFieldTestDataBuilder(TEST_CASE_ID);
        const testData = fieldTestDataBuilder
          .withField(LOCAL_FIELD_TAG, 'Local Field for Subfield Test', {
            url: 'http://www.example.org/field972.html',
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
      if (localFieldId) {
        cy.deleteSpecificationField(localFieldId, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499707 Create Subfield code of Local field (repeatable, required, deprecated) for MARC bib spec (API) (spitfire)',
    { tags: ['C499707', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      const subfieldPayload = {
        code: '3',
        label: 'AT_C499707_label of code 3',
        repeatable: true,
        required: true,
        deprecated: true,
      };

      cy.createSpecificationFieldSubfield(localFieldId, subfieldPayload).then((createResponse) => {
        validateApiResponse(createResponse, 201);
        const createdSubfield = createResponse.body;
        createdSubfieldId = createdSubfield.id;

        expect(createdSubfield.id, 'Subfield should have an ID').to.exist;
        expect(createdSubfield.fieldId, 'Subfield should be linked to the field').to.eq(
          localFieldId,
        );
        expect(createdSubfield.code, 'Subfield should have correct code').to.eq('3');
        expect(createdSubfield.label, 'Subfield should have correct label').to.eq(
          'AT_C499707_label of code 3',
        );
        expect(createdSubfield.repeatable, 'Subfield should be repeatable').to.be.true;
        expect(createdSubfield.required, 'Subfield should be required').to.be.true;
        expect(createdSubfield.deprecated, 'Subfield should be deprecated').to.be.true;
        expect(createdSubfield.scope, 'Subfield should have local scope').to.eq('local');
        expect(createdSubfield.metadata, 'Subfield should have metadata').to.exist;

        cy.getSpecificationFieldSubfields(localFieldId).then((getResponse) => {
          validateApiResponse(getResponse, 200);
          const foundSubfield = getResponse.body.subfields.find(
            (sf) => sf.id === createdSubfieldId,
          );
          expect(foundSubfield, 'Created subfield should be retrievable').to.exist;
          expect(foundSubfield.code, 'Retrieved subfield should have correct code').to.eq('3');
          expect(foundSubfield.repeatable, 'Retrieved subfield should be repeatable').to.be.true;
          expect(foundSubfield.required, 'Retrieved subfield should be required').to.be.true;
          expect(foundSubfield.deprecated, 'Retrieved subfield should be deprecated').to.be.true;
        });
      });
    },
  );
});
