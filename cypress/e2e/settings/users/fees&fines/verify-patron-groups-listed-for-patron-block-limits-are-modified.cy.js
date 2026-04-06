import { APPLICATION_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import Limits from '../../../../support/fragments/settings/users/limits';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import SettingsUsers, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/users/settingsUsers';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Fees&Fines', () => {
  describe('Settings Users (Fee/fine)', () => {
    const testData = {
      user: {},
      patronGroup: {
        name: `AT_GroupLimits_${getRandomPostfix()}`,
      },
      newPatronGroup: {
        name: `AT_NewGroup_${getRandomPostfix()}`,
      },
      renamedPatronGroup: {
        name: `AT_RenamedGroup_${getRandomPostfix()}`,
      },
    };

    before('Preconditions', () => {
      cy.createTempUser([
        Permissions.uiUsersCreateEditRemovePatronGroups.gui,
        Permissions.uiUsersCreatePatronLimits.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        PatronGroups.createViaApi(testData.patronGroup.name).then((groupId) => {
          testData.patronGroup.id = groupId;
        });

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.limitsPath,
          waiter: Limits.waitLoading,
        });
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      // The original patronGroup was renamed in step 3, so delete by stored id
      PatronGroups.deleteViaApi(testData.patronGroup.id);
    });

    it(
      'C11080 Verify that patron groups listed for patron block limits are modified when changes made at Settings>Users>Patron groups (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C11080'] },
      () => {
        // Step 1: Go to Settings > Users > Patron blocks > Limits
        // Already on Limits page from login
        Limits.verifyGroupDisplayed(testData.patronGroup.name);

        // Step 2: Create a new patron group and verify it appears in Limits with blank fields
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.USERS);
        SettingsUsers.selectSettingsTab(SETTINGS_TABS.PATRON_GROUPS);
        PatronGroups.waitLoading();
        PatronGroups.create(testData.newPatronGroup.name);
        InteractorsTools.checkCalloutMessage(
          `The Patron group ${testData.newPatronGroup.name} was successfully created`,
        );
        cy.wait(2000); // Wait for backend to propagate the new group

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.limitsPath,
          waiter: Limits.waitLoading,
        });
        Limits.verifyGroupDisplayed(testData.newPatronGroup.name);
        Limits.selectGroup(testData.newPatronGroup.name);
        Limits.verifyLimitsAreEmpty();

        // Step 3: Rename an existing patron group and verify the renamed group appears in Limits
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.USERS);
        SettingsUsers.selectSettingsTab(SETTINGS_TABS.PATRON_GROUPS);
        PatronGroups.waitLoading();
        PatronGroups.clickEditButtonForGroup(testData.patronGroup.name);
        PatronGroups.fillPatronGroupName(testData.renamedPatronGroup.name);
        PatronGroups.clickSaveButton();
        InteractorsTools.checkCalloutMessage(
          `The Patron group ${testData.renamedPatronGroup.name} was successfully updated`,
        );
        cy.wait(2000); // Wait for backend to propagate the rename

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.limitsPath,
          waiter: Limits.waitLoading,
        });
        cy.wait(1000); // Additional wait for page to fully refresh
        Limits.verifyGroupDisplayed(testData.renamedPatronGroup.name);

        // Step 4: Delete a patron group and verify it no longer appears in Limits
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.USERS);
        SettingsUsers.selectSettingsTab(SETTINGS_TABS.PATRON_GROUPS);
        PatronGroups.waitLoading();
        PatronGroups.clickTrashButtonForGroup(testData.newPatronGroup.name);
        PatronGroups.clickModalDeleteButton();
        InteractorsTools.checkCalloutMessage(
          `The Patron group ${testData.newPatronGroup.name} was successfully deleted`,
        );
        cy.wait(2000); // Wait for backend to propagate the deletion

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.limitsPath,
          waiter: Limits.waitLoading,
        });
        cy.wait(1000); // Additional wait for page to fully refresh
        Limits.verifyGroupNotDisplayed(testData.newPatronGroup.name);
      },
    );
  });
});
