import permissions from '../../../../support/dictionary/permissions';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import SingleFieldMappingProfilePane from '../../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane';
import ExportNewFieldMappingProfile, {
  CHECKBOX_NAMES,
} from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ModalSelectTransformations from '../../../../support/fragments/data-export/exportMappingProfile/modalSelectTransformations';
import SettingsDataExport from '../../../../support/fragments/data-export/settingsDataExport';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';

let user;
const fieldMappingProfileName = getTestEntityValue('fieldMappingProfile');
const newTransformationCalloutMessage = '1 transformation has been successfully added';
const newFieldMappingProfileCalloutMessage = `The field mapping profile ${fieldMappingProfileName} has been successfully created`;

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      ExportFieldMappingProfiles.getFieldMappingProfile({
        query: `"name"=="${fieldMappingProfileName}"`,
      }).then((response) => {
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C10984 User with "Settings - UI-Data-Export Settings - Edit" capability set is able to create unlocked mapping profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C10984'] },
      () => {
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        ExportNewFieldMappingProfile.clickNewButton();
        ExportNewFieldMappingProfile.verifyNewProfileForm();
        ExportNewFieldMappingProfile.verifyLockProfileCheckbox(true, false);
        SettingsDataExport.verifyPageTitle(
          'Data export settings - New field mapping profile - FOLIO',
        );
        ExportNewFieldMappingProfile.fillInName(fieldMappingProfileName);
        ExportNewFieldMappingProfile.checkCheckbox(CHECKBOX_NAMES.INVENTORY_INSTANCE);
        ExportNewFieldMappingProfile.verifySaveAndCloseButtonDisabled(false);
        ExportNewFieldMappingProfile.clickAddTransformationsButton();

        ModalSelectTransformations.verifyTransformationsPaneColumns();
        ModalSelectTransformations.verifySearchAndFilterPane();
        ModalSelectTransformations.verifySaveAndCloseButtonDisabled();
        ModalSelectTransformations.verifyCancelButtonDisabled(false);
        ModalSelectTransformations.verifyCloseFormButtonDisabled(false);

        ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
        ModalSelectTransformations.uncheckItemRecordTypeChechbox();
        ModalSelectTransformations.clickFieldNameCheckbox('Instance - ID');

        const transformationRules = ['Instance - ID', '999', 'f', 'f', 'i'];

        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          ...transformationRules,
        );

        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(newTransformationCalloutMessage);
        ModalSelectTransformations.verifyModalTransformationExists(false);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...transformationRules);

        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(newFieldMappingProfileCalloutMessage);

        const updatedDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');

        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          fieldMappingProfileName,
          'Instance',
          'MARC',
          updatedDate,
          `${user.personal.firstName} ${user.username}`,
        );
        ExportFieldMappingProfiles.searchFieldMappingProfile(fieldMappingProfileName);
        ExportFieldMappingProfiles.verifyProfileNameOnTheList(fieldMappingProfileName);
        ExportFieldMappingProfiles.clickProfileNameFromTheList(fieldMappingProfileName);

        const profileDetails = {
          source: user.username,
          name: fieldMappingProfileName,
          recordType: 'Instance',
          outputFormat: 'MARC',
          description: 'No value set-',
          transformation: '',
        };

        SingleFieldMappingProfilePane.verifyProfileDetails(profileDetails);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...transformationRules);
      },
    );
  });
});
