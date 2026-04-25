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
let notReferencedMappingProfileId;
let referencedMappingProfileId;
let jobProfileId;
const duplicatedDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
const itemTransformationRules = ['Item - ID', '459', '1', '2', 'b'];
const holdingsTransformationRules = ['Holdings - ID', '901', '1', '2', 'a'];
const addedTransformationCalloutMessage = '1 transformation has been successfully added';

const notReferencedMappingProfile = {
  name: getTestEntityValue('C1046004_NotRefMappingProfile'),
  duplicatedName: getTestEntityValue('C1046004_DuplicatedNotRef'),
  duplicatedDescription: getTestEntityValue('C1046004_DuplicatedDescription'),
};

const referencedMappingProfile = {
  name: getTestEntityValue('C1046004_RefMappingProfile'),
  jobProfileName: getTestEntityValue('C1046004_JobProfile'),
  duplicatedName: getTestEntityValue('C1046004_DuplicatedRef'),
  description: getTestEntityValue('C1046004_Description'),
};

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportLockUnlockProfiles.gui]).then((userProperties) => {
        user = userProperties;

        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          notReferencedMappingProfile.name,
        ).then((response) => {
          notReferencedMappingProfileId = response.body.id;
        });

        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          referencedMappingProfile.name,
        ).then((response) => {
          referencedMappingProfileId = response.body.id;

          ExportNewJobProfile.createNewJobProfileViaApi(
            referencedMappingProfile.jobProfileName,
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
      if (notReferencedMappingProfileId) {
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(notReferencedMappingProfileId);
      }
      if (referencedMappingProfileId) {
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(referencedMappingProfileId);
      }

      // Delete duplicated profiles
      // Unlock and delete locked duplicated profile
      ExportFieldMappingProfiles.getFieldMappingProfile({
        query: `"name"=="${referencedMappingProfile.duplicatedName}"`,
      }).then((response) => {
        if (response) {
          // Unlock the profile first
          cy.editFieldMappingProfile(response.id, {
            ...response,
            locked: false,
          }).then(() => {
            DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
          });
        }
      });

      // Delete unlocked duplicated profile
      ExportFieldMappingProfiles.getFieldMappingProfile({
        query: `"name"=="${notReferencedMappingProfile.duplicatedName}"`,
      }).then((response) => {
        if (response) {
          DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
        }
      });

      Users.deleteViaApi(user.userId);
    });

    it(
      'C1046004 User with "Settings - UI-Data-Export Settings Lock - Edit" capability set is able to duplicate unlocked mapping profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C1046004'] },
      () => {
        // Step 1: Select existing unlocked mapping profile from Preconditions: mapping profile not referenced in job profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(notReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.waitLoading(notReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.verifyElements();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        SingleFieldMappingProfilePane.verifyActionOptions();

        // Step 2: Click on Actions menu => Duplicate option
        SingleFieldMappingProfilePane.clickDuplicateButton();
        SingleFieldMappingProfilePane.verifyNameTextField(
          `Copy of ${notReferencedMappingProfile.name}`,
        );
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, false);
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCancelButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCloseButtonDisabled(false);
        SettingsDataExport.verifyPageTitle(
          'Data export settings - New field mapping profile - FOLIO',
        );

        // Step 3: Click "Cancel" button without making any changes
        SingleFieldMappingProfilePane.clickCancelButton();
        ExportFieldMappingProfiles.verifyFieldMappingProfilesPane();

        // Step 4: Repeat Steps 1-2, Make any changes on the mapping profile, Click "Cancel" button
        ExportFieldMappingProfiles.searchFieldMappingProfile(notReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(notReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.waitLoading(notReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.clickDuplicateButton();
        SingleFieldMappingProfilePane.editFieldMappingProfile(
          'Temp name for cancel test',
          'Temp description',
        );
        SingleFieldMappingProfilePane.clickCancelButton();
        SingleFieldMappingProfilePane.clickCloseWithoutSavingButton();
        ExportFieldMappingProfiles.clearSearchField();
        ExportFieldMappingProfiles.verifyFieldMappingProfilesPane();
        ExportFieldMappingProfiles.verifyProfileNotInList('Temp name for cancel test');

        // Step 5: Repeat Steps 1-2, Make any changes on the mapping profile except "Lock profile" checkbox, Click "Save & close" button
        ExportFieldMappingProfiles.searchFieldMappingProfile(notReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(notReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.waitLoading(notReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.clickDuplicateButton();
        SingleFieldMappingProfilePane.editFieldMappingProfile(
          notReferencedMappingProfile.duplicatedName,
          notReferencedMappingProfile.duplicatedDescription,
        );
        SingleFieldMappingProfilePane.checkRecordType('Item');
        ExportNewFieldMappingProfile.clickAddTransformationsButton();
        ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
        ModalSelectTransformations.clickFieldNameCheckbox('Item - ID');
        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          ...itemTransformationRules,
        );
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(addedTransformationCalloutMessage);
        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(
          `The field mapping profile ${notReferencedMappingProfile.duplicatedName} has been successfully created`,
        );

        // Step 6: Verify row with duplicated mapping profile in "Field mapping profiles" table
        ExportFieldMappingProfiles.searchFieldMappingProfile(
          notReferencedMappingProfile.duplicatedName,
        );
        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          notReferencedMappingProfile.duplicatedName,
          'Srs,Item',
          'MARC',
          duplicatedDate,
          `${user.personal.firstName} ${user.personal.lastName}`,
          '',
        );

        // Step 7: Click on the row with duplicated mapping profile
        ExportFieldMappingProfiles.searchFieldMappingProfile(
          notReferencedMappingProfile.duplicatedName,
        );
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          notReferencedMappingProfile.duplicatedName,
        );
        SingleFieldMappingProfilePane.waitLoading(notReferencedMappingProfile.duplicatedName);
        SingleFieldMappingProfilePane.verifyProfileDetails({
          name: notReferencedMappingProfile.duplicatedName,
          recordType: 'Source record storage (entire record)Item',
          outputFormat: 'MARC',
          description: notReferencedMappingProfile.duplicatedDescription,
          source: user.username,
          transformation: '',
        });
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...itemTransformationRules);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);

        // Step 8: Close Mapping profile view page by clicking "X" button, Select existing unlocked mapping profile from Preconditions: mapping profile referenced in job profile
        SingleFieldMappingProfilePane.clickXButton();
        ExportFieldMappingProfiles.clearSearchField();
        ExportFieldMappingProfiles.searchFieldMappingProfile(referencedMappingProfile.name);
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(referencedMappingProfile.name);
        SingleFieldMappingProfilePane.waitLoading(referencedMappingProfile.name);
        SingleFieldMappingProfilePane.verifyElements();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);

        // Step 9: Click on Actions menu => Duplicate option, Make any changes on the mapping profile, Check "Lock profile" checkbox, Click "Save & close" button
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.clickDuplicateButton();
        SingleFieldMappingProfilePane.editFieldMappingProfile(
          referencedMappingProfile.duplicatedName,
          referencedMappingProfile.description,
        );
        SingleFieldMappingProfilePane.checkRecordType('Holdings');
        ExportNewFieldMappingProfile.clickAddTransformationsButton();
        ModalSelectTransformations.clickFieldNameCheckbox('Holdings - ID');
        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          ...holdingsTransformationRules,
        );
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(addedTransformationCalloutMessage);
        ExportNewFieldMappingProfile.checkCheckbox('Lock profile');
        ExportNewFieldMappingProfile.verifyLockProfileCheckbox(false, true);

        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(
          `The field mapping profile ${referencedMappingProfile.duplicatedName} has been successfully created`,
        );

        // Step 10: Verify row with duplicated mapping profile in "Field mapping profiles" table
        ExportFieldMappingProfiles.searchFieldMappingProfile(
          referencedMappingProfile.duplicatedName,
        );
        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          referencedMappingProfile.duplicatedName,
          'Srs,Holdings',
          'MARC',
          duplicatedDate,
          `${user.personal.firstName} ${user.personal.lastName}`,
          'Locked',
        );

        // Step 11: Click on the row with duplicated mapping profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          referencedMappingProfile.duplicatedName,
        );
        SingleFieldMappingProfilePane.waitLoading(referencedMappingProfile.duplicatedName);
        SingleFieldMappingProfilePane.verifyProfileDetails({
          name: referencedMappingProfile.duplicatedName,
          recordType: 'Source record storage (entire record)Holdings',
          outputFormat: 'MARC',
          description: referencedMappingProfile.description,
          source: user.username,
          transformation: '',
        });
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...holdingsTransformationRules);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(true, true);
      },
    );
  });
});
