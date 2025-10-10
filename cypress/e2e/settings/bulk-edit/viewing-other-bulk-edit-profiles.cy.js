import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../support/constants';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import UsersBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/usersBulkEditProfilesPane';
import UsersBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/usersBulkEditProfileView';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import {
  createBulkEditProfileBody,
  ActionCreators,
  UsersRules,
} from '../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

let user;

const createUsersProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C740207_UsersProfile_${getRandomPostfix()}`,
    description: 'Test users profile for viewing verification',
    locked: false,
    entityType: 'USER',
    ruleDetails: [
      UsersRules.createPatronGroupRule(ActionCreators.replaceWith(null)), // Will be set dynamically
    ],
  });
};

const testData = {
  usersProfileName: null,
  profileDescription: 'Test users profile for viewing verification',
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditSettingsView.gui,
        Permissions.bulkEditSettingsDelete.gui,
        Permissions.bulkEditSettingsLockEdit.gui,
        Permissions.bulkEditUpdateRecords.gui,
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditCsvEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getAdminSourceRecord().then((record) => {
          testData.adminSourceRecord = record;
        });

        cy.getUserGroups({
          limit: 1,
          query: 'group=="faculty"',
        }).then((userPatronGroupId) => {
          const usersProfile = createUsersProfileBody();
          usersProfile.ruleDetails[0].actions[0].updated = userPatronGroupId;

          cy.createBulkEditProfile(usersProfile).then((profile) => {
            testData.usersProfileName = profile.name;
            testData.createdProfileId = profile.id;
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.deleteBulkEditProfile(testData.createdProfileId, true);
    });

    it(
      'C740207 Viewing Other bulk edit profiles (firebird)',
      { tags: ['criticalPath', 'firebird', 'C740207'] },
      () => {
        // Step 1: Click "Bulk edit" option in "Settings" pane
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
        BulkEditPane.waitLoading();

        // Step 2: Verify profiles types listed under "Other profiles" group
        BulkEditPane.verifyProfilesTypesPresent(['Users bulk edit profiles']);
        BulkEditPane.verifyProfilesTypesAbsent([
          'Holdings bulk edit profiles',
          'Instances bulk edit profiles',
          'Items bulk edit profiles',
        ]);

        // Step 3: Click "Users bulk edit profiles" and click on any existing users bulk edit profile row
        BulkEditPane.clickUsersBulkEditProfiles();
        UsersBulkEditProfilesPane.waitLoading();
        UsersBulkEditProfilesPane.verifyPaneElements();
        UsersBulkEditProfilesPane.clickProfileRow(testData.usersProfileName);
        UsersBulkEditProfileView.waitLoading();
        UsersBulkEditProfileView.verifyProfileDetails(
          testData.usersProfileName,
          testData.profileDescription,
        );

        // Step 4: Verify elements under "Summary" accordion
        UsersBulkEditProfileView.verifyLockProfileCheckboxChecked(false);
        UsersBulkEditProfileView.verifyMetadataSectionExists();

        // Step 5: Verify elements under "Bulk edits" accordion
        UsersBulkEditProfileView.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
        );
        UsersBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.REPLACE_WITH);
        UsersBulkEditProfileView.verifySelectedPatronGroup('faculty (Faculty Member)');

        // Step 6: Expand Standard metadata information under "Summary" accordion
        UsersBulkEditProfileView.expandMetadataSection();
        UsersBulkEditProfileView.verifyMetadataSection(
          testData.adminSourceRecord,
          testData.adminSourceRecord,
        );

        // Step 7: Click "Collapse all" link
        UsersBulkEditProfileView.clickCollapseAllLinkAndVerify();
      },
    );
  });
});
