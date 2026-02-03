import { Permissions } from '../../support/dictionary';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  const testData = {
    users: [],
    organizations: {
      org1: {
        ...newOrganization.defaultUiOrganizations,
        name: `autotest_name_${getRandomPostfix()}_1`,
        code: `${getRandomPostfix()}_1`,
        erpCode: `ERP-${getRandomPostfix()}_1`,
      },
      org2: {
        ...newOrganization.defaultUiOrganizations,
        name: `autotest_name_${getRandomPostfix()}_2`,
        code: `${getRandomPostfix()}_2`,
        erpCode: `ERP-${getRandomPostfix()}_2`,
      },
    },
  };

  before('Create users and organizations', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([Permissions.uiOrganizationsViewEditCreate.gui]).then((user1) => {
        testData.users[0] = user1;
        cy.createTempUser([Permissions.uiOrganizationsViewEditCreate.gui]).then((user2) => {
          testData.users[1] = user2;

          cy.login(user1.username, user1.password, {
            path: TopMenu.organizationsPath,
            waiter: Organizations.waitLoading,
          });
          NewOrganization.createViaApi(testData.organizations.org1).then((responseOrganization) => {
            testData.organizations.org1.id = responseOrganization.id;
          });
          cy.logout();

          cy.login(user2.username, user2.password, {
            path: TopMenu.organizationsPath,
            waiter: Organizations.waitLoading,
          });
          NewOrganization.createViaApi(testData.organizations.org2).then((responseOrganization) => {
            testData.organizations.org2.id = responseOrganization.id;
          });
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organizations.org1.id);
    Organizations.deleteOrganizationViaApi(testData.organizations.org2.id);
    Users.deleteViaApi(testData.users[0].userId);
    Users.deleteViaApi(testData.users[1].userId);
  });

  it(
    'C466127 Organizations can be found by "Created by" filter (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C466127'] },
    () => {
      Organizations.resetFiltersIfActive();
      Organizations.selectCreatedByFiler(testData.users[0].username);
      Organizations.selectOrganization(testData.organizations.org1.name);
      Organizations.checkOrganizationInfo(testData.organizations.org1);
      Organizations.resetFilters();
      Organizations.selectCreatedByFiler(testData.users[1].username);
      Organizations.selectOrganization(testData.organizations.org2.name);
      Organizations.checkOrganizationInfo(testData.organizations.org2);
    },
  );
});
