import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import Affiliations from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Date type', () => {
      describe('Consortia', () => {
        const testData = {
          totalAmountOfDateTypes: 15,
          dateTypeSource: 'folio',
          keyToUpdate: 'name',
          newName: `Fortlaufende Ressource - Update zur Einstellung der Veröffentlichung ${getRandomPostfix()}`,
          errorMessageText: "Action ‘UPDATE' is not supported for consortium member tenant.",
        };
        let user;
        let originalDateType;

        before('Create user, authorize', () => {
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.getInstanceDateTypes.gui,
            Permissions.patchInstanceDateTypes.gui,
          ])
            .then((userProperties) => {
              user = userProperties;
            })
            .then(() => {
              cy.assignAffiliationToUser(Affiliations.College, user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.getInstanceDateTypes.gui,
                Permissions.patchInstanceDateTypes.gui,
              ]);
              cy.resetTenant();
              cy.getToken(user.username, user.password, false);
              cy.setTenant(Affiliations.College);
              cy.getInstanceDateTypesViaAPI().then((response) => {
                originalDateType =
                  response.instanceDateTypes[response.instanceDateTypes.length - 2];
              });
            });
        });

        after('Delete user', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.patchInstanceDateTypeViaAPI(
            originalDateType.id,
            testData.keyToUpdate,
            originalDateType.name,
            true,
          );
          Users.deleteViaApi(user.userId);
        });

        it(
          'C506702 Update of Date type\'s "name" from Member tenant is forbidden (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C506702'] },
          () => {
            cy.patchInstanceDateTypeViaAPI(
              originalDateType.id,
              testData.keyToUpdate,
              testData.newName,
              true,
            ).then(({ status, body }) => {
              expect(status).to.eq(400);
              expect(body).to.include(testData.errorMessageText);

              cy.getInstanceDateTypesViaAPI().then((responseMember) => {
                expect(responseMember.status).to.eq(200);
                expect(responseMember.instanceDateTypes).to.have.lengthOf(
                  testData.totalAmountOfDateTypes,
                );
                expect(
                  responseMember.instanceDateTypes.every(
                    (type) => type.source === testData.dateTypeSource,
                  ),
                ).to.eq(true);
                const matchedDateTypeMember = responseMember.instanceDateTypes.filter(
                  (type) => type.id === originalDateType.id,
                )[0];
                expect(matchedDateTypeMember.name).to.eq(originalDateType.name);

                cy.resetTenant();
                cy.getInstanceDateTypesViaAPI().then((responseCentral) => {
                  expect(responseCentral.status).to.eq(200);
                  expect(responseCentral.instanceDateTypes).to.have.lengthOf(
                    testData.totalAmountOfDateTypes,
                  );
                  expect(
                    responseCentral.instanceDateTypes.every(
                      (type) => type.source === testData.dateTypeSource,
                    ),
                  ).to.eq(true);
                  const matchedDateTypeCentral = responseCentral.instanceDateTypes.filter(
                    (type) => type.id === originalDateType.id,
                  )[0];
                  expect(matchedDateTypeCentral.name).to.eq(originalDateType.name);
                });
              });
            });
          },
        );
      });
    });
  });
});
