/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Delete Local Field API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageDeleteSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
  ];

  const LOCAL_FIELD_TAG = '998';

  function validateApiResponse(response, expectedStatus) {
    expect(response.status).to.eq(expectedStatus);
  }

  let user;
  let bibSpecId;
  let localFieldId;
  let indicatorId;

  before('Create user and fetch MARC bib specification', () => {
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

        // Create a local field for testing deletion
        const localFieldPayload = {
          tag: LOCAL_FIELD_TAG,
          label: 'AT_C491277_Test Local Field for Deletion',
          url: 'http://www.example.org/field998.html',
          repeatable: true,
          required: false,
          deprecated: false,
          scope: 'local',
        };

        cy.createSpecificationField(bibSpecId, localFieldPayload).then((fieldResp) => {
          expect(fieldResp.status).to.eq(201);
          localFieldId = fieldResp.body.id;

          // Create indicator for the local field
          cy.createSpecificationFieldIndicator(localFieldId, {
            order: 1,
            label: 'AT_C491277_Test Indicator',
          }).then((indicatorResp) => {
            validateApiResponse(indicatorResp, 201);
            indicatorId = indicatorResp.body.id;

            // Create indicator code for the indicator
            cy.createSpecificationIndicatorCode(
              indicatorId,
              {
                code: '0',
                label: 'AT_C491277_Test Indicator Code',
                deprecated: false,
              },
              true,
            ).then((codeResp) => {
              validateApiResponse(codeResp, 201);
            });
          });

          // Create subfield for the local field
          cy.createSpecificationFieldSubfield(localFieldId, {
            code: 'a',
            label: 'AT_C491277_Test Subfield',
            repeatable: true,
            required: false,
            deprecated: false,
          }).then((subfieldResp) => {
            validateApiResponse(subfieldResp, 201);
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
    'C491277 Delete Local Field for MARC bib spec (API) (spitfire)',
    { tags: ['criticalPath', 'C491277', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Delete the local field
      cy.deleteSpecificationField(localFieldId, true).then((deleteResp) => {
        expect(deleteResp.status, 'Step 1: Delete local field').to.eq(204);
      });

      // Step 2: Verify field is removed from fields collection
      cy.getSpecificationFields(bibSpecId).then((fieldsResp) => {
        expect(fieldsResp.status, 'Step 2: Get fields after deletion').to.eq(200);

        // Verify the deleted field is not in the response
        const deletedField = fieldsResp.body.fields.find((field) => field.id === localFieldId);
        expect(deletedField, 'Deleted field should not exist in fields collection').to.not.exist;
      });

      // Step 3: Verify getting field indicators returns 404
      cy.getSpecificationFieldIndicators(localFieldId, false).then((indicatorsResp) => {
        expect(indicatorsResp.status, 'Step 3: Get field indicators after field deletion').to.eq(
          404,
        );
        expect(indicatorsResp.body.errors[0].message).to.contain(
          `field definition with ID [${localFieldId}] was not found`,
        );
      });

      // Step 4: Verify getting indicator codes returns 404
      cy.getSpecificationIndicatorCodes(indicatorId, false).then((codesResp) => {
        expect(codesResp.status, 'Step 4: Get indicator codes after field deletion').to.eq(404);
        expect(codesResp.body.errors[0].message).to.contain(
          `field indicator with ID [${indicatorId}] was not found`,
        );
      });

      // Step 5: Verify getting field subfields returns 404
      cy.getSpecificationFieldSubfields(localFieldId, false).then((subfieldsResp) => {
        expect(subfieldsResp.status, 'Step 5: Get field subfields after field deletion').to.eq(404);
        expect(subfieldsResp.body.errors[0].message).to.contain(
          `field definition with ID [${localFieldId}] was not found`,
        );
      });
    },
  );
});
