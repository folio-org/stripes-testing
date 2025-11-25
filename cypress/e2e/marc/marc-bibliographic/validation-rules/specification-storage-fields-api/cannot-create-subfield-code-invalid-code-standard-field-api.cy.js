/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  findStandardField,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot Create Subfield Code Invalid Code Standard Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
  ];

  const STANDARD_FIELD_TAG = '110'; // Main Entry - Corporate Name
  const ERROR_MESSAGE_INVALID_CODE =
    "A 'code' field must contain one character and can only accept numbers 0-9 or letters a-z.";
  const ERROR_MESSAGE_REQUIRED = "The 'code' field is required.";

  let user;
  let bibSpecId;
  let standardField;

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

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499731 Cannot create Subfield code of Standard field with invalid "code" for MARC bib spec (API) (spitfire)',
    { tags: ['C499731', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      const invalidPayloads = [
        {
          description: 'Missing code field',
          payload: { label: 'AT_C499731_Code 1 name' },
          expectedError: ERROR_MESSAGE_REQUIRED,
        },
        {
          description: 'Two digits in code',
          payload: { code: '12', label: 'AT_C499731_Code 1 name' },
          expectedError: ERROR_MESSAGE_INVALID_CODE,
        },
        {
          description: 'Uppercase letter',
          payload: { code: 'O', label: 'AT_C499731_Code O name' },
          expectedError: ERROR_MESSAGE_INVALID_CODE,
        },
        {
          description: 'Whitespace',
          payload: { code: ' ', label: 'AT_C499731_Code 3 name' },
          expectedError: [ERROR_MESSAGE_INVALID_CODE, ERROR_MESSAGE_REQUIRED],
        },
        {
          description: 'Special character',
          payload: { code: '/', label: 'AT_C499731_Code 1 name' },
          expectedError: ERROR_MESSAGE_INVALID_CODE,
        },
      ];

      invalidPayloads.forEach((scenario) => {
        cy.createSpecificationFieldSubfield(standardField.id, scenario.payload, false).then(
          (response) => {
            validateApiResponse(response, 400);
            expect(response.body.errors, `${scenario.description}: Errors exist`).to.exist;
            const errorMessages = response.body.errors.map((error) => error.message);

            const expectedErrors = Array.isArray(scenario.expectedError)
              ? scenario.expectedError
              : [scenario.expectedError];

            expect(
              errorMessages.some((msg) => expectedErrors.some((err) => msg.includes(err))),
              `${scenario.description}: Contains expected error`,
            ).to.be.true;
          },
        );
      });
    },
  );
});
