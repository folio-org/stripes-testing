/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  findStandardField,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Create Deprecated Indicator Code Standard Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageDeleteSpecificationIndicatorCode.gui,
  ];

  const STANDARD_FIELD_TAG = '100'; // Main Entry - Personal Name
  const TEST_CASE_ID = 'C499704';

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
    'C499704 Create Deprecated Indicator code of Standard field for MARC bib spec (API) (spitfire)',
    { tags: ['C499704', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Create indicator code with deprecated: true
      const deprecatedTruePayload = {
        code: 'w',
        label: `AT_${TEST_CASE_ID}_Deprecated - true test`,
        deprecated: true,
      };

      cy.createSpecificationIndicatorCode(indicator1.id, deprecatedTruePayload).then(
        (response1) => {
          validateApiResponse(response1, 201);
          createdIndicatorCodeIds.push(response1.body.id);

          const responseBody1 = response1.body;
          expect(responseBody1.indicatorId, 'Step 1: IndicatorId matches').to.eq(indicator1.id);
          expect(responseBody1.code, 'Step 1: Code is correct').to.eq('w');
          expect(responseBody1.label, 'Step 1: Label is correct').to.eq(
            `AT_${TEST_CASE_ID}_Deprecated - true test`,
          );
          expect(responseBody1.deprecated, 'Step 1: Deprecated is true').to.be.true;
          expect(responseBody1.scope, 'Step 1: Scope is local').to.eq('local');
        },
      );

      // Step 2: Create indicator code with deprecated: false
      const deprecatedFalsePayload = {
        code: 'x',
        label: `AT_${TEST_CASE_ID}_Deprecated - false test`,
        deprecated: false,
      };

      cy.createSpecificationIndicatorCode(indicator1.id, deprecatedFalsePayload).then(
        (response2) => {
          validateApiResponse(response2, 201);
          createdIndicatorCodeIds.push(response2.body.id);

          const responseBody2 = response2.body;
          expect(responseBody2.indicatorId, 'Step 2: IndicatorId matches').to.eq(indicator1.id);
          expect(responseBody2.code, 'Step 2: Code is correct').to.eq('x');
          expect(responseBody2.label, 'Step 2: Label is correct').to.eq(
            `AT_${TEST_CASE_ID}_Deprecated - false test`,
          );
          expect(responseBody2.deprecated, 'Step 2: Deprecated is false').to.be.false;
          expect(responseBody2.scope, 'Step 2: Scope is local').to.eq('local');
        },
      );

      // Step 3: Create indicator code with invalid deprecated value (unquoted "test")
      const invalidDeprecatedPayload = {
        code: 'y',
        label: `AT_${TEST_CASE_ID}_Deprecated - invalid test`,
        deprecated: 'test', // Invalid - should be boolean
      };

      cy.createSpecificationIndicatorCode(indicator1.id, invalidDeprecatedPayload, false).then(
        (response3) => {
          validateApiResponse(response3, 400);
          expect(response3.body.errors, 'Step 3: Errors exist').to.exist;
          const errorMessages = response3.body.errors.map((error) => error.message);
          expect(
            errorMessages.some((msg) => msg.includes('JSON parse error')),
            'Step 3: Contains JSON parse error',
          ).to.be.true;
        },
      );
    },
  );
});
