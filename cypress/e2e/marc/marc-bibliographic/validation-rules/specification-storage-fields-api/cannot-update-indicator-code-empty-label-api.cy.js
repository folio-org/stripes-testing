/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Update Indicator Code Empty Label API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageUpdateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageUpdateSpecificationIndicatorCode.gui,
  ];

  const LOCAL_FIELD_TAG = '984';
  const REQUIRED_LABEL_ERROR = "The 'label' field is required.";

  let user;
  let bibSpecId;
  let localFieldId;
  let indicatorId;
  let indicatorCodeId;

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

        // Create a local field for testing indicator codes
        const localFieldPayload = {
          tag: LOCAL_FIELD_TAG,
          label: 'AT_C502985_Local Field with Indicator Code',
          url: 'http://www.example.org/field986.html',
          repeatable: true,
          required: false,
          deprecated: false,
          scope: 'local',
        };

        cy.createSpecificationField(bibSpecId, localFieldPayload).then((fieldResp) => {
          expect(fieldResp.status).to.eq(201);
          localFieldId = fieldResp.body.id;

          // Create an indicator for this local field
          const indicatorPayload = {
            order: 1,
            label: 'Test Indicator for Label Validation',
          };

          cy.createSpecificationFieldIndicator(localFieldId, indicatorPayload).then(
            (indicatorResp) => {
              expect(indicatorResp.status).to.eq(201);
              indicatorId = indicatorResp.body.id;

              // Create an indicator code for testing
              const indicatorCodePayload = {
                code: '0',
                label: 'Initial Code Label',
                deprecated: false,
              };

              cy.createSpecificationIndicatorCode(indicatorId, indicatorCodePayload).then(
                (codeResp) => {
                  expect(codeResp.status).to.eq(201);
                  indicatorCodeId = codeResp.body.id;
                },
              );
            },
          );
        });
      });
    });
  });

  after('Delete test user and cleanup', () => {
    cy.getAdminToken();
    if (localFieldId) {
      cy.deleteSpecificationField(localFieldId, false);
    }
    // Clean up user
    if (user) {
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C502985 Cannot update Indicator code of Local field with empty "label" for MARC bib spec (API) (spitfire)',
    { tags: ['criticalPath', 'C502985', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      const payloads = [
        { code: '3', label: '' }, // Invalid: empty string
        { code: '3', label: ' ' }, // Invalid: space-only string
        { code: '3' }, // Invalid: missing 'label' field entirely
      ];

      payloads.forEach((payload) => {
        cy.updateSpecificationIndicatorCode(indicatorCodeId, payload, false).then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body, 'Response body should exist').to.exist;
          expect(response.body.errors, 'Should contain errors array').to.exist;
          expect(response.body.errors).to.have.length.greaterThan(0);

          // Validate specific error message for required label
          const errorMessage = response.body.errors[0].message;
          expect(errorMessage, 'Should contain required label error').to.include(
            REQUIRED_LABEL_ERROR,
          );

          // Validate error structure (flexible to handle optional fields)
          expect(response.body.errors[0], 'Error should have required fields').to.include.all.keys([
            'message',
            'type',
            'code',
          ]);
        });
      });
    },
  );
});
