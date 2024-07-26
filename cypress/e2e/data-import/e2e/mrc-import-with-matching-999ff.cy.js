import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
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
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
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
    let userId = null;
    // unique file name to upload
    const nameForMarcFile = `C343343 autotestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C343343 autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C343343 autotestFile${getRandomPostfix()}.csv`;

    const mappingProfileForExport = {
      name: `autotestMappingProf${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
    };
    const actionProfileForExport = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `autotestActionProf${getRandomPostfix()}`,
    };
    const jobProfileForExport = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `autotestJobProf${getRandomPostfix()}`,
    };
    const mappingProfile = {
      name: `autotestMappingProf${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      update: true,
      permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `autotestActionProf${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const matchProfile = {
      profileName: `autotestMatchProf${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      existingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `autotestJobProf${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.dataExportEnableApp.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password);
      });
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      FileManager.deleteFileFromDownloadsByMask('*SearchInstanceUUIDs*');
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(userId);
        // clean up generated profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForExport.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileForExport.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileForExport.name);
      });
    });

    it(
      'C343343 MARC file import with matching for 999 ff field (folijet)',
      { tags: ['smoke', 'folijet'] },
      () => {
        // create Field mapping profile for export
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.createMappingProfile(mappingProfileForExport);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfileForExport.name);

        // create Action profile for export and link it to Field mapping profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfileForExport, mappingProfileForExport.name);
        ActionProfiles.checkActionProfilePresented(actionProfileForExport.name);

        // create job profile for export
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfileForExport,
          actionProfileForExport.name,
        );
        JobProfiles.checkJobProfilePresented(jobProfileForExport.profileName);

        // upload a marc file for export
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', nameForMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForExport.profileName);
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
          InstanceRecordView.verifyInstancePaneExists();
          InventorySearchAndFilter.saveUUIDs();
          // need to create a new file with instance UUID because tests are runing in multiple threads
          cy.intercept('/search/instances/ids**').as('getIds');
          cy.wait('@getIds', getLongDelay()).then((req) => {
            const expectedUUID = InventorySearchAndFilter.getUUIDsFromRequest(req);

            FileManager.createFile(`cypress/fixtures/${nameForCSVFile}`, expectedUUID[0]);
          });

          // download exported marc file
          cy.visit(TopMenu.dataExportPath);
          cy.getAdminToken().then(() => {
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
          });

          // create Match profile
          cy.visit(SettingsMenu.matchProfilePath);
          MatchProfiles.createMatchProfile(matchProfile);

          // create Field mapping profile
          cy.visit(SettingsMenu.mappingProfilePath);
          FieldMappingProfiles.createMappingProfile(mappingProfile);
          FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

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

          // upload the exported marc file with 999.f.f.s fields
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
          InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
          InstanceRecordView.verifyInstancePaneExists();
          // ensure the fields created in Field mapping profile exists in inventory
          InventorySearchAndFilter.checkInstanceDetails();
        });
      },
    );
  });
});
