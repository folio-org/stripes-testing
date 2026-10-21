import getRandomPostfix from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const postfix = getRandomPostfix();
      const slashErrorMessage = 'must match "^[^/]+$"';

      const testData = {
        existingRoleName: `AT_C1559241_Role_${postfix}`,
        existingRoleId: null,
        slashInMiddle: {
          name: `AT_C1559241_Role ${postfix} /1`,
          description: `Role test / 1 ${postfix}`,
        },
        slashTrailing: {
          name: `AT_C1559241_Role ${postfix} 1/`,
          description: `Role test / ${postfix}`,
        },
        slashLeading: {
          name: `/AT_C1559241_Role ${postfix} 1`,
          description: `Role test / ${postfix}`,
        },
        slashOnly: {
          name: '/',
          description: `Role test / ${postfix}`,
        },
        batchStep4: {
          invalidName: `AT_C1559241_Role ${postfix} 2/`,
          invalidDescription: 'Role 2',
          validName: `AT_C1559241_Role ${postfix} 3`,
          validDescription: 'Role 3',
        },
        batchStep5: {
          validName: `AT_C1559241_Role ${postfix} 2`,
          validDescription: 'Role 2',
          invalidName: `/AT_C1559241_Role ${postfix} 3`,
          invalidDescription: 'Role 3',
        },
        batchStep6: {
          invalidName1: `AT_C1559241_Rol${postfix}//e 2`,
          invalidDescription1: 'Role 2',
          invalidName2: `/AT_C1559241_Role ${postfix} 3b`,
          invalidDescription2: 'Role 3',
        },
        updateWithSlash: {
          name: `AT_C1559241_Role ${postfix} /4`,
          description: `Role test / 4 ${postfix}`,
        },
      };

      // Precondition: at least 1 non-default role exists, to be updated in step 7
      before('Create existing role', () => {
        cy.getAdminToken();
        cy.createAuthorizationRoleApi(testData.existingRoleName).then((role) => {
          testData.existingRoleId = role.id;
        });
      });

      after('Delete existing role', () => {
        cy.getAdminToken(false);
        cy.deleteAuthorizationRoleApi(testData.existingRoleId, true);
      });

      // Shared verification for a "errors[]" validation_error response (POST /roles, /roles/batch, PUT /roles/{id}).
      // Compares errors as an unordered set: /roles/batch does not guarantee errors come back
      // in the same order as the "roles" array sent in the request.
      const verifySlashValidationErrors = (body, expectedErrors) => {
        expect(body.errors).to.have.lengthOf(expectedErrors.length);
        const actualErrors = body.errors.map((error) => ({
          code: error.code,
          message: error.message,
          key: error.parameters[0].key,
          value: error.parameters[0].value,
        }));
        const expectedErrorsNormalized = expectedErrors.map(({ key, value }) => ({
          code: 'validation_error',
          message: slashErrorMessage,
          key,
          value,
        }));
        expect(
          actualErrors,
          `Actual errors: ${JSON.stringify(actualErrors)} | Expected errors: ${JSON.stringify(expectedErrorsNormalized)}`,
        ).to.have.deep.members(expectedErrorsNormalized);
      };

      it(
        'C1559241 "/" is rejected on role create and update via API (eureka)',
        { tags: ['extendedPath', 'eureka', 'C1559241'] },
        () => {
          // Step 1: POST /roles with "/" in the middle of the name → 400 validation_error on "name"
          cy.createAuthorizationRoleApi(
            testData.slashInMiddle.name,
            testData.slashInMiddle.description,
            null,
            true,
          ).then((body) => {
            verifySlashValidationErrors(body, [
              { key: 'name', value: testData.slashInMiddle.name },
            ]);
          });

          // Step 2: GET /roles?limit=100 → rejected role from step 1 is not among the returned roles
          cy.getAuthorizationRoles({ limit: 100 }).then((roles) => {
            expect(roles.map((role) => role.name)).to.not.include(testData.slashInMiddle.name);
          });

          // Step 3: repeat step 1 with "/" trailing, leading, and standalone → same 400 each time
          [testData.slashTrailing, testData.slashLeading, testData.slashOnly].forEach(
            (rejectedRole) => {
              cy.createAuthorizationRoleApi(
                rejectedRole.name,
                rejectedRole.description,
                null,
                true,
              ).then((body) => {
                verifySlashValidationErrors(body, [{ key: 'name', value: rejectedRole.name }]);
              });
            },
          );

          // Step 4: POST /roles/batch, first role name has trailing "/" → 400 on "roles[0].name"
          cy.createAuthorizationRolesBatchApi(
            [
              {
                name: testData.batchStep4.invalidName,
                description: testData.batchStep4.invalidDescription,
              },
              {
                name: testData.batchStep4.validName,
                description: testData.batchStep4.validDescription,
              },
            ],
            true,
          ).then(({ status, body }) => {
            expect(status).to.eq(400);
            verifySlashValidationErrors(body, [
              { key: 'roles[0].name', value: testData.batchStep4.invalidName },
            ]);
          });

          // Step 5: POST /roles/batch, second role name has leading "/" → 400 on "roles[1].name"
          cy.createAuthorizationRolesBatchApi(
            [
              {
                name: testData.batchStep5.validName,
                description: testData.batchStep5.validDescription,
              },
              {
                name: testData.batchStep5.invalidName,
                description: testData.batchStep5.invalidDescription,
              },
            ],
            true,
          ).then(({ status, body }) => {
            expect(status).to.eq(400);
            verifySlashValidationErrors(body, [
              { key: 'roles[1].name', value: testData.batchStep5.invalidName },
            ]);
          });

          // Step 6: POST /roles/batch, both role names invalid → 400 with 2 validation_error entries
          cy.createAuthorizationRolesBatchApi(
            [
              {
                name: testData.batchStep6.invalidName1,
                description: testData.batchStep6.invalidDescription1,
              },
              {
                name: testData.batchStep6.invalidName2,
                description: testData.batchStep6.invalidDescription2,
              },
            ],
            true,
          ).then(({ status, body }) => {
            expect(status).to.eq(400);
            verifySlashValidationErrors(body, [
              { key: 'roles[0].name', value: testData.batchStep6.invalidName1 },
              { key: 'roles[1].name', value: testData.batchStep6.invalidName2 },
            ]);
          });

          // Step 7: PUT /roles/{existing role id} with "/" in the name → 400 validation_error on "name"
          cy.updateAuthorizationRoleApi(testData.existingRoleId, {
            name: testData.updateWithSlash.name,
            description: testData.updateWithSlash.description,
          }).then(({ status, body }) => {
            expect(status).to.eq(400);
            verifySlashValidationErrors(body, [
              { key: 'name', value: testData.updateWithSlash.name },
            ]);
          });
        },
      );
    });
  });
});
