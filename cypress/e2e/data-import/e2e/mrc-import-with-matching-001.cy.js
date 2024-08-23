import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let user = {};
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    // unique file name to upload
    const nameForMarcFile = `C17044 autoTestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C17044 autoTestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C17044 autoTestFile${getRandomPostfix()}.csv`;
    const matchProfile = {
      profileName: `autoTestMatchProf.${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const mappingProfile = {
      name: `autoTestMappingProf.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      update: true,
      permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `autoTestActionProf.${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `autoTestJobProf.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.dataImportUploadAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        // clean up generated profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C17044: MARC-MARC matching for 001 field (folijet)',
      { tags: ['smoke', 'folijet', 'shiftLeft'] },
      () => {
        DataImport.verifyUploadState();
        // upload a marc file for export
        DataImport.uploadFile('oneMarcBib.mrc', nameForMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameForMarcFile);
        Logs.openFileDetails(nameForMarcFile);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.instance,
        );

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHRID = initialInstanceHrId;

          // download .csv file
          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
          InventorySearchAndFilter.saveUUIDs();
          // need to create a new file with instance UUID because tests are runing in multiple threads
          cy.intercept('/search/instances/ids**').as('getIds');
          cy.wait('@getIds', getLongDelay()).then((req) => {
            const expectedUUID = InventorySearchAndFilter.getUUIDsFromRequest(req);

            FileManager.createFile(`cypress/fixtures/${nameForCSVFile}`, expectedUUID[0]);
          });

          // download exported marc file
          cy.getAdminToken();
          cy.visit(TopMenu.dataExportPath);
          ExportFile.uploadFile(nameForCSVFile);
          ExportFile.exportWithDefaultJobProfile(nameForCSVFile);
          ExportFile.getRecordHridOfExportedFile(nameForCSVFile).then((req) => {
            const expectedRecordHrid = req;

            // download exported marc file
            ExportFile.downloadExportedMarcFileWithRecordHrid(
              expectedRecordHrid,
              nameForExportedMarcFile,
            );
            FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
          });

          // create Match profile
          cy.visit(SettingsMenu.matchProfilePath);
          MatchProfiles.createMatchProfile(matchProfile);

          // create Field mapping profile
          cy.visit(SettingsMenu.mappingProfilePath);
          FieldMappingProfiles.createMappingProfile(mappingProfile);

          // create Action profile and link it to Field mapping profile
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(actionProfile, mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(actionProfile.name);

          // create Job profile
          cy.visit(SettingsMenu.jobProfilePath);
          JobProfiles.createJobProfileWithLinkingProfiles(
            jobProfile,
            actionProfile.name,
            matchProfile.profileName,
          );
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);

          // upload the exported marc file with 001 field
          cy.visit(TopMenu.dataImportPath);
          DataImport.verifyUploadState();
          DataImport.uploadExportedFile(nameForExportedMarcFile);
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(nameForExportedMarcFile);
          Logs.openFileDetails(nameForExportedMarcFile);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.instance,
          );

          cy.visit(TopMenu.inventoryPath);
          cy.wait(2000);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);

          // ensure the fields created in Field mapping profile exists in inventory
          InventorySearchAndFilter.checkInstanceDetails();
        });
      },
    );
  });
});
