/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
  createFieldTestDataBuilder,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Create Indicator Code of Local Field API', () => {
  // User with all required permissions to create fields, indicators, and indicator codes
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
  ];

  const LOCAL_FIELD_TAG = '975'; // Unique tag for this test
  const TEST_CASE_ID = 'C499653';

  let user;
  let bibSpecId;
  let localFieldId;
  let indicator1Id;
  let indicator2Id;
  let indicatorCode1Id;
  let indicatorCode2Id;

  before('Create user and setup local field with indicators', () => {
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
          .withField(LOCAL_FIELD_TAG, 'Local Field for Indicator Code Test', {
            url: 'http://www.example.org/field975.html',
            repeatable: false,
            required: false,
            deprecated: false,
          })
          .build();

        cy.createSpecificationField(bibSpecId, testData.field).then((fieldResponse) => {
          validateApiResponse(fieldResponse, 201);
          localFieldId = fieldResponse.body.id;
          expect(fieldResponse.body.scope).to.eq('local');

          // Create Indicator 1
          const indicator1Payload = {
            order: 1,
            label: 'AT_C499653_Indicator 1',
          };

          cy.createSpecificationFieldIndicator(localFieldId, indicator1Payload).then(
            (indicator1Response) => {
              validateApiResponse(indicator1Response, 201);
              indicator1Id = indicator1Response.body.id;
              expect(indicator1Response.body.order).to.eq(1);

              // Create Indicator 2
              const indicator2Payload = {
                order: 2,
                label: 'AT_C499653_Indicator 2',
              };

              cy.createSpecificationFieldIndicator(localFieldId, indicator2Payload).then(
                (indicator2Response) => {
                  validateApiResponse(indicator2Response, 201);
                  indicator2Id = indicator2Response.body.id;
                  expect(indicator2Response.body.order).to.eq(2);
                },
              );
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
    'C499653 Create Indicator code of Local field for MARC bib spec (API) (spitfire)',
    { tags: ['C499653', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Create indicator code for Indicator 1
      const indicatorCode1Payload = {
        code: '1',
        label: 'Code 1 name',
      };

      cy.createSpecificationIndicatorCode(indicator1Id, indicatorCode1Payload).then((response1) => {
        validateApiResponse(response1, 201);
        const createdCode1 = response1.body;
        indicatorCode1Id = createdCode1.id;

        // Validate all response properties for Indicator 1 code
        expect(createdCode1.id, 'Indicator code 1 should have an ID').to.exist;
        expect(createdCode1.indicatorId, 'Indicator code 1 should be linked to indicator 1').to.eq(
          indicator1Id,
        );
        expect(createdCode1.code, 'Indicator code 1 should have correct code').to.eq('1');
        expect(createdCode1.label, 'Indicator code 1 should have correct label').to.eq(
          'Code 1 name',
        );
        expect(createdCode1.deprecated, 'Indicator code 1 should not be deprecated').to.eq(false);
        expect(createdCode1.scope, 'Indicator code 1 should have local scope').to.eq('local');
        expect(createdCode1.metadata, 'Indicator code 1 should have metadata').to.exist;

        // Step 2: Create indicator code for Indicator 2 (same code and label)
        const indicatorCode2Payload = {
          code: '1',
          label: 'Code 1 name',
        };

        cy.createSpecificationIndicatorCode(indicator2Id, indicatorCode2Payload).then(
          (response2) => {
            validateApiResponse(response2, 201);
            const createdCode2 = response2.body;
            indicatorCode2Id = createdCode2.id;

            // Validate all response properties for Indicator 2 code
            expect(createdCode2.id, 'Indicator code 2 should have an ID').to.exist;
            expect(
              createdCode2.indicatorId,
              'Indicator code 2 should be linked to indicator 2',
            ).to.eq(indicator2Id);
            expect(createdCode2.code, 'Indicator code 2 should have correct code').to.eq('1');
            expect(createdCode2.label, 'Indicator code 2 should have correct label').to.eq(
              'Code 1 name',
            );
            expect(createdCode2.deprecated, 'Indicator code 2 should not be deprecated').to.eq(
              false,
            );
            expect(createdCode2.scope, 'Indicator code 2 should have local scope').to.eq('local');
            expect(createdCode2.metadata, 'Indicator code 2 should have metadata').to.exist;

            // Ensure the two codes have different IDs even though they have same code and label
            expect(createdCode2.id, 'Indicator codes should have different IDs').to.not.eq(
              createdCode1.id,
            );

            // Step 3: Retrieve indicator codes for Indicator 1
            cy.getSpecificationIndicatorCodes(indicator1Id).then((getResponse1) => {
              validateApiResponse(getResponse1, 200);
              const codes1 = getResponse1.body.codes;

              expect(codes1, 'Indicator 1 should have exactly 1 code').to.have.length(1);
              const retrievedCode1 = codes1[0];
              expect(retrievedCode1.id).to.eq(indicatorCode1Id);
              expect(retrievedCode1.indicatorId).to.eq(indicator1Id);
              expect(retrievedCode1.code).to.eq('1');
              expect(retrievedCode1.label).to.eq('Code 1 name');

              // Step 4: Retrieve indicator codes for Indicator 2
              cy.getSpecificationIndicatorCodes(indicator2Id).then((getResponse2) => {
                validateApiResponse(getResponse2, 200);
                const codes2 = getResponse2.body.codes;

                expect(codes2, 'Indicator 2 should have exactly 1 code').to.have.length(1);
                const retrievedCode2 = codes2[0];
                expect(retrievedCode2.id).to.eq(indicatorCode2Id);
                expect(retrievedCode2.indicatorId).to.eq(indicator2Id);
                expect(retrievedCode2.code).to.eq('1');
                expect(retrievedCode2.label).to.eq('Code 1 name');

                cy.log(
                  `Successfully created indicator codes for both indicators on local field ${LOCAL_FIELD_TAG}`,
                );
              });
            });
          },
        );
      });
    },
  );
});
