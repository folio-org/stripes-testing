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
const fieldMappingProfileName = getTestEntityValue('C1046001_LockedMappingProfile');
const addedTransformationCalloutMessage = '2 transformations have been successfully added';
const createdMappingProfileCalloutMessage = `The field mapping profile ${fieldMappingProfileName} has been successfully created`;
const holdingsTransformationRules = [
  'Holdings - Permanent location - Code',
  '866',
  '\\',
  '\\',
  'z',
];
const itemTransformationRules = ['Item - Barcode', '955', '\\', '\\', 'b'];

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportLockUnlockProfiles.gui]).then((userProperties) => {
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
        if (response.id) {
          cy.editFieldMappingProfile(response.id, {
            ...response,
            locked: false,
          }).then(() => {
            DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(response.id);
          });
        }
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1046001 User with "Settings - UI-Data-Export Settings Lock - Edit" capability set is able to create locked mapping profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C1046001'] },
      () => {
        // Step 1: Click "New" button in the header of "Field mapping profiles" pane
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        ExportNewFieldMappingProfile.clickNewButton();
        ExportNewFieldMappingProfile.verifyNewProfileForm();
        SettingsDataExport.verifyPageTitle(
          'Data export settings - New field mapping profile - FOLIO',
        );

        // Step 2: Verify elements on "New field mapping profile" form (already verified in verifyNewProfileForm)
        // Lock profile checkbox verification
        ExportNewFieldMappingProfile.verifyLockProfileCheckbox(false, false);

        // Step 3: Fill in "Name*" field, Check "Lock profile" checkbox, Check "SRS", "Holdings", "Item" checkboxes
        ExportNewFieldMappingProfile.fillInName(fieldMappingProfileName);
        ExportNewFieldMappingProfile.checkCheckbox('Lock profile');
        ExportNewFieldMappingProfile.checkCheckbox(
          CHECKBOX_NAMES.SRS,
          CHECKBOX_NAMES.HOLDINGS,
          CHECKBOX_NAMES.ITEM,
        );
        ExportNewFieldMappingProfile.verifySaveAndCloseButtonDisabled(false);

        // Step 4: Click "Add transformations" button
        ExportNewFieldMappingProfile.clickAddTransformationsButton();
        ModalSelectTransformations.verifyTransformationsPaneColumns();
        ModalSelectTransformations.verifyCloseFormButtonDisabled(false);
        ModalSelectTransformations.verifyCancelButtonDisabled(false);
        ModalSelectTransformations.verifySaveAndCloseButtonDisabled();

        // Step 5: Select transformations for Holdings and Item record types
        // Select Holdings transformation
        ModalSelectTransformations.uncheckItemRecordTypeChechbox();
        ModalSelectTransformations.clickFieldNameCheckbox('Holdings - Permanent location - Code');
        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          ...holdingsTransformationRules,
        );

        // Select Item transformation
        ModalSelectTransformations.uncheckHoldingsRecordTypeChechbox();
        ModalSelectTransformations.checkItemRecordTypeChechbox();
        ModalSelectTransformations.clickFieldNameCheckbox('Item - Barcode');
        ModalSelectTransformations.fillInTransformationsTextfieldsByFieldName(
          ...itemTransformationRules,
        );

        // Step 6: Click "Save & close" button on "Select transformations" form
        ModalSelectTransformations.clickTransformationsSaveAndCloseButton();
        InteractorsTools.checkCalloutMessage(addedTransformationCalloutMessage);
        ModalSelectTransformations.verifyModalTransformationExists(false);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...holdingsTransformationRules);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...itemTransformationRules, 1);

        // Step 7: Click "Save & close" button on "New field mapping profile" form
        ExportFieldMappingProfiles.saveMappingProfile();
        InteractorsTools.checkCalloutMessage(createdMappingProfileCalloutMessage);
        ExportFieldMappingProfiles.verifyFieldMappingProfilesPane();

        // Step 8: Verify row with newly created mapping profile in "Field mapping profiles" table
        ExportFieldMappingProfiles.searchFieldMappingProfile(fieldMappingProfileName);
        ExportFieldMappingProfiles.verifyProfileNameOnTheList(fieldMappingProfileName);

        const createdDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');

        ExportFieldMappingProfiles.verifyValuesInAllColumnsOfFieldMappingProfile(
          fieldMappingProfileName,
          'Srs,Holdings,Item',
          'MARC',
          createdDate,
          `${user.personal.firstName} ${user.personal.lastName}`,
          'Locked',
        );

        // Step 9: Click on the row with created mapping profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(fieldMappingProfileName);
        SingleFieldMappingProfilePane.waitLoading(fieldMappingProfileName);

        const profileDetails = {
          source: user.username,
          name: fieldMappingProfileName,
          recordType: 'Source record storage (entire record)HoldingsItem',
          outputFormat: 'MARC',
          description: 'No value set-',
          transformation: '',
        };

        SingleFieldMappingProfilePane.verifyProfileDetails(profileDetails);
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(true, true);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...holdingsTransformationRules);
        ExportNewFieldMappingProfile.verifyAddedTransformationTable(...itemTransformationRules, 1);
      },
    );
  });
});
