// import {
//   ACCEPTED_DATA_TYPE_NAMES,
//   ACTION_NAMES_IN_ACTION_PROFILE,
//   EXISTING_RECORDS_NAMES,
//   FOLIO_RECORD_TYPE,
//   INSTANCE_STATUS_TERM_NAMES,
//   RECORD_STATUSES,
// } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
// import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
// import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
// import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
// import Logs from '../../../support/fragments/data_import/logs/logs';
// import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
// import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
// import {
//   ActionProfiles as SettingsActionProfiles,
//   FieldMappingProfiles as SettingsFieldMappingProfiles,
//   JobProfiles as SettingsJobProfiles,
//   MatchProfiles as SettingsMatchProfiles,
// } from '../../../support/fragments/settings/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
// import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    // const marcFilePath = 'oneThousandMarcBib.mrc';
    // const marcFileName = `C404412 autotestFile${getRandomPostfix()}.mrc`;

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileViaApi();
      NewFieldMappingProfile.createHoldingsMappingProfileViaApi();
      NewFieldMappingProfile.createItemMappingProfileViaApi();
      NewActionProfile.createActionProfileViaApiMarc();

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    // after('Delete test data', () => {
    //   // delete created files in fixtures
    //   FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
    //   FileManager.deleteFileFromDownloadsByMask(`*${exportedFileName}`);
    //   cy.getAdminToken().then(() => {
    //     SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
    //     SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
    //     SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
    //     SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
    //     SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileForUpdate.name);
    //     SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    //     SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileForUpdate.name);
    //     cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
    //       (instance) => {
    //         InventoryInstance.deleteInstanceViaApi(instance.id);
    //       },
    //     );
    //   });
    // });

    it(
      'C404412 Data-Slicing: Data import of a file with exact number of records for 1 slice (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {},
    );
  });
});
