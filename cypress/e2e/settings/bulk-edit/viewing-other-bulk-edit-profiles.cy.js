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

let user;
const testData = {
  usersProfileName: `AT_C740207_UsersProfile_${getRandomPostfix()}`,
  profileDescription: 'Test users profile for viewing verification',
  createdProfileIds: [],
  usersProfileBody: {
    name: `AT_C740207_UsersProfile_${getRandomPostfix()}`,
    description: 'Test users profile for viewing verification',
    locked: false,
    entityType: 'USER',
    ruleDetails: [
      {
        option: 'PATRON_GROUP',
        actions: [
          {
            type: 'REPLACE_WITH',
            updated: 'faculty',
          },
        ],
      },
    ],
  },
};

describe('Bulk edit', () => {
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

        // Create test users profile
        cy.createBulkEditProfile(testData.usersProfileBody).then((profile) => {
          testData.usersProfileName = profile.name;
          testData.createdProfileIds.push(profile.id);
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

      testData.createdProfileIds.forEach((id) => {
        cy.deleteBulkEditProfile(id, true);
      });
    });

    it(
      'C740207 Viewing Other bulk edit profiles (firebird)',
      { tags: ['criticalPath', 'firebird', 'C740207'] },
      () => {
        // Step 1: Click "Bulk edit" option in "Settings" pane
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
        BulkEditPane.waitLoading();

        // Step 2: Verify profiles types listed under "Other profiles" group
        BulkEditPane.verifyOtherProfilesGroupExists();
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
        UsersBulkEditProfileView.verifyTextInDataTextArea('faculty');

        // Step 6: Expand Standard metadata information under "Summary" accordion
        // дописать метод с проверкой метаданных
        UsersBulkEditProfileView.expandMetadataSection();
        UsersBulkEditProfileView.verifyMetadataSection();

        // Step 7: Click "Collapse all" link
        UsersBulkEditProfileView.clickCollapseAllLinkAndVerify();
      },
    );
  });
});
