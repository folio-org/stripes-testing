import permissions from '../../../support/dictionary/permissions';
import Groups from '../../../support/fragments/finance/groups/groups';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Finance', () => {
  describe('Groups', () => {
    const testData = {
      groups: [],
      user: {},
      expectedTitles: {
        default: 'Finance - FOLIO',
        searchResultsGroup1: '',
        detailsGroup1: '',
        detailsGroup2: '',
      },
    };

    before('Create test data', () => {
      cy.getAdminToken();

      const group1 = Groups.getDefaultGroup();
      group1.name = `AutoTest_Group1_${getRandomPostfix()}`;
      const group2 = Groups.getDefaultGroup();
      group2.name = `AutoTest_Group2_${getRandomPostfix()}`;

      Groups.createViaApi(group1).then((groupResponse1) => {
        testData.groups[0] = groupResponse1;
        testData.expectedTitles.searchResultsGroup1 = `Finance - ${groupResponse1.name} - Search - FOLIO`;
        testData.expectedTitles.detailsGroup1 = `Finance - ${groupResponse1.name} - FOLIO`;

        Groups.createViaApi(group2).then((groupResponse2) => {
          testData.groups[1] = groupResponse2;
          testData.expectedTitles.detailsGroup2 = `Finance - ${groupResponse2.name} - FOLIO`;
        });
      });

      cy.createTempUser([permissions.uiFinanceViewGroups.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.groupsPath,
          waiter: Groups.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        testData.groups.forEach((group) => {
          Groups.deleteGroupViaApi(group.id);
        });
      });
    });

    it(
      'C451610 Correct page title in Group tab when Group details pane is opened ("Finance" app) (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C451610'] },
      () => {
        Groups.checkPageTitle(testData.expectedTitles.default);

        Groups.searchByName(testData.groups[0].name);

        Groups.checkPageTitle(testData.expectedTitles.searchResultsGroup1);
        Groups.checkSearchResults(testData.groups[0].name);

        Groups.selectGroup(testData.groups[0].name);
        Groups.checkPageTitle(testData.expectedTitles.detailsGroup1);

        Groups.closeDetailsPane();
        Groups.checkPageTitle(testData.expectedTitles.searchResultsGroup1);

        Groups.clickResetAll();
        Groups.verifySearchFieldIsEmpty();
        Groups.checkPageTitle(testData.expectedTitles.default);

        Groups.filterByStatus('Active');
        Groups.checkCreatedInList(testData.groups[0].name);
        Groups.checkCreatedInList(testData.groups[1].name);

        Groups.selectGroup(testData.groups[0].name);
        Groups.checkPageTitle(testData.expectedTitles.detailsGroup1);

        Groups.selectGroup(testData.groups[1].name);
        Groups.checkPageTitle(testData.expectedTitles.detailsGroup2);

        // Note: TestRail steps: 11 and 6 (verifying bookmark name) cannot be automated in Cypress
        // as it requires interaction with browser native UI elements (bookmarks/favorites)
        // which are outside the scope of web application testing
      },
    );
  });
});
