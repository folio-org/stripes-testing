import permissions from '../../../../support/dictionary/permissions';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import SingleFieldMappingProfilePane from '../../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ModalSelectTransformations from '../../../../support/fragments/data-export/exportMappingProfile/modalSelectTransformations';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import SettingsDataExport from '../../../../support/fragments/data-export/settingsDataExport';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import DateTools from '../../../../support/utils/dateTools';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

let user;
let lockedNotReferencedMappingProfileId;
let lockedReferencedMappingProfileId;
let jobProfileId;
const duplicatedDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
const itemTransformationRules = ['Item - ID', '459', '1', '2', 'b'];
const instanceTransformationRules = ['Instance - ID', '999', 'f', 'f', 'i'];
const addedTransformationCalloutMessage = '1 transformation has been successfully added';
const lockedNotReferencedMappingProfile = {
  name: getTestEntityValue('C1046005_LockedNotRefMappingProfile'),
};
const lockedReferencedMappingProfile = {
  name: getTestEntityValue('C1046005_LockedRefMappingProfile'),
  jobProfileName: getTestEntityValue('C1046005_JobProfile'),
  duplicatedName: getTestEntityValue('C1046005_DuplicatedLockedRef'),
  description: getTestEntityValue('C1046005_Description'),
};
const defaultInstanceMappingProfile = {
  name: 'Default instance mapping profile',
  duplicatedName: getTestEntityValue('C1046005_DuplicatedDefaultInstance'),
};

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportLockUnlockProfiles.gui]).then((userProperties) => {
        user = userProperties;

        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          lockedNotReferencedMappingProfile.name,
          true,
        ).then((response) => {
          lockedNotReferencedMappingProfileId = response.body.id;
        });

        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          lockedReferencedMappingProfile.name,
          true,
        ).then((response) => {
          lockedReferencedMappingProfileId = response.body.id;

          ExportNewJobProfile.createNewJobProfileViaApi(
            lockedReferencedMappingProfile.jobProfileName,
            response.body.id,
          ).then((jobResponse) => {
            jobProfileId = jobResponse.body.id;
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
        ExportFieldMappingProfiles.openTabFromDataExportSettingsList();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      if (jobProfileId) {
        ExportJobProfiles.deleteJobProfileViaApi(jobProfileId);
      }
      if (lockedNotReferencedMappingProfileId) {
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(
          lockedNotReferencedMappingProfileId,
        );
      }
      if (lockedReferencedMappingProfileId) {
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(lockedReferencedMappingProfileId);
      }

      // Delete duplicated profiles
      [
        `Copy of ${lockedNotReferencedMappingProfile.name}`,
        lockedReferencedMappingProfile.duplicatedName,
        defaultInstanceMappingProfile.duplicatedName,
      ].forEach((name) => {
        ExportFieldMappingProfiles.getFieldMappingProfile({ query: `"name"=="${name}"` }).then(
          (response) => {
            if (response) {
              DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
            }
          },
        );
      });

      Users.deleteViaApi(user.userId);
    });

    it(
      'C1046005 User with "Settings - UI-Data-Export Settings Lock - Edit" capability set is able to duplicate locked and default mapping profiles (firebird)',
      { tags: ['criticalPath', 'firebird', 'C1046005'] },
      () => {
        // Step 1: Select existing locked mapping profile from Preconditions: locked mapping profile not referenced in job profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          lockedNotReferencedMappingProfile.name,
        );
        SingleFieldMappingProfilePane.waitLoading(lockedNotReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.verifyElements();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(true, true);

        // Step 2: Click on Actions menu => Duplicate option
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.clickDuplicateButton();
        SingleFieldMappingProfilePane.verifyNameTextField(
          `Copy of ${lockedNotReferencedMappingProfile.name}`,
        );
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, false);
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCancelButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCloseButtonDisabled(false);
        SettingsDataExport.verifyPageTitle(
          'Data export settings - New field mapping profile - FOLIO',
        );

        // Step 3: Do not make any changes on the mapping profile, Click "Save & close" button
        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(
          `The field mapping profile ${`Copy of ${lockedNotReferencedMappingProfile.name}`} has been successfully created`,
        );

        // Step 4: Verify row with duplicated mapping profile in "Field mapping profiles" table
        ExportFieldMappingProfiles.searchFieldMappingProfile(
          `Copy of ${lockedNotReferencedMappingProfile.name}`,
        );
        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          `Copy of ${lockedNotReferencedMappingProfile.name}`,
          'Srs',
          'MARC',
          duplicatedDate,
          `${user.personal.firstName} ${user.personal.lastName}`,
          '',
        );

        // Step 5: Click on the row with duplicated mapping profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          `Copy of ${lockedNotReferencedMappingProfile.name}`,
        );
        SingleFieldMappingProfilePane.waitLoading(
          `Copy of ${lockedNotReferencedMappingProfile.name}`,
        );
        SingleFieldMappingProfilePane.verifyProfileDetails({
          name: `Copy of ${lockedNotReferencedMappingProfile.name}`,
          recordType: 'Source record storage (entire record)',
          outputFormat: 'MARC',
          description: 'No value set-',
          source: user.username,
        });
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);

        // Step 6: Close Mapping profile view page by clicking "X" button, Select existing locked mapping profile from Preconditions: mapping profile referenced in job profile
        SingleFieldMappingProfilePane.clickXButton();
        ExportFieldMappingProfiles.searchFieldMappingProfile(lockedReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          lockedReferencedMappingProfile.name,
        );
        SingleFieldMappingProfilePane.waitLoading(lockedReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.verifyElements();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(true, true);

        // Step 7: Click on Actions menu => Duplicate option
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.clickDuplicateButton();
        SingleFieldMappingProfilePane.verifyNameTextField(
          `Copy of ${lockedReferencedMappingProfile.name}`,
        );
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, false);
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCancelButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCloseButtonDisabled(false);
        SettingsDataExport.verifyPageTitle(
          'Data export settings - New field mapping profile - FOLIO',
        );

        // Step 8: Make any changes on the mapping profile, Check "Lock profile" checkbox, Click "Save & close" button
        SingleFieldMappingProfilePane.editFieldMappingProfile(
          lockedReferencedMappingProfile.duplicatedName,
          lockedReferencedMappingProfile.description,
        );
        ExportNewFieldMappingProfile.checkCheckbox('Lock profile');
        SingleFieldMappingProfilePane.checkRecordType('Item');
        ExportNewFieldMappingProfile.clickAddTransformationsButton();
        ModalSelectTransformations.searchItemTransformationsByName(itemTransformationRules[0]);
        ModalSelectTransformations.clickNthCheckbox();
        ModalSelectTransformations.fillInTransformationsTextfields(
          itemTransformationRules[1],
          itemTransformationRules[2],
          itemTransformationRules[3],
          itemTransformationRules[4],
        );
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(addedTransformationCalloutMessage);
        ExportNewFieldMappingProfile.verifyLockProfileCheckbox(false, true);
        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(
          `The field mapping profile ${lockedReferencedMappingProfile.duplicatedName} has been successfully created`,
        );

        // Step 9: Verify row with duplicated mapping profile in "Field mapping profiles" table
        ExportFieldMappingProfiles.searchFieldMappingProfile(
          lockedReferencedMappingProfile.duplicatedName,
        );
        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          lockedReferencedMappingProfile.duplicatedName,
          'Srs,Item',
          'MARC',
          duplicatedDate,
          `${user.personal.firstName} ${user.personal.lastName}`,
          'Locked',
        );

        // Step 10: Click on the row with duplicated mapping profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          lockedReferencedMappingProfile.duplicatedName,
        );
        SingleFieldMappingProfilePane.waitLoading(lockedReferencedMappingProfile.duplicatedName);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...itemTransformationRules);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(true, true);

        // Step 11: Select Default instance mapping profile
        SingleFieldMappingProfilePane.clickXButton();
        ExportFieldMappingProfiles.clearSearchField();
        ExportFieldMappingProfiles.searchFieldMappingProfile(defaultInstanceMappingProfile.name);
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          defaultInstanceMappingProfile.name,
        );
        SingleFieldMappingProfilePane.waitLoading(defaultInstanceMappingProfile.name);
        SingleFieldMappingProfilePane.verifyElements();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);

        // Step 12: Click on Actions menu => Duplicate option
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.clickDuplicateButton();
        SingleFieldMappingProfilePane.verifyNameTextField(
          `Copy of ${defaultInstanceMappingProfile.name}`,
        );
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, false);
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCancelButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCloseButtonDisabled(false);
        SettingsDataExport.verifyPageTitle(
          'Data export settings - New field mapping profile - FOLIO',
        );

        // Step 13: Make any changes on the mapping profile, Check "Lock profile" checkbox, Click "Save & close" button
        SingleFieldMappingProfilePane.editFieldMappingProfile(
          defaultInstanceMappingProfile.duplicatedName,
          'Duplicated from default',
        );
        ExportNewFieldMappingProfile.clickAddTransformationsButton();
        ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
        ModalSelectTransformations.uncheckItemRecordTypeChechbox();
        ModalSelectTransformations.clickFieldNameCheckbox(instanceTransformationRules[0]);
        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          ...instanceTransformationRules,
        );

        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(addedTransformationCalloutMessage);
        ModalSelectTransformations.verifyModalTransformationExists(false);
        ExportNewFieldMappingProfile.checkCheckbox('Lock profile');
        ExportNewFieldMappingProfile.verifyLockProfileCheckbox(false, true);
        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(
          `The field mapping profile ${defaultInstanceMappingProfile.duplicatedName} has been successfully created`,
        );

        // Step 14: Verify row with duplicated mapping profile in "Field mapping profiles" table
        ExportFieldMappingProfiles.searchFieldMappingProfile(
          defaultInstanceMappingProfile.duplicatedName,
        );
        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          defaultInstanceMappingProfile.duplicatedName,
          'Instance',
          'MARC',
          duplicatedDate,
          `${user.personal.firstName} ${user.personal.lastName}`,
          'Locked',
        );

        // Step 15: Click on the row with duplicated mapping profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          defaultInstanceMappingProfile.duplicatedName,
        );
        SingleFieldMappingProfilePane.waitLoading(defaultInstanceMappingProfile.duplicatedName);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...instanceTransformationRules);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(true, true);

        // Step 16: In DevTools verify "default" value for duplicated mapping profile
        ExportFieldMappingProfiles.getFieldMappingProfile({
          query: `"name"=="${defaultInstanceMappingProfile.duplicatedName}"`,
        }).then((response) => {
          cy.wrap(response.default).should('equal', false);
        });

        // Step 17: Close the mapping profile view form, One by one select existing mapping profiles from Preconditions: Default authority mapping profile, Default Linked Data instances mapping profile
        SingleFieldMappingProfilePane.clickXButton();
        ExportFieldMappingProfiles.clearSearchField();
        [
          'Default authority mapping profile',
          'Default Linked Data instances mapping profile',
        ].forEach((profileName) => {
          SingleFieldMappingProfilePane.clickProfileNameFromTheList(profileName);
          SingleFieldMappingProfilePane.waitLoading(profileName);
          SingleFieldMappingProfilePane.verifyActionsButtonAbsent();
          SingleFieldMappingProfilePane.clickXButton();
        });
      },
    );
  });
});
