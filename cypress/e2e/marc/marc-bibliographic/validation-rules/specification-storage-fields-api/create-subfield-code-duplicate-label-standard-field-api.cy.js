/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  findStandardField,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Create Subfield Code Duplicate Label Standard Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
  ];

  const STANDARD_FIELD_TAG = '100'; // Main Entry - Personal Name
  const DUPLICATE_LABEL = 'AT_C499737_Subfield name 1 test duplicate$ - test';

  let user;
  let bibSpecId;
  let standardField;
  const createdSubfieldIds = [];

  before('Create user and fetch MARC bib specification with standard field', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;

      getBibliographicSpec().then((spec) => {
        bibSpecId = spec.id;

        // Find standard field
        cy.getSpecificationFields(bibSpecId).then((response) => {
          validateApiResponse(response, 200);
          standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
          expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;
        });
      });
    });
  });

  after('Delete test user and cleanup created subfields', () => {
    if (user) {
      cy.getAdminToken();

      // Clean up all created subfields
      createdSubfieldIds.forEach((id) => {
        cy.deleteSpecificationFieldSubfield(id, false);
      });

      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499737 Create Subfield code of Standard field with duplicate "label" for MARC bib spec (API) (spitfire)',
    { tags: ['C499737', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Create subfield with unique label - should succeed
      const payload1 = {
        code: 'x',
        label: DUPLICATE_LABEL,
      };

      cy.createSpecificationFieldSubfield(standardField.id, payload1).then((response1) => {
        validateApiResponse(response1, 201);
        createdSubfieldIds.push(response1.body.id);

        const responseBody = response1.body;
        expect(responseBody.id).to.exist;
        expect(responseBody.fieldId).to.eq(standardField.id);
        expect(responseBody.code).to.eq('x');
        expect(responseBody.label).to.eq(DUPLICATE_LABEL);
        expect(responseBody.scope).to.eq('local');
        expect(responseBody.metadata).to.exist;
      });

      // Step 2: Create another subfield with SAME label but different code - should succeed
      const payload2 = {
        code: 'y',
        label: DUPLICATE_LABEL,
      };

      cy.createSpecificationFieldSubfield(standardField.id, payload2).then((response2) => {
        validateApiResponse(response2, 201);
        createdSubfieldIds.push(response2.body.id);

        const responseBody = response2.body;
        expect(responseBody.id).to.exist;
        expect(responseBody.fieldId).to.eq(standardField.id);
        expect(responseBody.code).to.eq('y');
        expect(responseBody.label).to.eq(DUPLICATE_LABEL);
        expect(responseBody.scope).to.eq('local');
        expect(responseBody.metadata).to.exist;
      });

      // Step 3: Create subfield with same label as LOC standard subfield - should succeed
      // Get existing LOC subfields to find a standard label
      cy.getSpecificationFieldSubfields(standardField.id).then((subfieldsResp) => {
        validateApiResponse(subfieldsResp, 200);

        // Find a standard (non-local) subfield to use its label
        const standardSubfield = subfieldsResp.body.subfields.find(
          (subfield) => subfield.scope === 'standard',
        );
        expect(standardSubfield, 'Standard subfield exists for field 100').to.exist;

        const payload3 = {
          code: 'z',
          label: standardSubfield.label, // Using same label as LOC standard
        };

        cy.createSpecificationFieldSubfield(standardField.id, payload3).then((response3) => {
          validateApiResponse(response3, 201);
          createdSubfieldIds.push(response3.body.id);

          const responseBody = response3.body;
          expect(responseBody.id).to.exist;
          expect(responseBody.fieldId).to.eq(standardField.id);
          expect(responseBody.code).to.eq('z');
          expect(responseBody.label).to.eq(standardSubfield.label);
          expect(responseBody.scope).to.eq('local');
          expect(responseBody.metadata).to.exist;
        });

        // Step 4: GET all subfields and verify the 3 created subfields are present
        cy.getSpecificationFieldSubfields(standardField.id).then((finalSubfieldsResp) => {
          validateApiResponse(finalSubfieldsResp, 200);

          const allSubfields = finalSubfieldsResp.body.subfields;
          expect(allSubfields).to.be.an('array');

          // Verify all 3 created subfields are present
          const createdSubfield1 = allSubfields.find(
            (sf) => sf.code === 'x' && sf.scope === 'local',
          );
          const createdSubfield2 = allSubfields.find(
            (sf) => sf.code === 'y' && sf.scope === 'local',
          );
          const createdSubfield3 = allSubfields.find(
            (sf) => sf.code === 'z' && sf.scope === 'local',
          );

          expect(createdSubfield1, 'Subfield x exists').to.exist;
          expect(createdSubfield1.label).to.eq(DUPLICATE_LABEL);

          expect(createdSubfield2, 'Subfield y exists').to.exist;
          expect(createdSubfield2.label).to.eq(DUPLICATE_LABEL);

          expect(createdSubfield3, 'Subfield z exists').to.exist;
          expect(createdSubfield3.label).to.eq(standardSubfield.label);
        });
      });
    },
  );
});
