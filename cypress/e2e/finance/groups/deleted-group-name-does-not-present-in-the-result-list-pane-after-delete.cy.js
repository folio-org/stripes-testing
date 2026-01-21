import permissions from '../../../support/dictionary/permissions';
import Groups from '../../../support/fragments/finance/groups/groups';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Finance', () => {
  const testData = {
    group: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();
    const group = Groups.getDefaultGroup();
    Groups.createViaApi(group).then((groupResponse) => {
      testData.group = groupResponse;
    });

    cy.createTempUser([permissions.uiFinanceViewEditDeleteGroups.gui]).then((userProperties) => {
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
    });
  });

  it(
    'C357526 Deleted Group name does not appear in the result list pane after deletion (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C357526'] },
    () => {
      Groups.searchByName(testData.group.name);
      Groups.selectGroup(testData.group.name);
      Groups.deleteGroupViaActions();
      InteractorsTools.checkCalloutMessage('Group has been deleted');
      Groups.waitLoading();
      Groups.searchByName(testData.group.name);
      Groups.checkZeroSearchResultsHeader();
    },
  );
});
