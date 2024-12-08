// import {
//   ACCEPTED_DATA_TYPE_NAMES,
//   ACTION_NAMES_IN_ACTION_PROFILE,
//   APPLICATION_NAMES,
//   DEFAULT_JOB_PROFILE_NAMES,
//   EXISTING_RECORD_NAMES,
//   FOLIO_RECORD_TYPE,
//   INSTANCE_STATUS_TERM_NAMES,
//   JOB_STATUS_NAMES,
//   RECORD_STATUSES,
// } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
// import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
// import DataImport from '../../../support/fragments/data_import/dataImport';
// import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
// import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
// import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
// import Logs from '../../../support/fragments/data_import/logs/logs';
// import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
// import {
//   ActionProfiles as SettingsActionProfiles,
//   FieldMappingProfiles as SettingsFieldMappingProfiles,
//   JobProfiles as SettingsJobProfiles,
//   MatchProfiles as SettingsMatchProfiles,
// } from '../../../support/fragments/settings/dataImport';
// import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
// import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
// import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
// import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
// import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
// import SettingsDataImport, {
//   SETTINGS_TABS,
// } from '../../../support/fragments/settings/dataImport/settingsDataImport';
// import TopMenu from '../../../support/fragments/topMenu';
// // import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
// import Users from '../../../support/fragments/users/users';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
// import getRandomPostfix from '../../../support/utils/stringTools';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      OCLCAuthentication: '100481406/PAOLF',
      oclcNumber: '2773391',
    };

    const randomIdentifierCode = `(OCoLC)847143${generateItemBarcode()}8`;
    // const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    // const filePathForCreateInstance = 'marcFileForC347830.mrc';
    // const filePathForUpdateInstance = 'marcFileForC347830_1.mrc';
    // const editedMarcFileNameForCreate = `C347830 marcFileForCreate${getRandomPostfix()}.mrc`;
    // const editedMarcFileNameForUpdate = `C347830 marcFileForUpdate${getRandomPostfix()}.mrc`;
    // const fileNameForCreateInstance = `C347830 autotestFile${getRandomPostfix()}.mrc`;
    // const fileNameForUpdateInstance = `C347830 autotestFile${getRandomPostfix()}.mrc`;
    // const instanceGeneralNote = 'IDENTIFIER UPDATE 3';
    const resourceIdentifiers = [
      { type: 'UPC', value: 'ORD32671387-6' },
      { type: 'OCLC', value: randomIdentifierCode },
      { type: 'Invalid UPC', value: 'ORD32671387-6' },
      { type: 'System control number', value: '(AMB)84714376518561876438' },
    ];
    // const matchProfile = {
    //   profileName: `C347830 ID Match Test - Update3 (OCLC).${getRandomPostfix()}`,
    //   incomingRecordFields: {
    //     field: '035',
    //     in1: '*',
    //     in2: '*',
    //     subfield: 'a',
    //   },
    //   matchCriterion: 'Exactly matches',
    //   qualifierType: 'Begins with',
    //   qualifierValue: '(OCoLC)',
    //   compareValue: 'Numerics only',
    //   existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    //   existingRecordOption: NewMatchProfile.optionsList.identifierOCLC,
    //   compareValueInComparison: 'Numerics only',
    // };
    // const mappingProfile = {
    //   name: `C347830 ID Match Test - Update3 (OCLC).${getRandomPostfix()}`,
    //   typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    //   staffSuppress: 'Unmark for all affected records',
    //   catalogedDate: '"2021-12-03"',
    //   catalogedDateUI: '2021-12-03',
    //   instanceStatus: INSTANCE_STATUS_TERM_NAMES.NOTYETASSIGNED,
    // };
    // const actionProfile = {
    //   typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    //   name: `C347830 ID Match Test - Update3 (OCLC).${getRandomPostfix()}`,
    //   action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    // };
    // const jobProfile = {
    //   ...NewJobProfile.defaultJobProfile,
    //   profileName: `C347830 ID Match Test - Update3 (OCLC).${getRandomPostfix()}`,
    //   acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    // };

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        InventorySearchAndFilter.getInstancesByIdentifierViaApi(resourceIdentifiers[0].value).then(
          (instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          },
        );
      });

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
        Permissions.dataExportSettingsViewOnly.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        testData.userId = userProperties.userId;

        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    // after('Delete test data', () => {
    //   cy.getAdminToken().then(() => {
    //     // delete profiles
    //     SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
    //     SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
    //     SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
    //     SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
    //     Users.deleteViaApi(testData.userId);
    //     InventorySearchAndFilter.getInstancesByIdentifierViaApi(resourceIdentifiers[0].value).then(
    //       (instances) => {
    //         instances.forEach(({ id }) => {
    //           InventoryInstance.deleteInstanceViaApi(id);
    //         });
    //       },
    //     );
    //   });
    // });

    it(
      'C350694 MARC to MARC matching: Match a bib record with a non-repeatable MARC tag to update MARC bib records (folijet)',
      { tags: ['criticalPath', 'folijet', 'C350694'] },
      () => {},
    );
  });
});
