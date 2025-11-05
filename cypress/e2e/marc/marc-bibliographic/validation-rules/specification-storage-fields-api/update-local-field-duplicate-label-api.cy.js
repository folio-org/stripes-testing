/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Update Local Field Duplicate Label API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
  ];

  const LOCAL_FIELD_TAG = '991';

  function validateSuccessResponse(response, expectedStatus) {
    expect(response.status).to.eq(expectedStatus);
    expect(response.body).to.exist;
    expect(response.body.id).to.exist;
  }

  let user;
  let bibSpecId;
  let localFieldId;

  before('Create user and setup test data', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;

        // Clean up any existing local field with tag before test execution
        cy.getSpecificationFields(bibSpecId).then((response) => {
          const existingLocalField = response.body.fields.find(
            (f) => f.tag === LOCAL_FIELD_TAG && f.scope === 'local',
          );
          if (existingLocalField) {
            cy.deleteSpecificationField(existingLocalField.id, false);
          }
        });

        // Create a local field for testing validation
        const localFieldPayload = {
          tag: LOCAL_FIELD_TAG,
          label: 'AT_C490943_Test Local Field',
          url: 'http://www.example.org/field991.html',
          repeatable: true,
          required: false,
          deprecated: false,
          scope: 'local',
        };

        cy.createSpecificationField(bibSpecId, localFieldPayload).then((fieldResp) => {
          expect(fieldResp.status).to.eq(201);
          localFieldId = fieldResp.body.id;
        });
      });
    });
  });

  after('Delete test user and cleanup', () => {
    cy.getAdminToken();
    if (user) {
      Users.deleteViaApi(user.userId);
    }
    if (localFieldId) {
      cy.deleteSpecificationField(localFieldId, false);
    }
  });

  it(
    'C490943 Update Local Field with duplicate "label" for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C490943', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Test scenarios with duplicate labels from different field scopes
      const duplicateLabelScenarios = [
        {
          description: 'System validation rule label (Control Number)',
          label: 'Control Number',
        },
        {
          description: 'Standard validation rule label (Title Statement)',
          label: 'Title Statement',
        },
        {
          description: 'Local validation rule label (Local)',
          label: 'Local',
        },
      ];

      duplicateLabelScenarios.forEach((scenario) => {
        cy.log(`Testing ${scenario.description}: "${scenario.label}"`);

        const updatePayload = {
          tag: LOCAL_FIELD_TAG,
          label: scenario.label,
          url: 'http://www.example.org/field100.html',
          repeatable: true,
          required: false,
        };

        cy.updateSpecificationField(localFieldId, updatePayload, true).then((response) => {
          validateSuccessResponse(response, 202);
          expect(response.body.label).to.eq(scenario.label);
          expect(response.body.tag).to.eq(LOCAL_FIELD_TAG);
        });
      });
    },
  );
});
