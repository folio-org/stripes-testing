/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Update Indicators Invalid Label Length API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageUpdateSpecificationFieldIndicator.gui,
  ];

  const LOCAL_FIELD_TAG = '983';

  let user;
  let bibSpecId;
  let localFieldId;
  let indicatorId;

  // Generate test labels of specific lengths
  const generateLabel = (length) => {
    const baseText =
      'character test Label validation during creation of validation rule for MARC bibliographic record via API ';
    return `${length} ${baseText.repeat(Math.ceil(length / baseText.length))}`.substring(0, length);
  };

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

        // Create a local field for testing indicators
        const localFieldPayload = {
          tag: LOCAL_FIELD_TAG,
          label: 'AT_C502979_Local Field with Indicator',
          url: 'http://www.example.org/field983.html',
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
            label: 'Original Indicator Label',
          };

          cy.createSpecificationFieldIndicator(localFieldId, indicatorPayload).then(
            (indicatorResp) => {
              expect(indicatorResp.status).to.eq(201);
              indicatorId = indicatorResp.body.id;
            },
          );
        });
      });
    });
  });

  after('Delete test user and cleanup', () => {
    if (user) {
      cy.getAdminToken();
      // Clean up the created local field (this will also delete its indicators)
      if (localFieldId) {
        cy.deleteSpecificationField(localFieldId, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C502979 Cannot update Indicators of Local field with invalid "label" length for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502979', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Update indicator with label >350 characters - should fail
      const label351 = generateLabel(351);
      const updatePayload351 = {
        order: 1,
        label: label351,
      };

      cy.updateSpecificationFieldIndicator(indicatorId, updatePayload351, false).then(
        (response1) => {
          expect(response1.status, 'Step 1: Update with 351 characters should fail').to.eq(400);
          expect(response1.body, 'Response body should exist').to.exist;
          expect(response1.body.errors, 'Should contain errors array').to.exist;
          expect(
            response1.body.errors[0].message,
            'Should contain label length validation error',
          ).to.include("The 'label' field has exceeded 350 character limit");
        },
      );

      // Step 2: Update indicator with label exactly 350 characters - should succeed
      const label350 = generateLabel(350);
      const updatePayload350 = {
        order: 1,
        label: label350,
      };

      cy.updateSpecificationFieldIndicator(indicatorId, updatePayload350).then((response2) => {
        expect(response2.status, 'Step 2: Update with 350 characters should succeed').to.eq(202);
        expect(response2.body, 'Response body should exist').to.exist;
        expect(response2.body.id).to.eq(indicatorId);
        expect(response2.body.label).to.eq(label350);
        expect(response2.body.order).to.eq(1);
      });

      // Step 3: Update indicator with label 349 characters - should succeed
      const label349 = generateLabel(349);
      const updatePayload349 = {
        order: 1,
        label: label349,
      };

      cy.updateSpecificationFieldIndicator(indicatorId, updatePayload349).then((response3) => {
        expect(response3.status, 'Step 3: Update with 349 characters should succeed').to.eq(202);
        expect(response3.body, 'Response body should exist').to.exist;
        expect(response3.body.id).to.eq(indicatorId);
        expect(response3.body.label).to.eq(label349);
        expect(response3.body.order).to.eq(1);
      });

      // Step 4: Update indicator with label 1 character - should succeed
      const updatePayload1 = {
        order: 1,
        label: '1',
      };

      cy.updateSpecificationFieldIndicator(indicatorId, updatePayload1).then((response4) => {
        expect(response4.status, 'Step 4: Update with 1 character should succeed').to.eq(202);
        expect(response4.body, 'Response body should exist').to.exist;
        expect(response4.body.id).to.eq(indicatorId);
        expect(response4.body.label).to.eq('1');
        expect(response4.body.order).to.eq(1);
      });
    },
  );
});
