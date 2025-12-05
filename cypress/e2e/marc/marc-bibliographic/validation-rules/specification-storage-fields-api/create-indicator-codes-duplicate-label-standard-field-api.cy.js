/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  findStandardField,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Create Indicator Code Duplicate Label Standard Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageDeleteSpecificationIndicatorCode.gui,
  ];

  const STANDARD_FIELD_TAG = '100'; // Main Entry - Personal Name
  const DUPLICATE_LABEL = 'AT_C499678_Duplicate label$ - test 1';

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
      createdIndicatorCodeIds.forEach((id) => {
        cy.deleteSpecificationIndicatorCode(id, false);
      });
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499678 Create Indicator code of Standard field with duplicate "label" for MARC bib spec (API) (spitfire)',
    { tags: ['C499678', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Create indicator code with unique label - should succeed
      const payload1 = {
        code: 'w',
        label: DUPLICATE_LABEL,
      };

      cy.createSpecificationIndicatorCode(indicator1.id, payload1).then((response1) => {
        validateApiResponse(response1, 201);
        createdIndicatorCodeIds.push(response1.body.id);

        const responseBody = response1.body;
        expect(responseBody.indicatorId).to.eq(indicator1.id);
        expect(responseBody.code).to.eq('w');
        expect(responseBody.label).to.eq(DUPLICATE_LABEL);
      });

      // Step 2: Create another indicator code with SAME label but different code - should succeed
      const payload2 = {
        code: 'x',
        label: DUPLICATE_LABEL,
      };

      cy.createSpecificationIndicatorCode(indicator1.id, payload2).then((response2) => {
        validateApiResponse(response2, 201);
        createdIndicatorCodeIds.push(response2.body.id);

        const responseBody = response2.body;
        expect(responseBody.indicatorId).to.eq(indicator1.id);
        expect(responseBody.code).to.eq('x');
        expect(responseBody.label).to.eq(DUPLICATE_LABEL);
      });

      // Step 3: Create indicator code with same label as LOC standard code - should succeed
      // Get existing LOC codes to find a standard label
      cy.getSpecificationIndicatorCodes(indicator1.id).then((codesResp) => {
        validateApiResponse(codesResp, 200);

        // Find a standard (non-local) code to use its label
        const standardCode = codesResp.body.codes.find((code) => code.scope === 'standard');
        expect(standardCode).to.exist;

        const payload3 = {
          code: 'y',
          label: standardCode.label, // Using same label as LOC standard
        };

        cy.createSpecificationIndicatorCode(indicator1.id, payload3).then((response3) => {
          validateApiResponse(response3, 201);
          createdIndicatorCodeIds.push(response3.body.id);

          const responseBody = response3.body;
          expect(responseBody.indicatorId).to.eq(indicator1.id);
          expect(responseBody.code).to.eq('y');
          expect(responseBody.label).to.eq(standardCode.label);
        });
      });
    },
  );
});
