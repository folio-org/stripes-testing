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
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Users', () => {
  describe('Settings (Users)', () => {
    const testData = {
      user: {},
      firstPatronGroup: {
        name: `groupName ${getRandomPostfix()}`,
        id: null,
      },
      secondPatronGroup: {
        name: `groupName ${getRandomPostfix()}`,
        id: null,
      },
    };

    before('Create user and login', () => {
      cy.getAdminToken();
      PatronGroups.createViaApi(testData.firstPatronGroup.name).then(() => {
        PatronGroups.getGroupViaApi({ query: `group="${testData.firstPatronGroup.name}"` }).then(
          (resp) => {
            testData.firstPatronGroup.desc = resp.desc;
          },
        );
      });
      PatronGroups.createViaApi(testData.secondPatronGroup.name).then(() => {
        PatronGroups.getGroupViaApi({ query: `group="${testData.secondPatronGroup.name}"` }).then(
          (resp) => {
            testData.secondPatronGroup.desc = resp.desc;
            testData.secondPatronGroup.id = resp.id;
          },
        );

        cy.createTempUser([], testData.secondPatronGroup.name).then((userProperties) => {
          testData.userWithPatronGroup = userProperties;
        });
      });

      cy.createTempUser([Permissions.uiUsersCreateEditRemovePatronGroups.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password);
          cy.visit(SettingsMenu.usersPath);
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      Users.deleteViaApi(testData.userWithPatronGroup.userId);
      PatronGroups.deleteViaApi(testData.secondPatronGroup.id);
    });

    it(
      'C514946 Patron group can be deleted only if it has no users assigned (volaris)',
      { tags: ['criticalPath', 'volaris'] },
      () => {
        UsersSettingsGeneral.checkUserSectionOptionExists('Patron groups');
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsUsers.goToSettingsUsers();
        SettingsUsers.selectSettingsTab(SETTINGS_TABS.PATRON_GROUPS);
        PatronGroups.waitLoading();
        PatronGroups.verifyPatronGroupsPane();
        PatronGroups.verifyActionsCells();
        PatronGroups.clickTrashButtonForGroup(testData.firstPatronGroup.name);
        PatronGroups.verifyDeletePatronGroupModal();
        PatronGroups.clickModalCancelButton();
        PatronGroups.verifyGroupInTheList({
          name: testData.firstPatronGroup.name,
          description: testData.firstPatronGroup.desc,
          actions: ['edit', 'trash'],
        });
        PatronGroups.clickTrashButtonForGroup(testData.firstPatronGroup.name);
        PatronGroups.verifyDeletePatronGroupModal();
        PatronGroups.clickModalDeleteButton();
        PatronGroups.verifyGroupAbsentInTheList({
          name: testData.firstPatronGroup.name,
        });
        InteractorsTools.checkCalloutMessage(
          `The Patron group ${testData.firstPatronGroup.name} was successfully deleted`,
        );

        PatronGroups.clickTrashButtonForGroup(testData.secondPatronGroup.name);
        PatronGroups.verifyDeletePatronGroupModal();
        PatronGroups.clickModalDeleteButton();
        PatronGroups.verifyCannotDeletePatronGroupModal();
        PatronGroups.clickModalOkayButton();
        PatronGroups.verifyGroupInTheList({
          name: testData.secondPatronGroup.name,
          description: testData.secondPatronGroup.desc,
          actions: ['edit', 'trash'],
        });
      },
    );
  });
});
