import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';

const testData = {
  user: null,
  organization: {
    ...NewOrganization.defaultUiOrganizations,
  },
};
const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
const d = new Date();
d.setDate(d.getDate() - 1);
const yesterday = DateTools.getFormattedDate({ date: d }, 'MM/DD/YYYY');

describe('Organizations', () => {
  before('Create user and organization', () => {
    cy.getAdminToken();
    NewOrganization.createViaApi(testData.organization).then((responseOrganization) => {
      testData.organization.id = responseOrganization.id;

      cy.loginAsAdmin({
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
      OrganizationsSearchAndFilter.searchByParameters('Name', testData.organization.name);
      Organizations.checkSearchResults(testData.organization);
      Organizations.selectOrganization(testData.organization.name);
      Organizations.editOrganization();
      Organizations.editOrganizationName(testData.organization);
      Organizations.saveOrganization();
      Organizations.checkOrganizationInfo({
        name: `${testData.organization.name}-edited`,
        code: testData.organization.code,
      });
    });

    cy.createTempUser([Permissions.uiOrganizationsView.gui]).then((user) => {
      testData.user = user;

      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C466131 Organizations can be found by "Date updated" filter (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      OrganizationsSearchAndFilter.filterByDateUpdated(today, today);
      OrganizationsSearchAndFilter.searchByParameters('Name', testData.organization.name);
      Organizations.checkSearchResults({ name: `${testData.organization.name}-edited` });
      OrganizationsSearchAndFilter.resetFilters();
      OrganizationsSearchAndFilter.filterByDateUpdated('01/01/2000', '12/31/2000');
      Organizations.checkZeroSearchResultsHeader();
      OrganizationsSearchAndFilter.filterByDateUpdated(today, yesterday);
      Organizations.checkInvalidDateRangeMessage();
      OrganizationsSearchAndFilter.filterByDateUpdated(yesterday, today);
      OrganizationsSearchAndFilter.searchByParameters('Name', testData.organization.name);
      Organizations.checkSearchResults({ name: `${testData.organization.name}-edited` });
    },
  );
});
