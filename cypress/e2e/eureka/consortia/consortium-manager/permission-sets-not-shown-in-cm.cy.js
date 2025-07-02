import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const usersPaneName = 'Users';
    const expectedOptionNames = ['Patron groups', 'Departments'];
    const permissionSetsOptionName = 'Permission sets';

    it(
      'C566123 ECS | Eureka | “Permission sets” heading is not shown in "Users" settings in "Consortium manager" app (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C566123'] },
      () => {
        cy.resetTenant();
        cy.loginAsAdmin();
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.openListInSettings(usersPaneName);
        // Assert that the Users pane is present and contains Patron groups and Departments
        expectedOptionNames.forEach((option) => {
          ConsortiumManagerApp.checkOptionInOpenedPane(usersPaneName, option);
        });
        // Assert that Permission sets is NOT present
        ConsortiumManagerApp.checkOptionInOpenedPane(
          usersPaneName,
          permissionSetsOptionName,
          false,
        );
      },
    );
  });
});
