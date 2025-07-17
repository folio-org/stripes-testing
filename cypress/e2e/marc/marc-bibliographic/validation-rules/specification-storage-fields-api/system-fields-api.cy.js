/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('Specification Storage - System Fields API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  function findSystemField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'system');
  }

  let user;
  let bibSpecId;
  let systemField;

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
    'C499785 Cannot update System Field (except "url") for MARC bib spec (API) (spitfire)',
    { tags: ['smoke', 'C499785', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Get all fields for the MARC bib specification
      cy.getSpecificationFields(bibSpecId).then((response) => {
        expect(response.status).to.eq(200);

        // Find a system field (e.g., 245)
        systemField = findSystemField(response.body.fields, '245');
        expect(systemField, 'System field 245 exists').to.exist;

        // Store original field values for restoration
        const originalField = { ...systemField };

        // Define test cases for different field modifications
        const testCases = [
          {
            step: 1,
            fieldName: 'tag',
            payload: {
              tag: '241',
              label: 'Title Statement',
              url: 'https://www.loc.gov/marc/bibliographic/bd245.html',
              repeatable: false,
              required: true,
              deprecated: false,
            },
            expectedErrorMessage: "The 'tag' modification is not allowed for system scope.",
          },
          {
            step: 2,
            fieldName: 'label',
            payload: {
              tag: '245',
              label: 'Title Statement updated',
              url: 'https://www.loc.gov/marc/bibliographic/bd001.html',
              repeatable: false,
              required: true,
              deprecated: false,
            },
            expectedErrorMessage: "The 'label' modification is not allowed for system scope.",
          },
          {
            step: 3,
            fieldName: 'repeatable',
            payload: {
              tag: '245',
              label: 'Title Statement',
              url: 'https://www.loc.gov/marc/bibliographic/bd001.html',
              repeatable: true,
              required: true,
              deprecated: false,
            },
            expectedErrorMessage: "The 'repeatable' modification is not allowed for system scope.",
          },
          {
            step: 4,
            fieldName: 'required',
            payload: {
              tag: '245',
              label: 'Title Statement',
              url: 'https://www.loc.gov/marc/bibliographic/bd001.html',
              repeatable: false,
              required: false,
              deprecated: false,
            },
            expectedErrorMessage: "The 'required' modification is not allowed for system scope.",
          },
          {
            step: 5,
            fieldName: 'deprecated',
            payload: {
              tag: '245',
              label: 'Title Statement',
              url: 'https://www.loc.gov/marc/bibliographic/bd001.html',
              repeatable: false,
              required: true,
              deprecated: true,
            },
            expectedErrorMessage: "The 'deprecated' modification is not allowed for system scope.",
          },
        ];

        // Execute each test case
        testCases.forEach((testCase) => {
          cy.updateSpecificationField(systemField.id, testCase.payload, false).then(
            (updateResp) => {
              expect(updateResp.status).to.eq(400);
              expect(updateResp.body.errors[0].message).to.contain(testCase.expectedErrorMessage);
            },
          );
        });

        // Verify system validation rule didn't change
        cy.getSpecificationFields(bibSpecId).then((getResp) => {
          expect(getResp.status).to.eq(200);

          // Find the same system field again
          const unchangedField = findSystemField(getResp.body.fields, '245');
          expect(unchangedField, 'System field 245 still exists').to.exist;

          // Verify all original values are preserved
          expect(unchangedField.tag).to.eq(originalField.tag);
          expect(unchangedField.label).to.eq(originalField.label);
          expect(unchangedField.repeatable).to.eq(originalField.repeatable);
          expect(unchangedField.required).to.eq(originalField.required);
          expect(unchangedField.deprecated).to.eq(originalField.deprecated);
          expect(unchangedField.scope).to.eq('system');
        });
      });
    },
  );
});
