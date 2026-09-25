import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ModalSelectProfile from '../../../support/fragments/data_import/job_profiles/modalSelectProfile';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import ActionProfileView from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SelectProfileModal from '../../../support/fragments/settings/dataImport/modals/selectProfileModal';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;

describe('Data Import', () => {
  describe('Settings', () => {
    const marcFixtureName = 'oneMarcBib.mrc';
    const fileName = `AT_C343280_testMarcFile_${getRandomPostfix()}.mrc`;
    const derivedJobProfileName = 'quickMARC - Derive a new SRS MARC Bib and Instance';
    // Action profile and field mapping profile share the exact same name
    const derivedProfileName = 'quickMARC Derive - Create Inventory Instance';

    before('Login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C343280 Suppress quickMARC Derive profiles from Data Import jobs (promin)',
      { tags: ['extendedPath', 'promin', 'C343280'] },
      () => {
        // Steps 1-2: upload a MARC file - the Derive job profile is not offered in the choose-jobs list
        DataImport.uploadFile(marcFixtureName, fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(derivedJobProfileName);
        JobProfiles.verifyJobProfileShownInList(derivedJobProfileName, false);

        // Step 3: delete the uploaded file
        JobProfiles.deleteUploadedFile(fileName);
        JobProfiles.verifyDeleteUploadedFileModal();
        JobProfiles.confirmDeleteUploadedFile();

        // Steps 4-6: Settings > Job profiles - the Derive job profile IS shown in the list;
        // opening it and its Actions menu shows Edit, Delete and Duplicate all disabled
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.search(derivedJobProfileName);
        JobProfiles.openJobProfileView(derivedJobProfileName);
        JobProfileView.checkActionsMenuOptionsEnabled({
          editEnabled: false,
          duplicateEnabled: false,
          deleteEnabled: false,
        });

        // Steps 7-9: Settings > Action profiles - the Derive action profile IS shown; its
        // Actions menu has Edit and Delete disabled, but Duplicate can still be used
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        ActionProfiles.search(derivedProfileName);
        ActionProfiles.selectActionProfileFromList(derivedProfileName);
        ActionProfileView.verifyActionsMenuOptionsDisabled(['Edit', 'Delete']);
        ActionProfileView.verifyActionsMenuOptionsDisabled('Duplicate', {
          isDisabled: false,
          openMenu: false,
        });

        // Steps 10-12: Settings > Field mapping profiles - the Derive mapping profile IS shown;
        // its Actions menu has Edit and Delete disabled, but Duplicate can still be used
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.search(derivedProfileName);
        FieldMappingProfiles.selectMappingProfileFromList(derivedProfileName);
        FieldMappingProfileView.verifyActionsMenuOptionsDisabled(['Edit', 'Delete']);
        FieldMappingProfileView.verifyActionsMenuOptionsDisabled('Duplicate', {
          isDisabled: false,
          openMenu: false,
        });

        // Steps 13-16: New action profile > Link field mapping profile - Derive mapping profile absent; cancel
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        ActionProfiles.openNewActionProfileForm();
        NewActionProfile.clickLinkProfileButton();
        SelectProfileModal.searchProfileAbsent(derivedProfileName);
        SelectProfileModal.close();

        // Steps 17-19: New field mapping profile > Link action profile - Derive action profile absent; cancel
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.clickLinkProfileButton();
        SelectProfileModal.searchProfileAbsent(derivedProfileName);
        SelectProfileModal.close();
        NewFieldMappingProfile.clickClose();

        // Steps 20-21: New job profile > + Add Action - Derive action profile absent
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.clickAddActionButton();
        ModalSelectProfile.searchProfileByNameAbsent(derivedProfileName);
      },
    );
  });
});
