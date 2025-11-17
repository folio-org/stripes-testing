/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  findStandardField,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot Create Indicator Code Empty Label Standard Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
  ];

  const STANDARD_FIELD_TAG = '243'; // Collective Uniform Title
  const ERROR_MESSAGE_REQUIRED = "The 'label' field is required.";

  let user;
  let bibSpecId;
  let standardField;
  let indicator1;

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

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499676 Cannot create Indicator code of Standard field with empty "label" for MARC bib spec (API) (spitfire)',
    { tags: ['C499676', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Define invalid payloads with empty/missing label
      const invalidPayloads = [
        {
          description: 'empty string label',
          payload: { code: 'w', label: '' },
          expectedErrors: [ERROR_MESSAGE_REQUIRED],
        },
        {
          description: 'whitespace-only label',
          payload: { code: 'x', label: ' ' },
          expectedErrors: [ERROR_MESSAGE_REQUIRED],
        },
        {
          description: 'missing label field',
          payload: { code: 'y' },
          expectedErrors: [ERROR_MESSAGE_REQUIRED],
        },
      ];

      // Execute creation attempts for each invalid payload
      invalidPayloads.forEach((testCase, index) => {
        cy.createSpecificationIndicatorCode(indicator1.id, testCase.payload, false).then(
          (response) => {
            validateApiResponse(response, 400);
            expect(
              response.body.errors,
              `Test case ${index + 1} (${testCase.description}): Should have errors`,
            ).to.exist;
            // Check that all expected error messages are present
            const errorMessages = response.body.errors.map((err) => err.message);
            testCase.expectedErrors.forEach((expectedError) => {
              expect(
                errorMessages.some((msg) => msg.includes(expectedError)),
                `Test case ${index + 1} (${testCase.description}): Should contain error "${expectedError}"`,
              ).to.be.true;
            });
          },
        );
      });
    },
  );
});
