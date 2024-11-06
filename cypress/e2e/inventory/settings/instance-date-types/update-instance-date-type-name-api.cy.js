import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Classification browse', () => {
      let user;
      let originalDateType;

      const testData = {
        totalAmountOfDateTypes: 15,
        dateTypeSource: 'folio',
        keyToUpdate: 'name',
        newName: `Fortlaufende Ressource - Update zur Einstellung der Veröffentlichung ${getRandomPostfix()}`,
      };

      before('Create user, get data', () => {
        cy.getAdminToken();
        cy.getInstanceDateTypesViaAPI().then((response) => {
          originalDateType = response.instanceDateTypes[response.instanceDateTypes.length - 1];
        });
        cy.createTempUser([
          Permissions.getInstanceDateTypes.gui,
          Permissions.patchInstanceDateTypes.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        // restore the original instance date type name
        cy.patchInstanceDateTypeViaAPI(
          originalDateType.id,
          testData.keyToUpdate,
          originalDateType.name,
          true,
        );
        Users.deleteViaApi(user.userId);
      });

      it(
        'C506694 Update of Date type\'s "name" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C506694'] },
        () => {
          cy.getUserToken(user.username, user.password);
          cy.patchInstanceDateTypeViaAPI(
            originalDateType.id,
            testData.keyToUpdate,
            testData.newName,
          ).then(({ status }) => {
            expect(status).to.eq(204);
            cy.getInstanceDateTypesViaAPI().then((response) => {
              expect(response.status).to.eq(200);
              expect(response.instanceDateTypes).to.have.lengthOf(testData.totalAmountOfDateTypes);
              expect(
                response.instanceDateTypes.every((type) => type.source === testData.dateTypeSource),
              ).to.eq(true);
              const updatedDateType = response.instanceDateTypes.filter(
                (type) => type.id === originalDateType.id,
              )[0];
              expect(updatedDateType.name).to.eq(testData.newName);
            });
          });
        },
      );
    });
  });
});
