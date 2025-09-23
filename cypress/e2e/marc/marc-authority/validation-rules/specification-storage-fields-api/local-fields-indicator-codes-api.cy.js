/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - Local Fields Indicator Codes API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageUpdateSpecificationField.gui,
    Permissions.specificationStorageDeleteSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageUpdateSpecificationIndicatorCode.gui,
    Permissions.specificationStorageDeleteSpecificationIndicatorCode.gui,
  ];

  let user;
  let authoritySpecId;
  let localFieldId;

  function validateApiResponse(response, expectedStatus) {
    expect(response.status).to.eq(expectedStatus);
  }

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificationIds().then((specs) => {
        const authoritySpec = specs.find((s) => s.profile === 'authority');
        expect(authoritySpec, 'MARC authority specification exists').to.exist;
        authoritySpecId = authoritySpec.id;
      });
    });
  });

  beforeEach('Create local field for test', () => {
    // Ensure token is set for the user before API calls
    cy.getUserToken(user.username, user.password);

    // Get current test title to determine which field to create
    const testId = Cypress.currentTest.title.match(/C\d+/)?.[0] || '';
    const label = `AT_${testId}_Test Local Field`;
    const tag = '889';
    const localFieldData = {
      tag,
      label,
      url: 'http://www.example.org/field-test.html',
      repeatable: true,
      required: false,
      deprecated: false,
    };

    // Clean up any existing field with the same tag first
    cy.getSpecificationFields(authoritySpecId).then((fieldsResp) => {
      validateApiResponse(fieldsResp, 200);
      const existingField = fieldsResp.body.fields.find(
        (f) => f.tag === tag && f.scope === 'local',
      );
      if (existingField) {
        cy.deleteSpecificationField(existingField.id, false);
      }
    });

    // Create the local field
    cy.createSpecificationField(authoritySpecId, localFieldData).then((createResp) => {
      validateApiResponse(createResp, 201);
      localFieldId = createResp.body.id;
    });
  });

  afterEach('Delete local field and cleanup', () => {
    if (localFieldId) {
      cy.deleteSpecificationField(localFieldId, true).then((deleteResp) => {
        validateApiResponse(deleteResp, 204);
      });
      localFieldId = null;
    }
  });

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C499697 Create Indicator Code of Local Field for MARC authority spec (API) (spitfire)',
    { tags: ['criticalPath', 'C499697', 'spitfire'] },
    () => {
      let firstIndicatorId;
      let secondIndicatorId;
      let firstIndicatorCodeId;
      let secondIndicatorCodeId;

      const firstIndicatorPayload = {
        order: 1,
        label: 'Ind 1 name',
      };

      cy.createSpecificationFieldIndicator(localFieldId, firstIndicatorPayload).then(
        (firstIndicatorResp) => {
          validateApiResponse(firstIndicatorResp, 201);
          firstIndicatorId = firstIndicatorResp.body.id;

          const secondIndicatorPayload = {
            order: 2,
            label: 'Ind 2 name',
          };

          cy.createSpecificationFieldIndicator(localFieldId, secondIndicatorPayload).then(
            (secondIndicatorResp) => {
              validateApiResponse(secondIndicatorResp, 201);
              secondIndicatorId = secondIndicatorResp.body.id;

              // Step 1: Create indicator code for first indicator
              const firstIndicatorCodePayload = {
                code: '1',
                label: 'Code 1 name',
              };

              cy.createSpecificationIndicatorCode(
                firstIndicatorId,
                firstIndicatorCodePayload,
                true,
              ).then((firstCodeResp) => {
                validateApiResponse(firstCodeResp, 201);
                firstIndicatorCodeId = firstCodeResp.body.id;

                // Verify response body structure for first indicator code
                expect(firstCodeResp.body).to.include({
                  indicatorId: firstIndicatorId,
                  code: firstIndicatorCodePayload.code,
                  label: firstIndicatorCodePayload.label,
                  deprecated: false,
                  scope: 'local',
                });
                expect(firstCodeResp.body.id, 'First indicator code has ID').to.exist;
                expect(firstCodeResp.body.metadata, 'First indicator code has metadata').to.exist;

                // Step 2: Create indicator code for second indicator
                const secondIndicatorCodePayload = {
                  code: '2',
                  label: 'Code 2 name',
                };

                cy.createSpecificationIndicatorCode(
                  secondIndicatorId,
                  secondIndicatorCodePayload,
                  true,
                ).then((secondCodeResp) => {
                  validateApiResponse(secondCodeResp, 201);
                  secondIndicatorCodeId = secondCodeResp.body.id;

                  // Verify response body structure for second indicator code
                  expect(secondCodeResp.body).to.include({
                    indicatorId: secondIndicatorId,
                    code: secondIndicatorCodePayload.code,
                    label: secondIndicatorCodePayload.label,
                    deprecated: false,
                    scope: 'local',
                  });
                  expect(secondCodeResp.body.id, 'Second indicator code has ID').to.exist;
                  expect(secondCodeResp.body.metadata, 'Second indicator code has metadata').to
                    .exist;

                  // Step 3: Verify first indicator codes exist via GET request
                  cy.getSpecificationIndicatorCodes(firstIndicatorId).then((firstGetResp) => {
                    validateApiResponse(firstGetResp, 200);

                    // Response body should contain the created indicator code for first indicator
                    expect(firstGetResp.body.codes, 'First indicator codes array exists').to.exist;
                    expect(firstGetResp.body.codes, 'First indicator has one code').to.have.length(
                      1,
                    );

                    const foundFirstCode = firstGetResp.body.codes.find(
                      (code) => code.id === firstIndicatorCodeId,
                    );
                    expect(foundFirstCode, 'First indicator code found in response').to.exist;
                    expect(foundFirstCode).to.include({
                      indicatorId: firstIndicatorId,
                      code: firstIndicatorCodePayload.code,
                      label: firstIndicatorCodePayload.label,
                      deprecated: false,
                      scope: 'local',
                    });

                    // Step 4: Verify second indicator codes exist via GET request
                    cy.getSpecificationIndicatorCodes(secondIndicatorId).then((secondGetResp) => {
                      validateApiResponse(secondGetResp, 200);

                      // Response body should contain the created indicator code for second indicator
                      expect(secondGetResp.body.codes, 'Second indicator codes array exists').to
                        .exist;
                      expect(
                        secondGetResp.body.codes,
                        'Second indicator has one code',
                      ).to.have.length(1);

                      const foundSecondCode = secondGetResp.body.codes.find(
                        (code) => code.id === secondIndicatorCodeId,
                      );
                      expect(foundSecondCode, 'Second indicator code found in response').to.exist;
                      expect(foundSecondCode).to.include({
                        indicatorId: secondIndicatorId,
                        code: secondIndicatorCodePayload.code,
                        label: secondIndicatorCodePayload.label,
                        deprecated: false,
                        scope: 'local',
                      });
                    });
                  });
                });
              });
            },
          );
        },
      );
    },
  );

  it(
    'C502996 Update Indicator Code of Local Field for MARC authority spec (API) (spitfire)',
    { tags: ['extendedPath', 'C502996', 'spitfire'] },
    () => {
      let localFieldIndicator;
      let indicatorCode;

      // Step 1: Create indicator for the local field
      cy.createSpecificationFieldIndicator(localFieldId, {
        order: 1,
        label: 'AT_C502996_Test Indicator',
      }).then((indicatorResp) => {
        validateApiResponse(indicatorResp, 201);
        localFieldIndicator = indicatorResp.body;

        // Step 2: Create indicator code for the local field indicator
        const initialIndicatorCodeData = {
          code: '0',
          label: 'AT_C502996_Initial Code',
          deprecated: false,
        };

        cy.createSpecificationIndicatorCode(
          localFieldIndicator.id,
          initialIndicatorCodeData,
          true,
        ).then((codeResp) => {
          validateApiResponse(codeResp, 201);
          indicatorCode = codeResp.body;
          expect(indicatorCode.code, 'Indicator code created with correct code').to.eq(
            initialIndicatorCodeData.code,
          );
          expect(indicatorCode.label, 'Indicator code created with correct label').to.eq(
            initialIndicatorCodeData.label,
          );
          expect(
            indicatorCode.deprecated,
            'Indicator code created with correct deprecated flag',
          ).to.eq(initialIndicatorCodeData.deprecated);

          // Step 3: Update the indicator code with new values
          const updatePayload = {
            code: '1',
            label: 'AT_C502996_Updated Code Label',
            deprecated: true,
          };

          cy.updateSpecificationIndicatorCode(indicatorCode.id, updatePayload, true).then(
            (updateResp) => {
              validateApiResponse(updateResp, 202);
              expect(updateResp.body.code, 'Updated code field correctly').to.eq(
                updatePayload.code,
              );
              expect(updateResp.body.label, 'Updated label field correctly').to.eq(
                updatePayload.label,
              );
              expect(updateResp.body.deprecated, 'Updated deprecated field correctly').to.eq(
                updatePayload.deprecated,
              );

              // Step 4: Verify the indicator code was updated via GET request
              cy.getSpecificationIndicatorCodes(localFieldIndicator.id).then((verifyResp) => {
                validateApiResponse(verifyResp, 200);

                const updatedCode = verifyResp.body.codes.find(
                  (code) => code.id === indicatorCode.id,
                );
                expect(updatedCode, 'Updated indicator code exists in response').to.exist;
                expect(updatedCode.code, 'Verified updated code field').to.eq(updatePayload.code);
                expect(updatedCode.label, 'Verified updated label field').to.eq(
                  updatePayload.label,
                );
                expect(updatedCode.deprecated, 'Verified updated deprecated field').to.eq(
                  updatePayload.deprecated,
                );
              });
            },
          );
        });
      });
    },
  );

  it(
    'C503104 Delete Indicator Code of Local Field for MARC authority spec (API) (spitfire)',
    { tags: ['criticalPath', 'C503104', 'spitfire'] },
    () => {
      let localFieldIndicator;
      let indicatorCode1;
      let indicatorCode2;

      // Step 1: Create indicator for the local field
      cy.createSpecificationFieldIndicator(localFieldId, {
        order: 1,
        label: 'AT_C503104_Test Indicator',
      }).then((indicatorResp) => {
        validateApiResponse(indicatorResp, 201);
        localFieldIndicator = indicatorResp.body;

        // Step 2: Create first indicator code
        cy.createSpecificationIndicatorCode(
          localFieldIndicator.id,
          {
            code: '0',
            label: 'First indicator code',
            deprecated: false,
          },
          true,
        ).then((code1Resp) => {
          validateApiResponse(code1Resp, 201);
          indicatorCode1 = code1Resp.body;

          // Step 3: Create second indicator code
          cy.createSpecificationIndicatorCode(
            localFieldIndicator.id,
            {
              code: '1',
              label: 'Second indicator code',
              deprecated: false,
            },
            true,
          ).then((code2Resp) => {
            validateApiResponse(code2Resp, 201);
            indicatorCode2 = code2Resp.body;

            // Step 4: Delete first indicator code of local field
            cy.deleteSpecificationIndicatorCode(indicatorCode1.id, true).then((deleteResp) => {
              validateApiResponse(deleteResp, 204);

              // Step 5: Verify indicator code was deleted and second one still exists
              cy.getSpecificationIndicatorCodes(localFieldIndicator.id).then((verifyResp) => {
                validateApiResponse(verifyResp, 200);

                // Should have one less indicator code now
                expect(verifyResp.body.codes).to.have.length(1);

                // The remaining code should be the second one
                const remainingCode = verifyResp.body.codes[0];
                expect(remainingCode.id).to.eq(indicatorCode2.id);
                expect(remainingCode.code).to.eq('1');
                expect(remainingCode.label).to.eq('Second indicator code');
                expect(remainingCode.deprecated).to.eq(false);

                // Verify the deleted code is not in the response
                const deletedCodeExists = verifyResp.body.codes.some(
                  (code) => code.id === indicatorCode1.id,
                );
                expect(deletedCodeExists, 'Deleted indicator code should not exist').to.be.false;
              });
            });
          });
        });
      });
    },
  );
});
