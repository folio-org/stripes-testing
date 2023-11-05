import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import {
  JOB_STATUS_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
} from '../../../support/constants';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryEditMarcRecord from '../../../support/fragments/inventory/inventoryEditMarcRecord';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import FileManager from '../../../support/utils/fileManager';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceHrid;
    const errorMessage = 'DuplicateRecordException: Incoming file may contain duplicates';
    const title = 'Introductory Solid State Physics with MATLAB Applications';
    const firstFilePathForUpload = 'marcBibFileForC410708_file1.mrc';
    const secondFilePathForUpload = 'marcBibFileForC410708_file2.mrc';
    const firstFileName = `C410708 autotestFileName.${getRandomPostfix()}`;
    const secondFileName = `C410708 autotestFileName.${getRandomPostfix()}`;
    const editedMarcFileName = `C410708 autotestFileName.${getRandomPostfix()}`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const matchProfile = {
      profileName: `C410708 001 to Instance HRID_${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };
    const mappingProfile = {
      name: `C410708 Update instance with adm note_${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      administrativeNote: `Test_${getRandomPostfix()}`,
    };

    const actionProfile = {
      name: `C410708 Update instance with adm note_${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };

    const jobProfile = {
      profileName: `C410708 Update instance with adm note_${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      JobProfiles.deleteJobProfile(jobProfile.name);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (initialInstance) => {
          InventoryInstance.deleteInstanceViaApi(initialInstance.id);
        },
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C410708 Verify that clear error message appears after importing a file with duplicate records in it (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        DataImport.uploadFile(firstFilePathForUpload, firstFileName);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(firstFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(firstFileName);
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          DataImport.editMarcFile(
            secondFilePathForUpload,
            editedMarcFileName,
            ['INSTANCEHRID', 'INSTANCEHRID'],
            [instanceHrid, instanceHrid],
          );
        });

        // create match profile for update
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);

        // create Field mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addAdministrativeNote(mappingProfile.administrativeNote, 9);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfile,
          actionProfile.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, secondFileName);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(secondFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(secondFileName);
        FileDetails.openInstanceInInventoryByStatus('Updated');
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.editMarcBibliographicRecord();
        InventoryEditMarcRecord.deleteField(18);
        InventoryEditMarcRecord.saveAndClose();
        InventoryEditMarcRecord.confirmDeletingField();

        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(secondFileName);
        FileDetails.openJsonScreenByStatus('No action', title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyContentInTab(errorMessage);
      },
    );
  });
});
