import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../support/constants';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import InstancesBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/instancesBulkEditProfilesPane';
import InstancesBulkEditProfileForm from '../../../support/fragments/settings/bulk-edit/profileForm/instancesBulkEditProfileForm';
import InstancesBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/instancesBulkEditProfileView';
import AreYouSureModal from '../../../support/fragments/settings/bulk-edit/areYouSureModal';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import {
  createBulkEditProfileBody,
  createAdminNoteRule,
  ActionCreators,
  InstancesRules,
} from '../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

let user;
let duplicatedUnlockedProfileName;
let duplicatedLockedProfileName;
const createUnlockedProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C740225 unlocked instances bulk edit profile ${getRandomPostfix()}`,
    description: 'Unlocked instances profile description for duplication test',
    locked: false,
    entityType: 'INSTANCE',
    ruleDetails: [
      createAdminNoteRule(
        ActionCreators.addToExisting('Original administrative note for instances'),
      ),
      InstancesRules.createStaffSuppressRule(false),
    ],
  });
};

const createLockedProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C740225 locked instances bulk edit profile ${getRandomPostfix()}`,
    description: 'Locked instances profile description for duplication test',
    locked: true,
    entityType: 'INSTANCE',
    ruleDetails: [
      createAdminNoteRule(ActionCreators.addToExisting('Locked administrative note for instances')),
      InstancesRules.createStaffSuppressRule(true),
    ],
  });
};

const testData = {
  unlockedProfileDescription: 'Unlocked instances profile description for duplication test',
  lockedProfileDescription: 'Locked instances profile description for duplication test',
  adminNoteInUnlockedProfile: 'Original administrative note for instances',
  adminNoteInLockedProfile: 'Locked administrative note for instances',
  newAdministrativeNote: 'Modified administrative note for duplicated profile',
  newAdministrativeNoteForLockedDuplicate:
    'Modified administrative note for locked profile duplicate',
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditSettingsCreate.gui,
        Permissions.bulkEditView.gui,
        Permissions.bulkEditCsvView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create unlocked profile
        const unlockedProfileBody = createUnlockedProfileBody();
        cy.createBulkEditProfile(unlockedProfileBody).then((createdProfile) => {
          testData.unlockedProfileName = createdProfile.name;
          testData.unlockedProfileId = createdProfile.id;
        });

        // Create locked profile
        const lockedProfileBody = createLockedProfileBody();
        cy.createBulkEditProfile(lockedProfileBody).then((createdProfile) => {
          testData.lockedProfileName = createdProfile.name;
          testData.lockedProfileId = createdProfile.id;
        });

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
        BulkEditPane.waitLoading();
        BulkEditPane.clickInstancesBulkEditProfiles();
        InstancesBulkEditProfilesPane.waitLoading();
        InstancesBulkEditProfilesPane.verifyPaneElements();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.deleteBulkEditProfile(testData.unlockedProfileId, true);
      cy.deleteBulkEditProfile(testData.lockedProfileId, true);
      InstancesBulkEditProfilesPane.deleteBulkEditProfileByNameViaApi(
        duplicatedUnlockedProfileName,
      );
      InstancesBulkEditProfilesPane.deleteBulkEditProfileByNameViaApi(duplicatedLockedProfileName);
    });

    it(
      'C740225 Duplicating bulk edit profile by User without "UI-Bulk-Edit Settings Lock" capability set (firebird)',
      { tags: ['smoke', 'firebird', 'C740225'] },
      () => {
        // Step 1: Click "Actions" menu button on unlocked profile
        InstancesBulkEditProfilesPane.clickProfileRow(testData.unlockedProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.unlockedProfileName,
          testData.unlockedProfileDescription,
        );
        InstancesBulkEditProfileView.clickActionsButton();
        InstancesBulkEditProfileView.verifyActionsMenuOptions({
          edit: true,
          duplicate: true,
          delete: false,
        });

        // Step 2: Click "Duplicate" button
        InstancesBulkEditProfileView.selectDuplicateProfile();
        InstancesBulkEditProfileForm.waitLoading();
        InstancesBulkEditProfileForm.verifyFormElements('New FOLIO instances bulk edit profile');

        // Step 3: Verify elements under "Summary" accordion
        InstancesBulkEditProfileForm.verifySummaryAccordionElements(true);
        InstancesBulkEditProfileForm.verifyMetadataSectionExists();

        // Step 4: Verify profile name in "Name*" text box
        duplicatedUnlockedProfileName = `Copy of ${testData.unlockedProfileName}`;

        InstancesBulkEditProfileForm.verifyProfileNameValue(duplicatedUnlockedProfileName);

        // Step 5: Verify elements under "Bulk edits" accordion
        InstancesBulkEditProfileForm.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
        );
        InstancesBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        InstancesBulkEditProfileForm.verifyTextInDataTextArea(testData.adminNoteInUnlockedProfile);
        InstancesBulkEditProfileForm.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          1,
        );
        InstancesBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.SET_FALSE, 1);

        // Step 6: Make any changes under "Bulk edits" accordion
        InstancesBulkEditProfileForm.fillTextInDataTextArea(testData.newAdministrativeNote);
        InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 7: Click "Save & close" button
        InstancesBulkEditProfileForm.clickSaveAndClose();
        InstancesBulkEditProfilesPane.verifySuccessToast('created');
        InstancesBulkEditProfilesPane.waitLoading();

        // Step 8: Verify row with created duplicate profile in the table
        InstancesBulkEditProfilesPane.verifyProfileInTable(
          duplicatedUnlockedProfileName,
          testData.unlockedProfileDescription,
          user,
        );

        // Step 9: Click on the row with created duplicate of unlocked bulk edit profile
        InstancesBulkEditProfilesPane.clickProfileRow(duplicatedUnlockedProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          duplicatedUnlockedProfileName,
          testData.unlockedProfileDescription,
        );
        InstancesBulkEditProfileView.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
        );
        InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        InstancesBulkEditProfileView.verifyTextInDataTextArea(testData.newAdministrativeNote);
        InstancesBulkEditProfileView.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          1,
        );
        InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.SET_FALSE, 1);
        InstancesBulkEditProfileView.verifyLockProfileCheckboxChecked(false);

        // Step 10: Test cancel functionality with unsaved changes
        InstancesBulkEditProfileView.clickActionsButton();
        InstancesBulkEditProfileView.selectDuplicateProfile();
        InstancesBulkEditProfileForm.waitLoading();

        const tempProfileName = `Temp profile ${getRandomPostfix()}`;

        InstancesBulkEditProfileForm.fillProfileName(tempProfileName);
        InstancesBulkEditProfileForm.clickCancel();
        AreYouSureModal.verifyModalElements('There are unsaved changes');

        // Step 11: Click "Keep editing" button and test cancel again
        AreYouSureModal.clickKeepEditing();
        InstancesBulkEditProfileForm.fillProfileName(`${tempProfileName} modified`);
        InstancesBulkEditProfileForm.clickCancel();
        AreYouSureModal.verifyModalElements('There are unsaved changes');
        AreYouSureModal.clickCloseWithoutSaving();
        InstancesBulkEditProfilesPane.waitLoading();
        InstancesBulkEditProfilesPane.verifyProfileNotInTable(tempProfileName);

        // Step 12: Open locked bulk edit profile and click "Actions" menu button
        InstancesBulkEditProfilesPane.clickProfileRow(testData.lockedProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.lockedProfileName,
          testData.lockedProfileDescription,
        );
        InstancesBulkEditProfileView.clickActionsButton();
        InstancesBulkEditProfileView.verifyActionsMenuOptions({
          edit: false,
          duplicate: true,
          delete: false,
        });

        // Step 13: Click "Duplicate" button on locked profile
        InstancesBulkEditProfileView.selectDuplicateProfile();
        InstancesBulkEditProfileForm.waitLoading();
        InstancesBulkEditProfileForm.verifyFormElements('New FOLIO instances bulk edit profile');

        // Step 14: Verify elements under "Summary" accordion for locked profile duplicate
        InstancesBulkEditProfileForm.verifyMetadataSectionExists();
        InstancesBulkEditProfileForm.verifySummaryAccordionElements(true);

        // Step 15: Verify profile name prefixed with "Copy of"
        InstancesBulkEditProfileForm.verifyProfileNameValue(
          `Copy of ${testData.lockedProfileName}`,
        );

        // Step 16: Verify elements under "Bulk edits" accordion
        InstancesBulkEditProfileForm.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
        );
        InstancesBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        InstancesBulkEditProfileForm.verifyTextInDataTextArea(testData.adminNoteInLockedProfile);
        InstancesBulkEditProfileForm.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          1,
        );
        InstancesBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.SET_TRUE, 1);

        // Step 17: Edit fields except "Lock profile" checkbox
        duplicatedLockedProfileName = `AT_C740225 Copy of locked profile ${getRandomPostfix()}`;
        const newDescription = 'Modified description for locked profile duplicate';

        InstancesBulkEditProfileForm.fillProfileName(duplicatedLockedProfileName);
        InstancesBulkEditProfileForm.fillDescription(newDescription);
        InstancesBulkEditProfileForm.fillTextInDataTextArea(
          testData.newAdministrativeNoteForLockedDuplicate,
        );
        InstancesBulkEditProfileForm.verifyLockProfileCheckboxChecked(false, true);
        InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

        // Step 18: Click "Save & close" button
        InstancesBulkEditProfileForm.clickSaveAndClose();
        InstancesBulkEditProfilesPane.verifySuccessToast('created');
        InstancesBulkEditProfilesPane.waitLoading();

        // Step 19: Verify row with created duplicate profile in the table
        InstancesBulkEditProfilesPane.verifyProfileInTable(
          duplicatedLockedProfileName,
          newDescription,
          user,
        );

        // Step 20: Click on the row with created duplicate of locked bulk edit profile
        InstancesBulkEditProfilesPane.clickProfileRow(duplicatedLockedProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          duplicatedLockedProfileName,
          newDescription,
        );
        InstancesBulkEditProfileView.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
        );
        InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        InstancesBulkEditProfileView.verifyTextInDataTextArea(
          testData.newAdministrativeNoteForLockedDuplicate,
        );
        InstancesBulkEditProfileView.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          1,
        );
        InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.SET_TRUE, 1);
        InstancesBulkEditProfileView.verifyLockProfileCheckboxChecked(false);
      },
    );
  });
});
