import permissions from '../../../../support/dictionary/permissions';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import SingleFieldMappingProfilePane from '../../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane';
import ModalSelectTransformations from '../../../../support/fragments/data-export/exportMappingProfile/modalSelectTransformations';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
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
const holdingsTransformationRules = ['Holdings - ID', '901', 'a', 'a', 'h'];
const addedTransformationCalloutMessage = '1 transformation has been successfully added';

const lockedNotReferencedMappingProfile = {
  name: getTestEntityValue('C1045995_LockedNotRefMappingProfile'),
  duplicatedName: getTestEntityValue('C1045995_DuplicatedNotRef'),
  duplicatedDescription: getTestEntityValue('C1045995_DuplicatedDescription'),
};

const lockedReferencedMappingProfile = {
  name: getTestEntityValue('C1045995_LockedRefMappingProfile'),
  jobProfileName: getTestEntityValue('C1045995_JobProfile'),
  duplicatedName: getTestEntityValue('C1045995_DuplicatedRef'),
  description: getTestEntityValue('C1045995_Description'),
};

const defaultHoldingsMappingProfile = {
  name: 'Default holdings mapping profile',
  duplicatedName: getTestEntityValue('C1045995_DuplicatedDefaultHoldings'),
};

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
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
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      if (jobProfileId) {
        ExportJobProfiles.deleteJobProfileViaApi(jobProfileId);
      }

      // Unlock and delete locked profiles
      if (lockedNotReferencedMappingProfileId) {
        ExportFieldMappingProfiles.getFieldMappingProfile({
          query: `"id"=="${lockedNotReferencedMappingProfileId}"`,
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

      if (lockedReferencedMappingProfileId) {
        ExportFieldMappingProfiles.getFieldMappingProfile({
          query: `"id"=="${lockedReferencedMappingProfileId}"`,
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

      // Delete duplicated profiles
      [
        lockedNotReferencedMappingProfile.duplicatedName,
        lockedReferencedMappingProfile.duplicatedName,
        defaultHoldingsMappingProfile.duplicatedName,
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
      'C1045995 User with "Settings - UI-Data-Export Settings - Edit" capability set is able to duplicate locked and default mapping profiles (firebird)',
      { tags: ['criticalPath', 'firebird', 'C1045995'] },
      () => {
        // Step 1: Select existing locked mapping profile from Preconditions: locked mapping profile not referenced in job profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          lockedNotReferencedMappingProfile.name,
        );
        SingleFieldMappingProfilePane.waitLoading(lockedNotReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.verifyElements();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(true, true);

        // Step 2: Click "Actions" menu button
        SingleFieldMappingProfilePane.verifyOnlyDuplicateOptionAvailable();

        // Step 3: Click on Actions menu => Duplicate option
        SingleFieldMappingProfilePane.clickDuplicateButton();
        SingleFieldMappingProfilePane.verifyNameTextField(
          `Copy of ${lockedNotReferencedMappingProfile.name}`,
        );
        SingleFieldMappingProfilePane.verifyOutputFormatValue('MARC');
        SingleFieldMappingProfilePane.verifyCheckboxChecked(
          'Source record storage (entire record)',
        );
        SingleFieldMappingProfilePane.verifyCheckboxNotChecked(
          'Inventory instance (selected fields)',
          true,
        );
        SingleFieldMappingProfilePane.verifyCheckboxNotChecked('Holdings');
        SingleFieldMappingProfilePane.verifyCheckboxNotChecked('Item');
        SingleFieldMappingProfilePane.verifyCheckboxNotChecked('Suppress 999 ff');
        SingleFieldMappingProfilePane.verifyDescriptionTextArea('');
        SingleFieldMappingProfilePane.verifyFieldsSuppressionTextAreaValue('');
        SingleFieldMappingProfilePane.verifyNoTransformationsMessage();
        SingleFieldMappingProfilePane.verifyMetadataSectionExists();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCancelButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCloseButtonDisabled(false);
        SettingsDataExport.verifyPageTitle(
          'Data export settings - New field mapping profile - FOLIO',
        );

        // Step 4: Make changes to any fields from mapping profile form, Click "Save & close" button
        SingleFieldMappingProfilePane.editFieldMappingProfile(
          lockedNotReferencedMappingProfile.duplicatedName,
          lockedNotReferencedMappingProfile.duplicatedDescription,
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
          `The field mapping profile ${lockedNotReferencedMappingProfile.duplicatedName} has been successfully created`,
        );

        // Step 5: Verify row with duplicated mapping profile in "Field mapping profiles" table
        ExportFieldMappingProfiles.searchFieldMappingProfile(
          lockedNotReferencedMappingProfile.duplicatedName,
        );
        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          lockedNotReferencedMappingProfile.duplicatedName,
          'Srs,Item',
          'MARC',
          duplicatedDate,
          `${user.personal.firstName} ${user.personal.lastName}`,
          '',
        );

        // Step 6: Click on the row with duplicated mapping profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          lockedNotReferencedMappingProfile.duplicatedName,
        );
        SingleFieldMappingProfilePane.waitLoading(lockedNotReferencedMappingProfile.duplicatedName);
        SingleFieldMappingProfilePane.verifyProfileDetails({
          name: lockedNotReferencedMappingProfile.duplicatedName,
          recordType: 'Source record storage (entire record)Item',
          outputFormat: 'MARC',
          description: lockedNotReferencedMappingProfile.duplicatedDescription,
          source: user.username,
          transformation: '',
        });
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...itemTransformationRules);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);

        // Step 7: Select existing locked mapping profile from Preconditions: locked mapping profile referenced in job profile
        SingleFieldMappingProfilePane.clickXButton();
        ExportFieldMappingProfiles.clearSearchField();
        ExportFieldMappingProfiles.searchFieldMappingProfile(lockedReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          lockedReferencedMappingProfile.name,
        );
        SingleFieldMappingProfilePane.waitLoading(lockedReferencedMappingProfile.name);
        SingleFieldMappingProfilePane.verifyElements();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(true, true);

        // Step 8: Click "Actions" menu button
        SingleFieldMappingProfilePane.verifyOnlyDuplicateOptionAvailable();

        // Step 9: Click on Actions menu => Duplicate option
        SingleFieldMappingProfilePane.clickDuplicateButton();
        SingleFieldMappingProfilePane.verifyNameTextField(
          `Copy of ${lockedReferencedMappingProfile.name}`,
        );
        SingleFieldMappingProfilePane.verifyOutputFormatValue('MARC');
        SingleFieldMappingProfilePane.verifyCheckboxChecked(
          'Source record storage (entire record)',
        );
        SingleFieldMappingProfilePane.verifyCheckboxNotChecked(
          'Inventory instance (selected fields)',
          true,
        );
        SingleFieldMappingProfilePane.verifyCheckboxNotChecked('Holdings');
        SingleFieldMappingProfilePane.verifyCheckboxNotChecked('Item');
        SingleFieldMappingProfilePane.verifyCheckboxNotChecked('Suppress 999 ff');
        SingleFieldMappingProfilePane.verifyDescriptionTextArea('');
        SingleFieldMappingProfilePane.verifyFieldsSuppressionTextAreaValue('');
        SingleFieldMappingProfilePane.verifyNoTransformationsMessage();
        SingleFieldMappingProfilePane.verifyMetadataSectionExists();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCancelButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCloseButtonDisabled(false);
        SettingsDataExport.verifyPageTitle(
          'Data export settings - New field mapping profile - FOLIO',
        );

        // Step 10: Make changes to any fields from mapping profile form, Click "Save & close" button
        SingleFieldMappingProfilePane.editFieldMappingProfile(
          lockedReferencedMappingProfile.duplicatedName,
          lockedReferencedMappingProfile.description,
        );
        SingleFieldMappingProfilePane.checkRecordType('Source record storage (entire record)');
        ExportNewFieldMappingProfile.checkCheckbox('Inventory instance (selected fields)');
        ExportNewFieldMappingProfile.clickAddTransformationsButton();
        ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
        ModalSelectTransformations.uncheckItemRecordTypeChechbox();
        ModalSelectTransformations.clickFieldNameCheckbox('Instance - ID');
        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          ...instanceTransformationRules,
        );
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(addedTransformationCalloutMessage);
        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(
          `The field mapping profile ${lockedReferencedMappingProfile.duplicatedName} has been successfully created`,
        );

        // Step 11: Verify row with duplicated mapping profile in "Field mapping profiles" table
        ExportFieldMappingProfiles.searchFieldMappingProfile(
          lockedReferencedMappingProfile.duplicatedName,
        );
        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          lockedReferencedMappingProfile.duplicatedName,
          'Instance',
          'MARC',
          duplicatedDate,
          `${user.personal.firstName} ${user.personal.lastName}`,
          '',
        );

        // Step 12: Click on the row with duplicated mapping profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          lockedReferencedMappingProfile.duplicatedName,
        );
        SingleFieldMappingProfilePane.waitLoading(lockedReferencedMappingProfile.duplicatedName);
        SingleFieldMappingProfilePane.verifyProfileDetails({
          name: lockedReferencedMappingProfile.duplicatedName,
          recordType: 'Instance',
          outputFormat: 'MARC',
          description: lockedReferencedMappingProfile.description,
          source: user.username,
          transformation: '',
        });
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...instanceTransformationRules);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);

        // Step 13: Select Default holdings mapping profile
        SingleFieldMappingProfilePane.clickXButton();
        ExportFieldMappingProfiles.clearSearchField();
        ExportFieldMappingProfiles.searchFieldMappingProfile(defaultHoldingsMappingProfile.name);
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          defaultHoldingsMappingProfile.name,
        );
        SingleFieldMappingProfilePane.waitLoading(defaultHoldingsMappingProfile.name);
        SingleFieldMappingProfilePane.verifyElements();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);

        // Step 14: Click "Actions" menu button
        SingleFieldMappingProfilePane.verifyOnlyDuplicateOptionAvailable();

        // Step 15: Click on Actions menu => Duplicate option
        SingleFieldMappingProfilePane.clickDuplicateButton();
        SingleFieldMappingProfilePane.verifyNameTextField(
          `Copy of ${defaultHoldingsMappingProfile.name}`,
        );
        SingleFieldMappingProfilePane.verifyOutputFormatValue('MARC');
        SingleFieldMappingProfilePane.verifyCheckboxChecked('Holdings');
        SingleFieldMappingProfilePane.verifyCheckboxNotChecked(
          'Inventory instance (selected fields)',
        );
        SingleFieldMappingProfilePane.verifyCheckboxNotChecked(
          'Source record storage (entire record)',
        );
        SingleFieldMappingProfilePane.verifyCheckboxNotChecked('Item');
        SingleFieldMappingProfilePane.verifyCheckboxNotChecked('Suppress 999 ff');
        SingleFieldMappingProfilePane.verifyDescriptionTextArea(
          'Default mapping profile for MARC for holdings record',
        );
        SingleFieldMappingProfilePane.verifyFieldsSuppressionTextAreaValue('');
        SingleFieldMappingProfilePane.verifyNoTransformationsMessage();
        SingleFieldMappingProfilePane.verifyMetadataSectionExists();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        SingleFieldMappingProfilePane.verifySaveAndCloseButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCancelButtonDisabled(false);
        SingleFieldMappingProfilePane.verifyCloseButtonDisabled(false);
        SettingsDataExport.verifyPageTitle(
          'Data export settings - New field mapping profile - FOLIO',
        );

        // Step 16: Make changes to any fields from mapping profile form, Click "Save & close" button
        SingleFieldMappingProfilePane.editFieldMappingProfile(
          defaultHoldingsMappingProfile.duplicatedName,
          'Duplicated default holdings profile',
        );
        ExportNewFieldMappingProfile.clickAddTransformationsButton();
        ModalSelectTransformations.uncheckItemRecordTypeChechbox();
        ModalSelectTransformations.uncheckInstanceRecordTypeChechbox();
        ModalSelectTransformations.clickFieldNameCheckbox('Holdings - ID');
        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          ...holdingsTransformationRules,
        );
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(addedTransformationCalloutMessage);
        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(
          `The field mapping profile ${defaultHoldingsMappingProfile.duplicatedName} has been successfully created`,
        );

        // Step 17: Verify row with duplicated mapping profile in "Field mapping profiles" table
        ExportFieldMappingProfiles.searchFieldMappingProfile(
          defaultHoldingsMappingProfile.duplicatedName,
        );
        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          defaultHoldingsMappingProfile.duplicatedName,
          'Holdings',
          'MARC',
          duplicatedDate,
          `${user.personal.firstName} ${user.personal.lastName}`,
          '',
        );

        // Step 18: Click on the row with duplicated mapping profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          defaultHoldingsMappingProfile.duplicatedName,
        );
        SingleFieldMappingProfilePane.waitLoading(defaultHoldingsMappingProfile.duplicatedName);
        SingleFieldMappingProfilePane.verifyProfileDetails({
          name: defaultHoldingsMappingProfile.duplicatedName,
          recordType: 'Holdings',
          outputFormat: 'MARC',
          description: 'Duplicated default holdings profile',
          source: user.username,
          transformation: '',
        });
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...holdingsTransformationRules);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);

        // Step 19: In DevTools verify "default" value for duplicated mapping profile
        ExportFieldMappingProfiles.getFieldMappingProfile({
          query: `"name"=="${defaultHoldingsMappingProfile.duplicatedName}"`,
        }).then((response) => {
          expect(response.default).to.equal(false);
        });
      },
    );
  });
});
