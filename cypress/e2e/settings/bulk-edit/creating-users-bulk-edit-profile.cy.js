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
import UsersBulkEditProfileForm from '../../../support/fragments/settings/bulk-edit/profileForm/usersBulkEditProfileForm';
import UsersBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/usersBulkEditProfileView';
import AreYouSureModal from '../../../support/fragments/settings/bulk-edit/areYouSureModal';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const testData = {
  profileName: `AT_C805765 users bulk edit profile ${getRandomPostfix()}`,
  profileNameToCancel: `AT_C805765 users bulk edit profile to cancel ${getRandomPostfix()}`,
  profileDescription: 'Edit patron group, expiration date and email',
  patronGroup: 'staff (Staff Member)',
  expirationDate: new Date(),
  emailFind: 'example.com',
  emailReplace: 'newdomain.com',
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditSettingsCreate.gui,
        Permissions.bulkEditUpdateRecords.gui,
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditCsvEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      UsersBulkEditProfilesPane.deleteBulkEditProfileByNameViaApi(testData.profileName);
    });

    // Trillium
    it.skip('C805765 Creating Users bulk edit profile (firebird)', { tags: [] }, () => {
      // Step 1: Click "Users bulk edit profiles" category under "Other profiles" group
      SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
      BulkEditPane.waitLoading();
      BulkEditPane.clickUsersBulkEditProfiles();
      UsersBulkEditProfilesPane.waitLoading();
      UsersBulkEditProfilesPane.verifyPaneElements();

      // Step 2: Click "New" button
      UsersBulkEditProfilesPane.clickNewButton();
      UsersBulkEditProfileForm.waitLoading();
      UsersBulkEditProfileForm.verifyFormElements('New users bulk edit profile');

      // Step 3: Verify elements under "Summary" accordion
      UsersBulkEditProfileForm.verifySummaryAccordionElements();

      // Step 4: Verify elements under "Bulk edits" accordion
      UsersBulkEditProfileForm.verifyBulkEditsAccordionElements();

      // Step 5: Fill in "Name*" text box and "Description" text box
      UsersBulkEditProfileForm.fillProfileName(testData.profileName);
      UsersBulkEditProfileForm.fillDescription(testData.profileDescription);
      UsersBulkEditProfileForm.verifySaveButtonDisabled();

      // Step 6: Select "Patron group" in "Select option" dropdown
      UsersBulkEditProfileForm.selectOption(BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP);
      UsersBulkEditProfileForm.verifyActionsColumnAppears();
      UsersBulkEditProfileForm.verifySelectActionDisabled(BULK_EDIT_ACTIONS.REPLACE_WITH);
      UsersBulkEditProfileForm.verifyDataColumnAppears();
      UsersBulkEditProfileForm.verifySaveButtonDisabled();

      // Step 7: Select any patron group in "Select patron group" dropdown
      UsersBulkEditProfileForm.selectPatronGroup(testData.patronGroup);
      UsersBulkEditProfileForm.verifySelectedPatronGroup(testData.patronGroup);
      UsersBulkEditProfileForm.verifySaveButtonDisabled(false);

      // Step 8: Click "Plus" icon in "Actions" column
      UsersBulkEditProfileForm.clickPlusButton();
      UsersBulkEditProfileForm.verifyAddedNewBulkEditRow();
      UsersBulkEditProfileForm.verifySaveButtonDisabled();

      // Step 9: Select "Expiration date" and select date
      UsersBulkEditProfileForm.selectOption(
        BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
        1,
      );
      UsersBulkEditProfileForm.verifySelectActionDisabled(BULK_EDIT_ACTIONS.REPLACE_WITH, 1);
      UsersBulkEditProfileForm.selectExpirationDate(testData.expirationDate, 1);
      UsersBulkEditProfileForm.verifyExpirationDateValue(testData.expirationDate, 1);
      UsersBulkEditProfileForm.verifySaveButtonDisabled(false);

      // Step 10: Add Email row with Find and Replace
      UsersBulkEditProfileForm.clickPlusButton(1);
      UsersBulkEditProfileForm.selectOption('Email', 2);
      UsersBulkEditProfileForm.verifySelectActionDisabled(BULK_EDIT_ACTIONS.FIND, 2);
      UsersBulkEditProfileForm.verifySelectSecondActionDisabled(BULK_EDIT_ACTIONS.REPLACE_WITH, 2);
      UsersBulkEditProfileForm.fillEmailFindText(testData.emailFind, 2);
      UsersBulkEditProfileForm.fillEmailReplaceText(testData.emailReplace, 2);
      UsersBulkEditProfileForm.verifySaveButtonDisabled(false);

      // Step 11: Click "Save & close" button
      UsersBulkEditProfileForm.clickSaveAndClose();
      UsersBulkEditProfileForm.verifyNewProfilePaneAbsent();
      UsersBulkEditProfilesPane.verifySuccessToast();
      UsersBulkEditProfilesPane.waitLoading();

      // Step 12: Verify row with newly created profile in the table
      UsersBulkEditProfilesPane.verifyProfileInTable(
        testData.profileName,
        testData.profileDescription,
        user,
      );

      // Step 13: Click on the row with newly created users bulk edit profile
      UsersBulkEditProfilesPane.clickProfileRow(testData.profileName);
      UsersBulkEditProfileView.waitLoading();
      UsersBulkEditProfileView.verifyProfileDetails(
        testData.profileName,
        testData.profileDescription,
      );
      UsersBulkEditProfileView.verifySelectedOption(
        BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.PATRON_GROUP,
      );
      UsersBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.REPLACE_WITH);
      UsersBulkEditProfileView.verifySelectedPatronGroup(testData.patronGroup);
      UsersBulkEditProfileView.verifySelectedOption(
        BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EXPIRATION_DATE,
        1,
      );
      UsersBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.REPLACE_WITH, 1);
      UsersBulkEditProfileView.verifySelectedExpirationDate(testData.expirationDate, 1);
      UsersBulkEditProfileView.verifySelectedOption(BULK_EDIT_TABLE_COLUMN_HEADERS.USERS.EMAIL, 2);
      UsersBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.FIND, 2);
      UsersBulkEditProfileView.verifySelectedSecondAction(BULK_EDIT_ACTIONS.REPLACE_WITH, 2);
      UsersBulkEditProfileView.verifyEmailFindText(testData.emailFind, 2);
      UsersBulkEditProfileView.verifyEmailReplaceText(testData.emailReplace, 2);

      // Step 14: Test Cancel functionality with unsaved changes
      UsersBulkEditProfileView.clickCloseFormButton();
      UsersBulkEditProfilesPane.clickNewButton();
      UsersBulkEditProfileForm.fillProfileName(testData.profileNameToCancel);
      UsersBulkEditProfileForm.clickCancel();
      AreYouSureModal.verifyModalElements('There are unsaved changes');

      // Step 15: Complete Cancel workflow - Keep editing, then Close without saving
      AreYouSureModal.clickKeepEditing();
      UsersBulkEditProfileForm.fillDescription('Additional description for cancel test');
      UsersBulkEditProfileForm.clickCancel();
      AreYouSureModal.clickCloseWithoutSaving();
      UsersBulkEditProfilesPane.waitLoading();
      UsersBulkEditProfilesPane.verifyProfileNotInTable(testData.profileNameToCancel);
    });
  });
});
