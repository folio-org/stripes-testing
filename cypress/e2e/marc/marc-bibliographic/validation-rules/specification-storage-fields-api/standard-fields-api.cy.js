/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('Specification Storage - Standard Fields API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  let user;
  let bibSpecId;
  let standardField;

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        // Find the specification with profile 'bibliographic'
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;
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
    'C499802 Cannot update Fields of Standard Field (except "url", "required") for MARC bib spec (API) (spitfire)',
    { tags: ['smoke', 'C499802', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC bib specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a standard field (e.g., 100)
        standardField = findStandardField(response.body.fields, '100');
        expect(standardField, 'Standard field 100 exists').to.exist;

        // Store original field values for restoration
        const originalField = { ...standardField };

        // Define test cases for different field modifications
        const testCases = [
          {
            step: 1,
            fieldName: 'tag',
            payload: {
              tag: '101',
              label: 'Main Entry - Personal Name',
              url: 'https://www.loc.gov/marc/bibliographic/bd100.html',
              repeatable: false,
              required: false,
              deprecated: false,
            },
            expectedErrorMessage: "The 'tag' modification is not allowed for standard scope.",
          },
          {
            step: 2,
            fieldName: 'label',
            payload: {
              tag: '100',
              label: 'Main Entry - Personal Name updated',
              url: 'https://www.loc.gov/marc/bibliographic/bd100.html',
              repeatable: false,
              required: false,
              deprecated: false,
            },
            expectedErrorMessage: "The 'label' modification is not allowed for standard scope.",
          },
          {
            step: 3,
            fieldName: 'repeatable',
            payload: {
              tag: '100',
              label: 'Main Entry - Personal Name',
              url: 'https://www.loc.gov/marc/bibliographic/bd100.html',
              repeatable: true,
              required: false,
              deprecated: false,
            },
            expectedErrorMessage:
              "The 'repeatable' modification is not allowed for standard scope.",
          },
          {
            step: 4,
            fieldName: 'deprecated',
            payload: {
              tag: '100',
              label: 'Main Entry - Personal Name',
              url: 'https://www.loc.gov/marc/bibliographic/bd100.html',
              repeatable: false,
              required: false,
              deprecated: true,
            },
            expectedErrorMessage:
              "The 'deprecated' modification is not allowed for standard scope.",
          },
        ];

        // Execute each test case
        testCases.forEach((testCase) => {
          cy.updateSpecificationField(standardField.id, testCase.payload, false).then(
            (updateResp) => {
              expect(updateResp.status).to.eq(400);
              expect(updateResp.body.errors[0].message).to.contain(testCase.expectedErrorMessage);
            },
          );
        });

        // Step 5: Verify standard validation rule didn't change
        cy.getSpecificationFields(bibSpecId).then((getResp) => {
          expect(getResp.status).to.eq(200);

          // Find the same standard field again
          const unchangedField = findStandardField(getResp.body.fields, '100');
          expect(unchangedField, 'Standard field 100 still exists').to.exist;

          // Verify all original values are preserved
          expect(unchangedField.tag).to.eq(originalField.tag);
          expect(unchangedField.label).to.eq(originalField.label);
          expect(unchangedField.repeatable).to.eq(originalField.repeatable);
          expect(unchangedField.required).to.eq(originalField.required);
          expect(unchangedField.deprecated).to.eq(originalField.deprecated);
          expect(unchangedField.scope).to.eq('standard');
        });
      });
    },
  );
});
