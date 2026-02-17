import Permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const testData = {
  users: [],
  organizations: {
    org1: {
      ...NewOrganization.defaultUiOrganizations,
      name: `autotest_name_${getRandomPostfix()}_1`,
      code: `${getRandomPostfix()}_1`,
      erpCode: `ERP-${getRandomPostfix()}_1`,
    },
    org2: {
      ...NewOrganization.defaultUiOrganizations,
      name: `autotest_name_${getRandomPostfix()}_2`,
      code: `${getRandomPostfix()}_2`,
      erpCode: `ERP-${getRandomPostfix()}_2`,
    },
  },
};

describe('Organizations', () => {
  before('Create users and organizations', () => {
    cy.getAdminToken();
    cy.createTempUser([Permissions.uiOrganizationsViewEdit.gui]).then((user1) => {
      testData.users[0] = user1;
    });
    cy.createTempUser([Permissions.uiOrganizationsViewEdit.gui]).then((user2) => {
      testData.users[1] = user2;
    });
    NewOrganization.createViaApi(testData.organizations.org1).then((responseOrganization) => {
      testData.organizations.org1.id = responseOrganization.id;
    });
    NewOrganization.createViaApi(testData.organizations.org2).then((responseOrganization) => {
      testData.organizations.org2.id = responseOrganization.id;
    });

    cy.login(testData.users[1].username, testData.users[1].password, {
      path: TopMenu.organizationsPath,
      waiter: Organizations.waitLoading,
    });
    OrganizationsSearchAndFilter.searchByParameters('Name', testData.organizations.org1.name);
    Organizations.checkSearchResults(testData.organizations.org1);
    Organizations.selectOrganization(testData.organizations.org1.name);
    Organizations.editOrganization();
    Organizations.editOrganizationName(testData.organizations.org1);
    Organizations.saveOrganization();
    Organizations.checkOrganizationInfo({
      name: `${testData.organizations.org1.name}-edited`,
      code: testData.organizations.org1.code,
    });

    OrganizationsSearchAndFilter.searchByParameters('Name', testData.organizations.org2.name);
    Organizations.checkSearchResults(testData.organizations.org2);
    Organizations.selectOrganizationInCurrentPage(testData.organizations.org2.name);
    Organizations.editOrganization();
    Organizations.editOrganizationName(testData.organizations.org2);
    Organizations.saveOrganization();
    Organizations.checkOrganizationInfo({
      name: `${testData.organizations.org2.name}-edited`,
      code: testData.organizations.org2.code,
    });

    cy.login(testData.users[0].username, testData.users[0].password, {
      path: TopMenu.organizationsPath,
      waiter: Organizations.waitLoading,
    });
    OrganizationsSearchAndFilter.searchByParameters('Name', testData.organizations.org1.name);
    Organizations.checkSearchResults({ name: `${testData.organizations.org1.name}-edited` });
    Organizations.selectOrganizationInCurrentPage(`${testData.organizations.org1.name}-edited`);
    Organizations.editOrganization();
    Organizations.editOrganizationName({ name: `${testData.organizations.org1.name}-twice` });
    Organizations.saveOrganization();
    Organizations.checkOrganizationInfo({
      name: `${testData.organizations.org1.name}-twice-edited`,
      code: testData.organizations.org1.code,
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
    'C466128 Organizations can be found by "Updated by" filter (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      Organizations.resetFilters();
      OrganizationsSearchAndFilter.filterByUpdater(testData.users[0].username);
      Organizations.selectOrganizationInCurrentPage(
        `${testData.organizations.org1.name}-twice-edited`,
      );
      Organizations.checkOrganizationInfo({
        name: `${testData.organizations.org1.name}-twice-edited`,
        code: testData.organizations.org1.code,
      });
      Organizations.resetFilters();
      OrganizationsSearchAndFilter.filterByUpdater(testData.users[1].username);
      Organizations.selectOrganizationInCurrentPage(`${testData.organizations.org2.name}-edited`);
      Organizations.checkOrganizationInfo({
        name: `${testData.organizations.org2.name}-edited`,
        code: testData.organizations.org2.code,
      });
      Organizations.resetFilters();
      OrganizationsSearchAndFilter.filterByUpdater(testData.users[0].username);
      Organizations.selectOrganizationInCurrentPage(
        `${testData.organizations.org1.name}-twice-edited`,
      );
      Organizations.checkOrganizationInfo({
        name: `${testData.organizations.org1.name}-twice-edited`,
        code: testData.organizations.org1.code,
      });
    },
  );
});
