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
  createSuppressFromDiscoveryRule,
  ActionCreators,
  MarcRules,
  MarcActionCreators,
} from '../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

const { createMarcFieldRule } = MarcRules;

// Profile factory function
const createProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C740234 original MARC instances bulk edit profile ${getRandomPostfix()}`,
    description: 'Original MARC instances profile description',
    entityType: 'INSTANCE_MARC',
    ruleDetails: [
      createAdminNoteRule(
        ActionCreators.addToExisting('Original administrative note for MARC instances'),
      ),
      createSuppressFromDiscoveryRule(true, true, true),
    ],
    marcRuleDetails: [
      createMarcFieldRule('500', '1', '0', 'a', [
        MarcActionCreators.addToExisting('Original MARC note data'),
      ]),
      createMarcFieldRule('856', '4', '1', 'u', [
        MarcActionCreators.find('http://search.ebscohost.com/login.aspx?direct=true'),
        MarcActionCreators.replaceWith('http://search.ebscohost.com/login.aspx?direct=false'),
      ]),
    ],
  });
};

let user;
const testData = {
  originalProfileName: null, // Will be assigned after profile creation
  editedProfileName: `AT_C740234 edited MARC instances bulk edit profile ${getRandomPostfix()}`,
  originalDescription: 'Original MARC instances profile description',
  editedDescription: 'Updated MARC instances profile description with changes',
  originalAdministrativeNote: 'Original administrative note for MARC instances',
  editedAdministrativeNote: 'Updated administrative note for MARC instances',
  originalMarcField: '500',
  originalIndicator1: '1',
  originalIndicator2: '0',
  originalSubfield: 'a',
  originalMarcData: 'Original MARC note data',
  original856Field: '856',
  original856Indicator1: '4',
  original856Indicator2: '1',
  original856Subfield: 'u',
  original856FindValue: 'http://search.ebscohost.com/login.aspx?direct=true',
  original856ReplaceValue: 'http://search.ebscohost.com/login.aspx?direct=false',
  edited856ReplaceValue: 'http://www.example.com/updated-url',
  addedMarcField: '562',
  addedIndicator1: '1',
  addedIndicator2: '\\',
  addedSubfield: 'a',
  addedMarcFieldValue: 'Added MARC note data',
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    beforeEach('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditSettingsCreate.gui,
        Permissions.bulkEditView.gui,
        Permissions.bulkEditCsvView.gui,
        Permissions.uiInventorySetRecordsForDeletion.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create hybrid profile with factory (both FOLIO and MARC rules)
        const profileBody = createProfileBody();
        cy.createBulkEditProfile(profileBody).then((createdProfile) => {
          testData.originalProfileName = createdProfile.name;
          testData.profileId = createdProfile.id;
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

    afterEach('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.deleteBulkEditProfile(testData.profileId, true);
    });

    // Trillium
    it.skip('C740234 Editing MARC Instances bulk edit profile (firebird)', { tags: [] }, () => {
      // Step 1: Click on the row with instances with source MARC bulk edit profile from Preconditions
      InstancesBulkEditProfilesPane.clickProfileRow(testData.originalProfileName);
      InstancesBulkEditProfileView.waitLoading();
      InstancesBulkEditProfileView.verifyProfileDetails(
        testData.originalProfileName,
        testData.originalDescription,
      );
      InstancesBulkEditProfileView.verifyBulkEditForMarcInstancesAccordionExists();

      // Step 2: Click "Actions" menu button
      InstancesBulkEditProfileView.clickActionsButton();
      InstancesBulkEditProfileView.verifyActionsMenuOptions({
        edit: true,
        duplicate: true,
        delete: false,
      });

      // Step 3: Click "Edit" button
      InstancesBulkEditProfileView.selectEditProfile();
      InstancesBulkEditProfileForm.verifyFormElements(testData.originalProfileName);
      InstancesBulkEditProfileForm.verifyBulkEditForMarcInstancesAccordionExists();

      // Step 4: Verify elements under "Summary" accordion
      InstancesBulkEditProfileForm.verifySummaryAccordionElements();
      // TODO: Uncomment after UIBULKED-693 is done
      // InstancesBulkEditProfileForm.verifyMetadataSectionExists();

      // Step 5: Verify elements under "Bulk edits for administrative data" and "Bulk edits for instances with source MARC" accordions
      InstancesBulkEditProfileForm.verifySelectedOption(
        BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
      );
      InstancesBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE);
      InstancesBulkEditProfileForm.verifyTextInDataTextArea(testData.originalAdministrativeNote);
      InstancesBulkEditProfileForm.verifySelectedOption(
        BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        1,
      );
      InstancesBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.SET_FALSE, 1);
      InstancesBulkEditProfileForm.verifyTagAndIndicatorsAndSubfieldValues(
        testData.originalMarcField,
        testData.originalIndicator1,
        testData.originalIndicator2,
        testData.originalSubfield,
      );
      InstancesBulkEditProfileForm.verifySelectedMarcAction(BULK_EDIT_ACTIONS.ADD);
      InstancesBulkEditProfileForm.verifyDataTextAreaForMarcInstance(testData.originalMarcData);
      InstancesBulkEditProfileForm.verifyTagAndIndicatorsAndSubfieldValues(
        testData.original856Field,
        testData.original856Indicator1,
        testData.original856Indicator2,
        testData.original856Subfield,
        1,
      );
      InstancesBulkEditProfileForm.verifySelectedMarcAction(BULK_EDIT_ACTIONS.FIND, 1);
      InstancesBulkEditProfileForm.verifyDataTextAreaForMarcInstance(
        testData.original856FindValue,
        1,
      );
      InstancesBulkEditProfileForm.verifySelectedSecondMarcAction(
        BULK_EDIT_ACTIONS.REPLACE_WITH,
        1,
      );
      InstancesBulkEditProfileForm.verifySecondDataTextAreaForMarcInstance(
        testData.original856ReplaceValue,
        1,
      );
      InstancesBulkEditProfileForm.clickGarbageCanButton(1);

      // Step 6: Edit profile name in "Name*" text box with any value
      InstancesBulkEditProfileForm.fillProfileName(testData.editedProfileName);
      InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

      // Step 7: Verify options/actions available under "Bulk edits for administrative data" accordion
      InstancesBulkEditProfileForm.verifyAvailableOptionsAndActionsForMarcInstance();

      // Step 8: Verify actions available under "Bulk edits for instances with source MARC" accordion
      InstancesBulkEditProfileForm.verifyMarcActionsAvailable();

      // Step 9: Edit any options/actions under both accordions
      // Edit administrative data
      InstancesBulkEditProfileForm.selectOption(
        BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
      );
      InstancesBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.ADD_NOTE);
      InstancesBulkEditProfileForm.fillTextInDataTextArea(testData.editedAdministrativeNote);

      // Edit MARC data
      InstancesBulkEditProfileForm.clickGarbageCanButtonInMarcInstancesAccordion();
      InstancesBulkEditProfileForm.fillInSecondDataTextAreaForMarcInstance(
        testData.edited856ReplaceValue,
      );
      InstancesBulkEditProfileForm.clickPlusButtonInMarcInstancesAccordion();
      InstancesBulkEditProfileForm.fillInTagAndIndicatorsAndSubfield(
        testData.addedMarcField,
        testData.addedIndicator1,
        testData.addedIndicator2,
        testData.addedSubfield,
        1,
      );
      InstancesBulkEditProfileForm.selectMarcAction(BULK_EDIT_ACTIONS.ADD, 1);
      InstancesBulkEditProfileForm.fillInDataTextAreaForMarcInstance(
        testData.addedMarcFieldValue,
        1,
      );
      InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

      // Step 10: Edit profile description in "Description" text box with any value
      InstancesBulkEditProfileForm.fillDescription(testData.editedDescription);
      InstancesBulkEditProfileForm.verifySaveButtonDisabled(false);

      // Step 11: Click "Save & close" button
      InstancesBulkEditProfileForm.clickSaveAndClose();
      InstancesBulkEditProfilesPane.verifySuccessToast('updated');
      InstancesBulkEditProfilesPane.waitLoading();

      // Step 12: Verify row with edited profile in the table with profiles
      InstancesBulkEditProfilesPane.verifyProfileInTable(
        testData.editedProfileName,
        testData.editedDescription,
        user,
      );

      // Step 13: Click on the row with edited instances with source MARC bulk edit profile
      InstancesBulkEditProfilesPane.clickProfileRow(testData.editedProfileName);
      InstancesBulkEditProfileView.waitLoading();
      InstancesBulkEditProfileView.verifyProfileDetails(
        testData.editedProfileName,
        testData.editedDescription,
      );
      InstancesBulkEditProfileView.verifySelectedOption(
        BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
      );
      InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE);
      InstancesBulkEditProfileView.verifyTextInDataTextArea(testData.editedAdministrativeNote);
      InstancesBulkEditProfileView.verifyTagAndIndicatorsAndSubfieldValues(
        testData.original856Field,
        testData.original856Indicator1,
        testData.original856Indicator2,
        testData.original856Subfield,
      );
      InstancesBulkEditProfileView.verifySelectedMarcAction(BULK_EDIT_ACTIONS.FIND);
      InstancesBulkEditProfileView.verifyDataTextAreaForMarcInstance(testData.original856FindValue);
      InstancesBulkEditProfileView.verifySelectedSecondMarcAction(BULK_EDIT_ACTIONS.REPLACE_WITH);
      InstancesBulkEditProfileView.verifySecondDataTextAreaForMarcInstance(
        testData.edited856ReplaceValue,
      );
      InstancesBulkEditProfileView.verifyTagAndIndicatorsAndSubfieldValues(
        testData.addedMarcField,
        testData.addedIndicator1,
        testData.addedIndicator2,
        testData.addedSubfield,
        1,
      );
      InstancesBulkEditProfileView.verifySelectedMarcAction(BULK_EDIT_ACTIONS.ADD, 1);
      InstancesBulkEditProfileView.verifyDataTextAreaForMarcInstance(
        testData.addedMarcFieldValue,
        1,
      );

      // Step 14: Test cancel functionality with unsaved changes
      InstancesBulkEditProfileView.clickActionsButton();
      InstancesBulkEditProfileView.selectEditProfile();
      InstancesBulkEditProfileForm.fillProfileName(`${testData.editedProfileName}_temp`);
      InstancesBulkEditProfileForm.clickCancel();
      AreYouSureModal.verifyModalElements('There are unsaved changes');

      // Step 15: Complete Cancel workflow - Keep editing, then Close without saving
      AreYouSureModal.clickKeepEditing();
      InstancesBulkEditProfileForm.fillDescription('Temporary description change');
      InstancesBulkEditProfileForm.clickCancel();
      AreYouSureModal.clickCloseWithoutSaving();
      InstancesBulkEditProfilesPane.waitLoading();

      // Step 16: Verify final state without unsaved changes
      InstancesBulkEditProfilesPane.clickProfileRow(testData.editedProfileName);
      InstancesBulkEditProfileView.waitLoading();
      InstancesBulkEditProfileView.verifyProfileDetails(
        testData.editedProfileName,
        testData.editedDescription,
      );
    });
  });
});
