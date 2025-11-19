/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  findStandardField,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot Create Subfield Code Invalid Label Length Standard Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
  ];

  const STANDARD_FIELD_TAG = '110'; // Main Entry - Corporate Name
  const ERROR_MESSAGE_LENGTH = "The 'label' field has exceeded 350 character limit";

  // Helper to generate label of specific length
  const generateLabel = (length) => 'a'.repeat(length);

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
    'C499734 Cannot create Subfield code of Standard field with invalid "label" length for MARC bib spec (API) (spitfire)',
    { tags: ['C499734', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Create subfield with 351 characters label - should fail
      const label351 = generateLabel(351);
      const payload351 = {
        code: 'w',
        label: label351,
      };

      cy.createSpecificationFieldSubfield(standardField.id, payload351, false).then((response1) => {
        validateApiResponse(response1, 400);
        expect(response1.body.errors).to.exist;
        expect(response1.body.errors).to.have.length.greaterThan(0);
        expect(response1.body.errors[0].message).to.include(ERROR_MESSAGE_LENGTH);
      });

      // Step 2: Create subfield with exactly 350 characters label - should succeed
      const label350 = generateLabel(350);
      const payload350 = {
        code: 'x',
        label: label350,
      };

      cy.createSpecificationFieldSubfield(standardField.id, payload350).then((response2) => {
        validateApiResponse(response2, 201);
        createdSubfieldIds.push(response2.body.id);

        const responseBody = response2.body;
        expect(responseBody.id).to.exist;
        expect(responseBody.fieldId).to.eq(standardField.id);
        expect(responseBody.code).to.eq('x');
        expect(responseBody.label).to.eq(label350);
        expect(responseBody.label.length).to.eq(350);
        expect(responseBody.scope).to.eq('local');
        expect(responseBody.metadata).to.exist;
      });

      // Step 3: Create subfield with 349 characters label - should succeed
      const label349 = generateLabel(349);
      const payload349 = {
        code: 'y',
        label: label349,
      };

      cy.createSpecificationFieldSubfield(standardField.id, payload349).then((response3) => {
        validateApiResponse(response3, 201);
        createdSubfieldIds.push(response3.body.id);

        const responseBody = response3.body;
        expect(responseBody.id).to.exist;
        expect(responseBody.fieldId).to.eq(standardField.id);
        expect(responseBody.code).to.eq('y');
        expect(responseBody.label).to.eq(label349);
        expect(responseBody.label.length).to.eq(349);
        expect(responseBody.scope).to.eq('local');
        expect(responseBody.metadata).to.exist;
      });

      // Step 4: Create subfield with 1 character label - should succeed
      const payload1 = {
        code: 'v',
        label: '1',
      };

      cy.createSpecificationFieldSubfield(standardField.id, payload1).then((response4) => {
        validateApiResponse(response4, 201);
        createdSubfieldIds.push(response4.body.id);

        const responseBody = response4.body;
        expect(responseBody.id).to.exist;
        expect(responseBody.fieldId).to.eq(standardField.id);
        expect(responseBody.code).to.eq('v');
        expect(responseBody.label).to.eq('1');
        expect(responseBody.label.length).to.eq(1);
        expect(responseBody.scope).to.eq('local');
        expect(responseBody.metadata).to.exist;
      });
    },
  );
});
