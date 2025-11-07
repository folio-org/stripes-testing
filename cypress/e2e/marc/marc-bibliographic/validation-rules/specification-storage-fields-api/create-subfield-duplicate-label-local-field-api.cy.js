/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Create Subfield with Duplicate Label for Local Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
  ];

  const LOCAL_FIELD_TAG = '971';
  const TEST_CASE_ID = 'C499716';
  const DUPLICATE_LABEL = `AT_${TEST_CASE_ID}_Subfield name test duplicate`;

  let user;
  let bibSpecId;
  let localFieldId;
  let subfield1Id;
  let subfield2Id;

  before('Setup test data', () => {
    cy.getAdminToken();

    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;

      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;
        cy.deleteSpecificationFieldByTag(bibSpecId, LOCAL_FIELD_TAG, false);
        const fieldTestDataBuilder = createFieldTestDataBuilder(TEST_CASE_ID);
        const testData = fieldTestDataBuilder
          .withField(LOCAL_FIELD_TAG, 'Local Field for Subfield Label Test', {
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
    'C499716 Create Subfield code of Local field with duplicate "label" for MARC bib spec (API) (spitfire)',
    { tags: ['C499716', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Create first subfield with specific label
      const subfield1Payload = {
        code: 'a',
        label: DUPLICATE_LABEL,
      };

      cy.createSpecificationFieldSubfield(localFieldId, subfield1Payload).then(
        (createResponse1) => {
          validateApiResponse(createResponse1, 201);
          const responseBody1 = createResponse1.body;
          subfield1Id = responseBody1.id;

          expect(responseBody1.id, 'Subfield 1 should have an ID').to.exist;
          expect(responseBody1.fieldId, 'Subfield 1 should be linked to field').to.eq(localFieldId);
          expect(responseBody1.code, 'Subfield 1 should have code "a"').to.eq('a');
          expect(responseBody1.label, 'Subfield 1 should have correct label').to.eq(
            DUPLICATE_LABEL,
          );
          expect(responseBody1.scope, 'Subfield 1 should have local scope').to.eq('local');
          expect(responseBody1.metadata, 'Subfield 1 should have metadata').to.exist;

          // Step 2: Create second subfield with the same label but different code
          const subfield2Payload = {
            code: 'b',
            label: DUPLICATE_LABEL, // Same label as first subfield
          };

          cy.createSpecificationFieldSubfield(localFieldId, subfield2Payload).then(
            (createResponse2) => {
              validateApiResponse(createResponse2, 201);
              const responseBody2 = createResponse2.body;
              subfield2Id = responseBody2.id;

              expect(responseBody2.id, 'Subfield 2 should have an ID').to.exist;
              expect(responseBody2.fieldId, 'Subfield 2 should be linked to field').to.eq(
                localFieldId,
              );
              expect(responseBody2.code, 'Subfield 2 should have code "b"').to.eq('b');
              expect(responseBody2.label, 'Subfield 2 should have same label').to.eq(
                DUPLICATE_LABEL,
              );
              expect(responseBody2.scope, 'Subfield 2 should have local scope').to.eq('local');
              expect(responseBody2.metadata, 'Subfield 2 should have metadata').to.exist;

              // Step 3: Verify both subfields exist with duplicate labels
              cy.getSpecificationFieldSubfields(localFieldId).then((getResponse) => {
                validateApiResponse(getResponse, 200);

                const createdSubfields = getResponse.body.subfields.filter(
                  (sf) => sf.id === subfield1Id || sf.id === subfield2Id,
                );

                expect(
                  createdSubfields,
                  'Should find both created subfields in collection',
                ).to.have.length(2);
              });
            },
          );
        },
      );
    },
  );
});
