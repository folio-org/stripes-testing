/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot Create Indicators with Invalid Label Length API', () => {
  // User with required permissions to create fields and indicators
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
  ];

  const LOCAL_FIELD_TAG_1 = '981'; // For first local field
  const LOCAL_FIELD_TAG_2 = '971'; // For second local field
  const TEST_CASE_ID = 'C499658';

  let user;
  let bibSpecId;
  let localField1Id;
  let localField2Id;

  // Helper to generate labels of specific character lengths
  const generateLabel = (length) => {
    const baseText =
      'character test Label validation during creation of validation rule for MARC bibliographic record via API ';
    const prefix = `${length} `;
    const remainingLength = length - prefix.length;
    return (
      prefix +
      baseText.repeat(Math.ceil(remainingLength / baseText.length)).substring(0, remainingLength)
    );
  };

  before('Create user and setup local fields', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      getBibliographicSpec().then((bibSpec) => {
        bibSpecId = bibSpec.id;

        // Clean up any existing fields with the same tags
        cy.deleteSpecificationFieldByTag(bibSpecId, LOCAL_FIELD_TAG_1, false);
        cy.deleteSpecificationFieldByTag(bibSpecId, LOCAL_FIELD_TAG_2, false);

        // Create first local field for indicator testing
        const fieldTestDataBuilder1 = createFieldTestDataBuilder(TEST_CASE_ID);
        const testData1 = fieldTestDataBuilder1
          .withField(LOCAL_FIELD_TAG_1, 'Local Field 1 for Indicator Label Length Test', {
            url: 'http://www.example.org/field981.html',
            repeatable: false,
            required: false,
            deprecated: false,
          })
          .build();

        cy.createSpecificationField(bibSpecId, testData1.field).then((response1) => {
          validateApiResponse(response1, 201);
          localField1Id = response1.body.id;
          expect(response1.body.scope).to.eq('local');

          // Create second local field for indicator testing
          const fieldTestDataBuilder2 = createFieldTestDataBuilder(TEST_CASE_ID);
          const testData2 = fieldTestDataBuilder2
            .withField(LOCAL_FIELD_TAG_2, 'Local Field 2 for Indicator Label Length Test', {
              url: 'http://www.example.org/field971.html',
              repeatable: false,
              required: false,
              deprecated: false,
            })
            .build();

          cy.createSpecificationField(bibSpecId, testData2.field).then((response2) => {
            validateApiResponse(response2, 201);
            localField2Id = response2.body.id;
            expect(response2.body.scope).to.eq('local');
          });
        });
      });
    });
  });

  after('Delete test user and clean up created fields', () => {
    if (user) {
      cy.getAdminToken();

      // Clean up created fields (indicators will be automatically deleted)
      if (localField1Id) {
        cy.deleteSpecificationField(localField1Id, false);
      }
      if (localField2Id) {
        cy.deleteSpecificationField(localField2Id, false);
      }

      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499658 Cannot create Indicators of Local field with invalid "label" length for MARC bib spec (API) (spitfire)',
    { tags: ['C499658', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Try to create indicator with 351 characters (should fail)
      const label351 = generateLabel(351);
      expect(label351).to.have.lengthOf(351);

      const indicator351Payload = {
        order: 1,
        label: label351,
      };

      cy.createSpecificationFieldIndicator(localField1Id, indicator351Payload, false).then(
        (response) => {
          expect(response.status).to.eq(400);
          expect(response.body.errors[0].message).to.eq(
            "The 'label' field has exceeded 350 character limit.",
          );
        },
      );

      // Step 2: Create indicator with exactly 350 characters (should succeed)
      const label350 = generateLabel(350);
      expect(label350).to.have.lengthOf(350);

      const indicator350Payload = {
        order: 1,
        label: label350,
      };

      cy.createSpecificationFieldIndicator(localField1Id, indicator350Payload).then((response) => {
        validateApiResponse(response, 201);
        const createdIndicator = response.body;

        expect(createdIndicator.fieldId).to.eq(localField1Id);
        expect(createdIndicator.order).to.eq(1);
        expect(createdIndicator.label).to.eq(label350);
        expect(createdIndicator.id).to.exist;
        expect(createdIndicator.metadata).to.exist;
      });

      // Step 3: Create indicator with 349 characters (should succeed)
      const label349 = generateLabel(349);
      expect(label349).to.have.lengthOf(349);

      const indicator349Payload = {
        order: 2,
        label: label349,
      };

      cy.createSpecificationFieldIndicator(localField1Id, indicator349Payload).then((response) => {
        validateApiResponse(response, 201);
        const createdIndicator = response.body;

        expect(createdIndicator.fieldId).to.eq(localField1Id);
        expect(createdIndicator.order).to.eq(2);
        expect(createdIndicator.label).to.eq(label349);
        expect(createdIndicator.id).to.exist;
        expect(createdIndicator.metadata).to.exist;
      });

      // Step 4: Create indicator with 1 character on second field (should succeed)
      const indicator1CharPayload = {
        order: 1,
        label: '1',
      };

      cy.createSpecificationFieldIndicator(localField2Id, indicator1CharPayload).then(
        (response) => {
          validateApiResponse(response, 201);
          const createdIndicator = response.body;

          expect(createdIndicator.fieldId).to.eq(localField2Id);
          expect(createdIndicator.order).to.eq(1);
          expect(createdIndicator.label).to.eq('1');
          expect(createdIndicator.id).to.exist;
          expect(createdIndicator.metadata).to.exist;

          cy.log(
            'Successfully validated indicator label length limits: 351 chars fails, 350/349/1 chars succeed',
          );
        },
      );
    },
  );
});
