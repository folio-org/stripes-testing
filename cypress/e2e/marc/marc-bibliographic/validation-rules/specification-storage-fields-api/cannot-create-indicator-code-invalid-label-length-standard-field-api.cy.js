/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  findStandardField,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot Create Indicator Code Invalid Label Length Standard Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageDeleteSpecificationIndicatorCode.gui,
  ];

  const STANDARD_FIELD_TAG = '243'; // Collective Uniform Title
  const ERROR_MESSAGE_LENGTH = "The 'label' field has exceeded 350 character limit";

  // Helper to generate label of specific length
  const generateLabel = (length) => 'a'.repeat(length);

  let user;
  let bibSpecId;
  let standardField;
  let indicator1;
  const createdIndicatorCodeIds = [];

  before('Create user and fetch MARC bib specification with standard field', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;

      getBibliographicSpec().then((spec) => {
        bibSpecId = spec.id;

        // Find standard field and its indicator
        cy.getSpecificationFields(bibSpecId).then((response) => {
          validateApiResponse(response, 200);
          standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);

          // Get indicators for the standard field
          cy.getSpecificationFieldIndicators(standardField.id).then((indicatorsResp) => {
            validateApiResponse(indicatorsResp, 200);
            indicator1 = indicatorsResp.body.indicators.find((ind) => ind.order === 1);
            expect(indicator1, 'Indicator 1 exists').to.exist;
          });
        });
      });
    });
  });

  after('Delete test user and cleanup created indicator codes', () => {
    if (user) {
      cy.getAdminToken();

      // Clean up all created indicator codes
      createdIndicatorCodeIds.forEach((id) => {
        cy.deleteSpecificationIndicatorCode(id, false);
      });

      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499677 Cannot create Indicator code of Standard field with invalid "label" length for MARC bib spec (API) (spitfire)',
    { tags: ['C499677', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Create indicator code with 351 characters label - should fail
      const label351 = generateLabel(351);
      const payload351 = {
        code: 'w',
        label: label351,
      };

      cy.createSpecificationIndicatorCode(indicator1.id, payload351, false).then((response1) => {
        validateApiResponse(response1, 400);
        expect(response1.body.errors).to.exist;
        expect(response1.body.errors).to.have.length.greaterThan(0);
        expect(response1.body.errors[0].message).to.include(ERROR_MESSAGE_LENGTH);
      });

      // Step 2: Create indicator code with exactly 350 characters label - should succeed
      const label350 = generateLabel(350);
      const payload350 = {
        code: 'x',
        label: label350,
      };

      cy.createSpecificationIndicatorCode(indicator1.id, payload350).then((response2) => {
        validateApiResponse(response2, 201);
        createdIndicatorCodeIds.push(response2.body.id);

        const responseBody = response2.body;
        expect(responseBody.id).to.exist;
        expect(responseBody.indicatorId).to.eq(indicator1.id);
        expect(responseBody.code).to.eq('x');
        expect(responseBody.label).to.eq(label350);
        expect(responseBody.label.length).to.eq(350);
        expect(responseBody.scope).to.eq('local');
        expect(responseBody.metadata).to.exist;
      });

      // Step 3: Create indicator code with 349 characters label - should succeed
      const label349 = generateLabel(349);
      const payload349 = {
        code: 'y',
        label: label349,
      };

      cy.createSpecificationIndicatorCode(indicator1.id, payload349).then((response3) => {
        validateApiResponse(response3, 201);
        createdIndicatorCodeIds.push(response3.body.id);

        const responseBody = response3.body;
        expect(responseBody.id).to.exist;
        expect(responseBody.indicatorId).to.eq(indicator1.id);
        expect(responseBody.code).to.eq('y');
        expect(responseBody.label).to.eq(label349);
        expect(responseBody.label.length).to.eq(349);
        expect(responseBody.scope).to.eq('local');
        expect(responseBody.metadata).to.exist;
      });

      // Step 4: Create indicator code with 1 character label - should succeed
      const payload1 = {
        code: 'z',
        label: '1',
      };

      cy.createSpecificationIndicatorCode(indicator1.id, payload1).then((response4) => {
        validateApiResponse(response4, 201);
        createdIndicatorCodeIds.push(response4.body.id);

        const responseBody = response4.body;
        expect(responseBody.id).to.exist;
        expect(responseBody.indicatorId).to.eq(indicator1.id);
        expect(responseBody.code).to.eq('z');
        expect(responseBody.label).to.eq('1');
        expect(responseBody.label.length).to.eq(1);
        expect(responseBody.scope).to.eq('local');
        expect(responseBody.metadata).to.exist;
      });
    },
  );
});
