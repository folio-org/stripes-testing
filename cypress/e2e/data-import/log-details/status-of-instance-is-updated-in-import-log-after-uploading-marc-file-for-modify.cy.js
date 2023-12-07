import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../../support/utils/fileManager';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    let instanceHrid;
    let exportedFileName;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const fileNameForCreate = `C357027 autotestFileCreteInstance.${getRandomPostfix()}.mrc`;
    const filePathForCreateInstance = 'oneMarcBib.mrc';
    const mappingProfile = {
      name: `C357027 autoTestMappingProf.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      modifications: {
        action: 'Add',
        field: '947',
        ind1: '',
        ind2: '',
        subfield: 'a',
        data: `Test.${getRandomPostfix()}`,
        subaction: 'Add subfield',
        subfieldInd1: 'b',
        subfieldData: `Addition.${getRandomPostfix()}`,
      },
    };
    const actionProfile = {
      name: `C357027 autoTestActionProf.${getRandomPostfix()}`,
      action: 'Modify (MARC Bibliographic record type only)',
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const matchProfile = {
      profileName: `C357027 autoTestMatchProf.${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C357027 autoTestJobProf.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.dataExportEnableApp.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C357027 Check that status of instance is updated in the Import log after uploading MARC file for modify (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateInstance, fileNameForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileNameForCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForCreate);
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InventorySearchAndFilter.closeInstanceDetailPane();
          InventorySearchAndFilter.selectResultCheckboxes(1);
          InventorySearchAndFilter.exportInstanceAsMarc();

          // download exported marc file
          cy.visit(TopMenu.dataExportPath);
          ExportFile.getExportedFileNameViaApi().then((name) => {
            exportedFileName = name;

            cy.wait(4000);
            ExportFile.downloadExportedMarcFile(exportedFileName);
            // create Field mapping profile
            cy.visit(SettingsMenu.mappingProfilePath);
            FieldMappingProfiles.openNewMappingProfileForm();
            NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
            NewFieldMappingProfile.addFieldMappingsForMarc();
            NewFieldMappingProfile.fillModificationSectionWithAdd(mappingProfile.modifications);
            NewFieldMappingProfile.save();
            FieldMappingProfileView.closeViewMode(mappingProfile.name);
            FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

            // create Action profile and link it to Field mapping profile
            cy.visit(SettingsMenu.actionProfilePath);
            ActionProfiles.create(actionProfile, mappingProfile.name);
            ActionProfiles.checkActionProfilePresented(actionProfile.name);

            // create Match profile
            cy.visit(SettingsMenu.matchProfilePath);
            MatchProfiles.createMatchProfile(matchProfile);

            // create Job profile
            cy.visit(SettingsMenu.jobProfilePath);
            JobProfiles.createJobProfileWithLinkingProfiles(
              jobProfile,
              actionProfile.name,
              matchProfile.profileName,
            );
            JobProfiles.checkJobProfilePresented(jobProfile.profileName);

            // upload the exported marc file
            cy.visit(TopMenu.dataImportPath);
            // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
            DataImport.verifyUploadState();
            DataImport.uploadExportedFile(exportedFileName);
            JobProfiles.search(jobProfile.profileName);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(exportedFileName);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(exportedFileName);
            FileDetails.checkStatusInColumn(
              FileDetails.status.created,
              FileDetails.columnNameInResultList.srsMarc,
            );
            FileDetails.checkStatusInColumn(
              FileDetails.status.updated,
              FileDetails.columnNameInResultList.instance,
            );
          });
        });
      },
    );
  });
});
