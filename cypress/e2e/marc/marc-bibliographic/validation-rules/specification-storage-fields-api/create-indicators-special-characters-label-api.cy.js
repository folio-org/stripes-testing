/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Create Indicators with Special Characters in Label API', () => {
  // User with required permissions to create fields and indicators
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
  ];

  const LOCAL_FIELD_TAG = '973'; // Unique tag for this test
  const TEST_CASE_ID = 'C499660';
  const SPECIAL_CHAR_LABEL = 'Ind 1 name$ | test / with spec. - char.'; // Label with special characters per TestRail

  let user;
  let bibSpecId;
  let localFieldId;

  before('Create user and setup local field', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;

        // Clean up any existing field with the same tag
        cy.deleteSpecificationFieldByTag(bibSpecId, LOCAL_FIELD_TAG, false);

        // Create local field for indicator testing
        const fieldTestDataBuilder = createFieldTestDataBuilder(TEST_CASE_ID);
        const testData = fieldTestDataBuilder
          .withField(LOCAL_FIELD_TAG, 'Local Field for Special Characters Test', {
            url: 'http://www.example.org/field973.html',
            repeatable: false,
            required: false,
            deprecated: false,
          })
          .build();

        cy.createSpecificationField(bibSpecId, testData.field).then((response) => {
          validateApiResponse(response, 201);
          localFieldId = response.body.id;
          expect(response.body.scope).to.eq('local');
          expect(response.body.tag).to.eq(LOCAL_FIELD_TAG);
        });
      });
    });
  });

  after('Delete test user and clean up created field', () => {
    if (user) {
      cy.getAdminToken();
      // Clean up created field (indicators will be automatically deleted)
      if (localFieldId) {
        cy.deleteSpecificationField(localFieldId, false);
      }
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499660 Create Indicators of Local field with special characters in "label" for MARC bib spec (API) (spitfire)',
    { tags: ['C499660', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Create indicator with special characters in label
      const indicatorPayload = {
        order: 1,
        label: SPECIAL_CHAR_LABEL,
      };

      cy.createSpecificationFieldIndicator(localFieldId, indicatorPayload).then((response) => {
        validateApiResponse(response, 201);
        const createdIndicator = response.body;

        // Validate indicator response contains all expected properties
        expect(createdIndicator.id, 'Indicator should have an ID').to.exist;
        expect(createdIndicator.fieldId, 'Indicator should be linked to field').to.eq(localFieldId);
        expect(createdIndicator.order, 'Indicator should have correct order').to.eq(1);
        expect(
          createdIndicator.label,
          'Indicator should preserve special characters in label',
        ).to.eq(SPECIAL_CHAR_LABEL);
        expect(createdIndicator.metadata, 'Indicator should have metadata').to.exist;

        // Verify that all special characters are preserved exactly
        const expectedSpecialChars = ['$', '|', '/', '.', '-'];
        expectedSpecialChars.forEach((char) => {
          expect(
            createdIndicator.label,
            `Label should contain special character: ${char}`,
          ).to.include(char);
        });

        // Verify indicator can be retrieved with special characters intact
        cy.getSpecificationFieldIndicators(localFieldId).then((getResponse) => {
          validateApiResponse(getResponse, 200);
          const indicators = getResponse.body.indicators;
          expect(indicators, 'Should have exactly 1 indicator').to.have.length(1);
          const retrievedIndicator = indicators[0];
          expect(retrievedIndicator.id).to.eq(createdIndicator.id);
          expect(retrievedIndicator.fieldId).to.eq(localFieldId);
          expect(retrievedIndicator.order).to.eq(1);
          expect(
            retrievedIndicator.label,
            'Retrieved label should exactly match created label with special chars',
          ).to.eq(SPECIAL_CHAR_LABEL);

          cy.log(
            `Successfully created indicator with special characters: "${SPECIAL_CHAR_LABEL}" on local field ${LOCAL_FIELD_TAG}`,
          );
        });
      });
    },
  );
});
