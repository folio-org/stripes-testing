/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot Create Indicator Code without Permission API', () => {
  // User with permissions to create fields and indicators but NOT indicator codes
  const limitedPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    // NOTE: Missing Permissions.specificationStorageCreateSpecificationIndicatorCode.gui
  ];

  const LOCAL_FIELD_TAG = '974'; // Unique tag for this test
  const TEST_CASE_ID = 'C499652';

  let user;
  let bibSpecId;
  let localFieldId;
  let indicatorId;

  before('Create user and setup local field with indicator', () => {
    cy.getAdminToken();
    cy.createTempUser(limitedPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;

        // Clean up any existing field with the same tag
        cy.deleteSpecificationFieldByTag(bibSpecId, LOCAL_FIELD_TAG, false);

        // Create local field for indicator testing (using admin token)
        const fieldTestDataBuilder = createFieldTestDataBuilder(TEST_CASE_ID);
        const testData = fieldTestDataBuilder
          .withField(LOCAL_FIELD_TAG, 'Local Field for Permission Test', {
            url: 'http://www.example.org/field974.html',
            repeatable: false,
            required: false,
            deprecated: false,
          })
          .build();

        cy.createSpecificationField(bibSpecId, testData.field).then((fieldResponse) => {
          validateApiResponse(fieldResponse, 201);
          localFieldId = fieldResponse.body.id;
          expect(fieldResponse.body.scope).to.eq('local');

          // Create an indicator for the field (using admin token)
          const indicatorPayload = {
            order: 1,
            label: 'AT_C499652_Indicator 1',
          };

          cy.createSpecificationFieldIndicator(localFieldId, indicatorPayload).then(
            (indicatorResponse) => {
              validateApiResponse(indicatorResponse, 201);
              indicatorId = indicatorResponse.body.id;
              expect(indicatorResponse.body.order).to.eq(1);
            },
          );
        });
      });
    });
  });

  after('Delete test user and clean up created field', () => {
    if (user) {
      cy.getAdminToken();
      // Clean up created field (indicators and codes will be automatically deleted)
      if (localFieldId) {
        cy.deleteSpecificationField(localFieldId, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499652 Cannot create Indicator code of Local field for MARC bib spec without required permission (API) (spitfire)',
    { tags: ['C499652', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      const indicatorCodePayload = {
        code: '1',
        label: 'Code 1 name',
      };

      cy.createSpecificationIndicatorCode(indicatorId, indicatorCodePayload, false).then(
        (response) => {
          expect(response.status).to.eq(403);
          expect(response.body.errors, 'Response should contain error details').to.exist;
          expect(response.body.errors).to.have.length.greaterThan(0);
          const errorMessage =
            response.body.errors[0].message || response.body.errors[0].description;
          expect(errorMessage, 'Error should indicate access denied').to.include('Access Denied');

          cy.log(
            `Successfully verified 403 error when user "${user.username}" attempts to create indicator code without required permission`,
          );
        },
      );
    },
  );
});
