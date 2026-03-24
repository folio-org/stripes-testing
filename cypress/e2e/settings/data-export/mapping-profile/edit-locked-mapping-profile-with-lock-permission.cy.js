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
let unlockedMappingProfileId;
let lockedMappingProfileId;
let jobProfileId;
const updatedDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
const itemTransformationRules = ['Item - ID', '459', '1', '2', 'b'];
const holdingsTransformationRules = ['Holdings - ID', '901', '1', '2', 'a'];
const updatedTransformationCalloutMessage = 'The transformations have been updated';
const savedMappingProfileCalloutMessage = (mappingProfileName) => {
  return `The field mapping profile ${mappingProfileName} has been successfully saved`;
};
const unlockedMappingProfile = {
  name: getTestEntityValue('C1046003_UnlockedMappingProfile'),
  updatedDescription: getTestEntityValue('C1046003_UpdatedDescription'),
};
const lockedMappingProfile = {
  name: getTestEntityValue('C1046003_LockedMappingProfile'),
  jobProfileName: getTestEntityValue('C1046003_JobProfile'),
  updatedDescription: getTestEntityValue('C1046003_LockedDescription'),
};

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportLockUnlockProfiles.gui]).then((userProperties) => {
        user = userProperties;

        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          unlockedMappingProfile.name,
        ).then((response) => {
          unlockedMappingProfileId = response.body.id;
        });

        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          lockedMappingProfile.name,
          true,
        ).then((response) => {
          lockedMappingProfileId = response.body.id;

          ExportNewJobProfile.createNewJobProfileViaApi(
            lockedMappingProfile.jobProfileName,
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

      // Unlock both profiles before deletion (both get locked during test execution)
      if (unlockedMappingProfileId) {
        ExportFieldMappingProfiles.getFieldMappingProfile({
          query: `"id"=="${unlockedMappingProfileId}"`,
        }).then((response) => {
          if (response) {
            cy.editFieldMappingProfile(response.id, {
              ...response,
              locked: false,
            }).then(() => {
              DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
            });
          }
        });
      }

      if (lockedMappingProfileId) {
        ExportFieldMappingProfiles.getFieldMappingProfile({
          query: `"id"=="${lockedMappingProfileId}"`,
        }).then((response) => {
          if (response) {
            cy.editFieldMappingProfile(response.id, {
              ...response,
              locked: false,
            }).then(() => {
              DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
            });
          }
        });
      }

      Users.deleteViaApi(user.userId);
    });

    it(
      'C1046003 User with "Settings - UI-Data-Export Settings Lock - Edit" capability set is able to edit locked mapping profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C1046003'] },
      () => {
        // Step 1: Select existing unlocked mapping profile from Preconditions: mapping profile not referenced in job profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(unlockedMappingProfile.name);
        SingleFieldMappingProfilePane.waitLoading(unlockedMappingProfile.name);
        SingleFieldMappingProfilePane.verifyElements();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);

        // Step 2: Click "Actions" menu button
        SingleFieldMappingProfilePane.verifyActionOptions();

        // Step 3: Click on Actions menu => Edit option
        SingleFieldMappingProfilePane.clickEditButton();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, false);
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled();
        SingleFieldMappingProfilePane.verifyCancelButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCloseButtonDisabled(false);
        SettingsDataExport.verifyPageTitle(
          `Data export settings - ${unlockedMappingProfile.name} - FOLIO`,
        );

        // Step 4: Check "Lock profile" checkbox, Click "Save & close" button
        SingleFieldMappingProfilePane.editFieldMappingProfile(
          unlockedMappingProfile.name,
          unlockedMappingProfile.updatedDescription,
        );
        SingleFieldMappingProfilePane.checkRecordType('Item');
        SingleFieldMappingProfilePane.clickEditTransformations();
        ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
        ModalSelectTransformations.clickFieldNameCheckbox('Item - ID');
        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          ...itemTransformationRules,
        );
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(updatedTransformationCalloutMessage);
        ExportNewFieldMappingProfile.checkCheckbox('Lock profile');
        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(
          savedMappingProfileCalloutMessage(unlockedMappingProfile.name),
        );

        // Step 5: Verify row with edited mapping profile in "Field mapping profiles" table
        ExportFieldMappingProfiles.searchFieldMappingProfile(unlockedMappingProfile.name);
        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          unlockedMappingProfile.name,
          'Srs,Item',
          'MARC',
          updatedDate,
          `${user.personal.firstName} ${user.personal.lastName}`,
          'Locked',
        );

        // Step 6: Click on the row with edited mapping profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(unlockedMappingProfile.name);
        SingleFieldMappingProfilePane.waitLoading(unlockedMappingProfile.name);
        SingleFieldMappingProfilePane.verifyProfileDetails({
          name: unlockedMappingProfile.name,
          recordType: 'Source record storage (entire record)Item',
          outputFormat: 'MARC',
          description: unlockedMappingProfile.updatedDescription,
          source: user.username,
          transformation: '',
        });
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...itemTransformationRules);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(true, true);

        // Step 7: Close Mapping profile view page, Select existing locked mapping profile from Preconditions: mapping profile referenced in job profile
        SingleFieldMappingProfilePane.clickXButton();
        ExportFieldMappingProfiles.clearSearchField();
        ExportFieldMappingProfiles.searchFieldMappingProfile(lockedMappingProfile.name);
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(lockedMappingProfile.name);
        SingleFieldMappingProfilePane.waitLoading(lockedMappingProfile.name);
        SingleFieldMappingProfilePane.verifyElements();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(true, true);

        // Step 8: Click "Actions" menu button
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.verifyActionsMenuItems({
          edit: true,
          duplicate: true,
          delete: false,
        });

        // Step 9: Click on Actions menu => Edit option
        SingleFieldMappingProfilePane.clickEditButton();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(true, false);
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled();
        SingleFieldMappingProfilePane.verifyCancelButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCloseButtonDisabled(false);
        SettingsDataExport.verifyPageTitle(
          `Data export settings - ${lockedMappingProfile.name} - FOLIO`,
        );

        // Step 10: Uncheck "Lock profile" checkbox, Make any other changes on the mapping profile, Click "Save & close" button
        ExportNewFieldMappingProfile.checkCheckbox('Lock profile');
        SingleFieldMappingProfilePane.editFieldMappingProfile(
          lockedMappingProfile.name,
          lockedMappingProfile.updatedDescription,
        );
        SingleFieldMappingProfilePane.checkRecordType('Holdings');
        SingleFieldMappingProfilePane.clickEditTransformations();
        ModalSelectTransformations.clickFieldNameCheckbox('Holdings - ID');
        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          ...holdingsTransformationRules,
        );
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(updatedTransformationCalloutMessage);
        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(
          savedMappingProfileCalloutMessage(lockedMappingProfile.name),
        );

        // Step 11: Verify row with edited mapping profile in "Field mapping profiles" table
        ExportFieldMappingProfiles.searchFieldMappingProfile(lockedMappingProfile.name);
        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          lockedMappingProfile.name,
          'Srs,Holdings',
          'MARC',
          updatedDate,
          `${user.personal.firstName} ${user.personal.lastName}`,
          '',
        );

        // Step 12: Click on the row with edited mapping profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(lockedMappingProfile.name);
        SingleFieldMappingProfilePane.waitLoading(lockedMappingProfile.name);
        SingleFieldMappingProfilePane.verifyProfileDetails({
          name: lockedMappingProfile.name,
          recordType: 'Source record storage (entire record)Holdings',
          outputFormat: 'MARC',
          description: lockedMappingProfile.updatedDescription,
          source: user.username,
          transformation: '',
        });
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...holdingsTransformationRules);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
      },
    );
  });
});
