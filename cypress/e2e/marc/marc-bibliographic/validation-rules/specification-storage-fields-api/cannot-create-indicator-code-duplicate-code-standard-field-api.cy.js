/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  findStandardField,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot Create Indicator Code Duplicate Code Standard Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageDeleteSpecificationIndicatorCode.gui,
  ];

  const STANDARD_FIELD_TAG = '243'; // Collective Uniform Title
  const ERROR_MESSAGE_DUPLICATE = "The 'code' must be unique.";

  let user;
  let bibSpecId;
  let standardField;
  let indicator1;
  let indicator2;
  let createdIndicatorCodeId;

  before('Create user and fetch MARC bib specification with standard field', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;

      getBibliographicSpec().then((spec) => {
        bibSpecId = spec.id;

        // Find standard field and its indicators
        cy.getSpecificationFields(bibSpecId).then((response) => {
          validateApiResponse(response, 200);
          standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);

          // Get indicators for the standard field
          cy.getSpecificationFieldIndicators(standardField.id).then((indicatorsResp) => {
            validateApiResponse(indicatorsResp, 200);
            const indicators = indicatorsResp.body.indicators;
            indicator1 = indicators.find((ind) => ind.order === 1);
            indicator2 = indicators.find((ind) => ind.order === 2);
            expect(indicator1, 'Indicator 1 exists').to.exist;
            expect(indicator2, 'Indicator 2 exists').to.exist;
          });
        });
      });
    });
  });

  after('Delete test user and cleanup created indicator codes', () => {
    if (user) {
      cy.getAdminToken();

      // Clean up created indicator code
      if (createdIndicatorCodeId) {
        cy.deleteSpecificationIndicatorCode(createdIndicatorCodeId, false);
      }

      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499675 Cannot create Indicator code of Standard field with duplicate "code" for MARC bib spec (API) (spitfire)',
    { tags: ['C499675', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Create indicator code with unique code 'x' - should succeed
      const indicatorCodePayload = {
        code: 'x',
        label: 'Code x name',
      };

      cy.createSpecificationIndicatorCode(indicator1.id, indicatorCodePayload).then((response1) => {
        validateApiResponse(response1, 201);
        createdIndicatorCodeId = response1.body.id;

        // Step 2: Try to create another indicator code with same code 'x' on same indicator - should fail

        cy.createSpecificationIndicatorCode(indicator1.id, indicatorCodePayload, false).then(
          (response2) => {
            validateApiResponse(response2, 400);
            expect(response2.body.errors).to.exist;
            expect(response2.body.errors).to.have.length.greaterThan(0);
            expect(response2.body.errors[0].message).to.include(ERROR_MESSAGE_DUPLICATE);
          },
        );

        // Step 3: Create indicator code with code on Indicator 2 - should succeed
        cy.createSpecificationIndicatorCode(indicator2.id, indicatorCodePayload).then(
          (response3) => {
            validateApiResponse(response3, 201);

            const responseBody3 = response3.body;
            expect(responseBody3.id).to.exist;
            expect(responseBody3.indicatorId).to.eq(indicator2.id);
            expect(responseBody3.code).to.eq(indicatorCodePayload.code);
            expect(responseBody3.label).to.eq(indicatorCodePayload.label);
            expect(responseBody3.scope).to.eq('local');
            expect(responseBody3.metadata).to.exist;

            // Clean up the indicator 2 code immediately
            cy.deleteSpecificationIndicatorCode(responseBody3.id, false);
          },
        );
      });
    },
  );
});
