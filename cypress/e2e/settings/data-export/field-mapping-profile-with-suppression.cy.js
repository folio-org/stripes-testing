import permissions from '../../../support/dictionary/permissions';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile, { CHECKBOX_NAMES } from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ModalSelectTransformations from '../../../support/fragments/data-export/exportMappingProfile/modalSelectTransformations';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import SingleFieldMappingProfilePane from '../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane';

let user;
const fieldMappingProfileName = getTestEntityValue('fieldMappingProfile');
const fieldsSuppressionErrorText =
  'Suppressed fields can be represented by three digits only and need to be separated by a comma.';
const newFieldMappingProfileCalloutMessage = `The field mapping profile ${fieldMappingProfileName} has been successfully created`;
const updatedFieldMappingProfileCalloutMessage = `The field mapping profile ${fieldMappingProfileName} has been successfully saved`;
const duplicatedFieldMappingProfileName = `Copy of ${fieldMappingProfileName}`;
const duplicatedFieldMappingProfileCalloutMessage = `The field mapping profile ${duplicatedFieldMappingProfileName} has been successfully created`;

describe('settings: data-export', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
    });
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
    'C468217 Verify field mapping profile with fields for suppression (firebird)',
    { tags: ['criticalPath', 'firebird'] },
    () => {
      ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
      ExportNewFieldMappingProfile.clickNewButton();
      ExportNewFieldMappingProfile.verifyNewProfileForm();
      ExportNewFieldMappingProfile.fillInName(fieldMappingProfileName);
      ExportNewFieldMappingProfile.checkCheckbox(CHECKBOX_NAMES.SRS);
      ExportNewFieldMappingProfile.verifyFieldsSuppressionTextareaDisabled(false);
      ExportNewFieldMappingProfile.fillInFieldsSuppressionTextarea('a');
      ExportNewFieldMappingProfile.clickSaveAndClose();
      ExportNewFieldMappingProfile.verifyFieldsSuppressionTextareaError(fieldsSuppressionErrorText);
      ExportNewFieldMappingProfile.clearFieldsSuppressionTextarea();
      ExportNewFieldMappingProfile.fillInFieldsSuppressionTextarea('9000');
      ExportNewFieldMappingProfile.verifyFieldsSuppressionTextareaError(fieldsSuppressionErrorText);
      ExportNewFieldMappingProfile.clearFieldsSuppressionTextarea();
      ExportNewFieldMappingProfile.fillInFieldsSuppressionTextarea('900', '901');
      ExportNewFieldMappingProfile.verifyFieldsSuppressionTextareaError(fieldsSuppressionErrorText);
      ExportNewFieldMappingProfile.clearFieldsSuppressionTextarea();
      ExportNewFieldMappingProfile.fillInFieldsSuppressionTextarea('900,', '901');
      ExportNewFieldMappingProfile.verifyFieldsSuppressionTextareaError(undefined);
      ExportFieldMappingProfiles.saveMappingProfile();
      InteractorsTools.checkCalloutMessage(newFieldMappingProfileCalloutMessage);
      ExportFieldMappingProfiles.verifyProfileNameOnTheList(fieldMappingProfileName);

      SingleFieldMappingProfilePane.clickProfileNameFromTheList(fieldMappingProfileName);
      SingleFieldMappingProfilePane.verifyElements();

      const profileDetails = {
        source: 'Unknown user',
        name: fieldMappingProfileName,
        recordType: 'Source record storage (entire record)',
        outputFormat: 'MARC',
        description: 'No value set-',
        fieldsSuppression: '900,\n901',
      };
      SingleFieldMappingProfilePane.verifyProfileDetails(profileDetails);
      SingleFieldMappingProfilePane.openActions();
      SingleFieldMappingProfilePane.clickEditButton();
      ExportNewFieldMappingProfile.checkCheckbox(CHECKBOX_NAMES.SRS);
      ExportNewFieldMappingProfile.verifyFieldsSuppressionTextareaDisabled(true);
      ExportNewFieldMappingProfile.verifyFolioRecordTypeError(true, 'Please enter a value');
      ExportNewFieldMappingProfile.checkCheckbox(
        CHECKBOX_NAMES.INVENTORY_INSTANCE,
        CHECKBOX_NAMES.HOLDINGS,
        CHECKBOX_NAMES.ITEM,
      );
      ExportNewFieldMappingProfile.verifyFolioRecordTypeError(false);
      ExportNewFieldMappingProfile.verifyFieldsSuppressionTextareaDisabled(false);
      ExportNewFieldMappingProfile.clearFieldsSuppressionTextarea();
      ExportNewFieldMappingProfile.clearFieldsSuppressionTextarea();
      ExportNewFieldMappingProfile.fillInFieldsSuppressionTextarea('501,', '502,', '503');
      ExportNewFieldMappingProfile.verifyFieldsSuppressionTextareaError();
      ExportNewFieldMappingProfile.checkCheckbox(CHECKBOX_NAMES.SUPPRESS_999_FF);
      SingleFieldMappingProfilePane.clickEditTransformations();

      ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
      ModalSelectTransformations.uncheckItemRecordTypeChechbox();
      ModalSelectTransformations.clickNthCheckbox();
      ModalSelectTransformations.fillInTransformationsTextfields('456', '1', '2', '$a');

      ModalSelectTransformations.uncheckInstanceRecordTypeChechbox();
      ModalSelectTransformations.checkHoldingsRecordTypeChechbox();
      ModalSelectTransformations.clickNthCheckbox();
      ModalSelectTransformations.fillInTransformationsTextfields('456', '1', '2', '$a');

      ModalSelectTransformations.checkItemRecordTypeChechbox();
      ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
      ModalSelectTransformations.clickNthCheckbox();
      ModalSelectTransformations.fillInTransformationsTextfields('456', '1', '2', '$a');

      ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
      ExportNewFieldMappingProfile.checkCheckbox(
        CHECKBOX_NAMES.INVENTORY_INSTANCE,
        CHECKBOX_NAMES.HOLDINGS,
      );
      ExportNewFieldMappingProfile.verifyFieldsSuppressionTextareaDisabled(true);
      ExportNewFieldMappingProfile.checkCheckbox(
        CHECKBOX_NAMES.INVENTORY_INSTANCE,
        CHECKBOX_NAMES.HOLDINGS,
      );
      ExportNewFieldMappingProfile.fillInFieldsSuppressionTextarea('501,', '502,', '503');
      ExportFieldMappingProfiles.saveMappingProfile();
      InteractorsTools.checkCalloutMessage(updatedFieldMappingProfileCalloutMessage);
      ExportFieldMappingProfiles.verifyProfileNameOnTheList(fieldMappingProfileName);

      SingleFieldMappingProfilePane.clickProfileNameFromTheList(fieldMappingProfileName);
      SingleFieldMappingProfilePane.verifyActionOptions();
      SingleFieldMappingProfilePane.duplicateFieldMappingProfile();
      InteractorsTools.checkCalloutMessage(duplicatedFieldMappingProfileCalloutMessage);
      ExportFieldMappingProfiles.verifyProfileNameOnTheList(duplicatedFieldMappingProfileName);
      ExportFieldMappingProfiles.deleteMappingProfile(duplicatedFieldMappingProfileName);
    },
  );
});
