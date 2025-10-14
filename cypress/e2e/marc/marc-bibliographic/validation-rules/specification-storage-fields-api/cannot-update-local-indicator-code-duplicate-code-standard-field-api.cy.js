/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Update Local Indicator Code Duplicate Code Standard Field API', () => {
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

  const STANDARD_FIELD_TAG = '011'; // Linking ISSN - standard field
  const EXPECTED_ERROR_MESSAGE = "The 'code' must be unique";

  // Helper function to find standard field
  function findStandardField(fields, tag) {
    return fields.find((f) => f.tag === tag && f.scope === 'standard');
  }

  let user;
  let bibSpecId;
  let standardField;
  let firstIndicator;
  let localIndicatorCode1Id;
  let localIndicatorCode2Id;
  const createPayload1 = {
    code: 'y',
    label: 'AT_C502963_Test Local Code 1',
    deprecated: false,
  };
  const createPayload2 = {
    code: 'z',
    label: 'AT_C502963_Test Local Code 2',
    deprecated: false,
  };

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        // Find the specification with profile 'bibliographic'
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;
      });
    });
  });

  before('Setup test data - create local indicator codes for standard field', () => {
    cy.getUserToken(user.username, user.password);

    // Get all fields for the MARC bib specification
    cy.getSpecificationFields(bibSpecId).then((response) => {
      expect(response.status).to.eq(200);

      standardField = findStandardField(response.body.fields, STANDARD_FIELD_TAG);
      expect(standardField, `Standard field ${STANDARD_FIELD_TAG} exists`).to.exist;

      // Get indicators for the standard field
      cy.getSpecificationFieldIndicators(standardField.id).then((indicatorsResp) => {
        firstIndicator = indicatorsResp.body.indicators[0];
        expect(firstIndicator, 'First indicator exists').to.exist;

        // Get existing indicator codes to identify standard and local codes
        cy.getSpecificationIndicatorCodes(firstIndicator.id).then((existingCodesResp) => {
          const allCodes = existingCodesResp.body.codes;

          // Cleanup: Remove any existing test indicator codes from previous failed runs
          const existingTestCodes = allCodes.filter((code) => [createPayload1.code, createPayload2.code].includes(code.code));
          existingTestCodes.forEach((code) => {
            cy.deleteSpecificationIndicatorCode(code.id, false).then(() => {
              cy.log('Cleaned up existing test indicator code from previous run');
            });
          });

          cy.createSpecificationIndicatorCode(firstIndicator.id, createPayload1).then(
            (createResp1) => {
              expect(createResp1.status).to.eq(201);
              localIndicatorCode1Id = createResp1.body.id;

              // Create second local indicator code for testing
              cy.createSpecificationIndicatorCode(firstIndicator.id, createPayload2).then(
                (createResp2) => {
                  expect(createResp2.status).to.eq(201);
                  localIndicatorCode2Id = createResp2.body.id;
                },
              );
            },
          );
        });
      });
    });
  });

  after('Delete test user and cleanup', () => {
    if (user) {
      cy.getAdminToken();
      // Cleanup: Delete the created indicator codes if they exist
      if (localIndicatorCode1Id) {
        cy.deleteSpecificationIndicatorCode(localIndicatorCode1Id, false);
      }
      if (localIndicatorCode2Id) {
        cy.deleteSpecificationIndicatorCode(localIndicatorCode2Id, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C502963 Cannot update Local Indicator Code of Standard field with duplicate for MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502963', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Try to update first local indicator code with existing LOC standard code (should fail)

      const updatePayload1 = {
        code: createPayload2.code,
        label: 'AT_C502963_Test Local Code 1 Updated',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(localIndicatorCode1Id, updatePayload1, false).then(
        (updateResp1) => {
          expect(
            updateResp1.status,
            'Step 1: Update with existing standard code should fail',
          ).to.eq(400);
          expect(updateResp1.body, 'Response body should exist').to.exist;
          expect(updateResp1.body.errors, 'Should contain errors array').to.exist;
          expect(
            updateResp1.body.errors[0].message,
            'Should contain duplicate code error',
          ).to.include(EXPECTED_ERROR_MESSAGE);
        },
      );

      // Step 2: Try to update second local indicator code with existing user-created local code (should fail)
      const updatePayload2 = {
        code: createPayload1.code,
        label: 'AT_C502963_Test Local Code 2 Updated',
        deprecated: false,
      };

      cy.updateSpecificationIndicatorCode(localIndicatorCode2Id, updatePayload2, false).then(
        (updateResp2) => {
          expect(updateResp2.status, 'Step 2: Update with existing local code should fail').to.eq(
            400,
          );
          expect(updateResp2.body, 'Response body should exist').to.exist;
          expect(updateResp2.body.errors, 'Should contain errors array').to.exist;
          expect(
            updateResp2.body.errors[0].message,
            'Should contain duplicate code error',
          ).to.include(EXPECTED_ERROR_MESSAGE);
        },
      );
    },
  );
});
