import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import SettingsUsers, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/users/settingsUsers';
import UsersSettingsGeneral from '../../../support/fragments/settings/users/usersSettingsGeneral';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Users', () => {
  describe('Settings (Users)', () => {
    const testData = {
      user: {},
      firstPatronGroup: {
        name: `a_groupName ${getRandomPostfix()}`,
        id: null,
      },
      secondPatronGroup: {
        name: `b_groupName ${getRandomPostfix()}`,
        id: null,
      },
    };

    before('Create user and login', () => {
      cy.getAdminToken();
      PatronGroups.createViaApi(testData.firstPatronGroup.name).then((patronGroupResponse) => {
        testData.firstPatronGroup.id = patronGroupResponse;
      });
      PatronGroups.createViaApi(testData.secondPatronGroup.name).then((patronGroupResponse) => {
        testData.secondPatronGroup.id = patronGroupResponse;
      });

      cy.createTempUser([Permissions.uiUsersViewPatronGroups.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.usersPath,
          waiter: () => cy.wait(1000),
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      PatronGroups.deleteViaApi(testData.firstPatronGroup.id);
      PatronGroups.deleteViaApi(testData.secondPatronGroup.id);
    });

    it('C514997 View patron groups (volaris)', { tags: ['smoke', 'volaris', 'C514997'] }, () => {
      UsersSettingsGeneral.checkUserSectionOptionExists('Patron groups');
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      SettingsUsers.goToSettingsUsers();
      SettingsUsers.selectSettingsTab(SETTINGS_TABS.PATRON_GROUPS);
      PatronGroups.waitLoading();
      PatronGroups.verifyPatronGroupsSortingOrder();
      PatronGroups.verifyPatronGroupsPane();
      PatronGroups.verifyActionsCells();
    });
  });
});
