import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions, Parallelization } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user = null;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const note = 'This instance was updated, plus a new subject heading was added';
    const resourceIdentifierForFirstInstance = {
      type: 'System control number',
      value: '(NhFolYBP)2304396',
    };
    const resourceIdentifierForSecondInstance = {
      type: 'System control number',
      value: '(NhFolYBP)2345942-321678',
    };
    let firstInstanceHrid;
    let secondInstanceHrid;
    // unique file names
    const fileForCreateFirstName = `C358138 firstAutotestFileForCreate.${getRandomPostfix()}.mrc`;
    const fileForCreateSecondName = `C358138 secondAutotestFileForCreate.${getRandomPostfix()}.mrc`;
    const fileForUpdateFirstName = `C358138 firstAutotestFileForUpdate.${getRandomPostfix()}.mrc`;
    const fileForUpdateSecondName = `C358138 secondAutotestFileForUpdate.${getRandomPostfix()}.mrc`;

    const matchProfile = {
      profileName: `C358138 Match on newly-created 035 ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '035',
        in1: '*',
        in2: '*',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      existingRecordOption: NewMatchProfile.optionsList.systemControlNumber,
    };

    const mappingProfile = {
      name: `C358138 Update instance via 035 ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };

    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C358138 Update instance via 035 ${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };

    const jobProfile = {
      profileName: `C358138 Update instance via 035 ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.getAdminToken().then(() => {
        InventorySearchAndFilter.getInstancesByIdentifierViaApi(
          resourceIdentifierForFirstInstance.value,
        ).then((listOfInstancesWithFirstIdentifiers) => {
          if (listOfInstancesWithFirstIdentifiers) {
            listOfInstancesWithFirstIdentifiers.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });
        InventorySearchAndFilter.getInstancesByIdentifierViaApi(
          resourceIdentifierForSecondInstance.value,
        ).then((listOfInstancesWithSecondIdentifiers) => {
          if (listOfInstancesWithSecondIdentifiers) {
            listOfInstancesWithSecondIdentifiers.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      // delete profiles
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      Users.deleteViaApi(user.userId);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${firstInstanceHrid}"` }).then(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${secondInstanceHrid}"` }).then(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C358138 Matching on newly-created 035 does not work (regression) (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.parallel] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        // upload a marc file for creating of the new instance
        DataImport.uploadFile('marcFileForC358138.mrc', fileForCreateFirstName);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileForCreateFirstName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileForCreateFirstName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          firstInstanceHrid = initialInstanceHrId;
        });
        InventoryInstance.verifyResourceIdentifier(
          resourceIdentifierForFirstInstance.type,
          resourceIdentifierForFirstInstance.value,
          2,
        );
        InventoryInstance.viewSource();
        InventoryViewSource.contains('035\t');
        InventoryViewSource.contains(resourceIdentifierForFirstInstance.value);

        // create match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfileWithExistingPart(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addAdministrativeNote(note, 9);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile for update
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfile,
          actionProfile.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for updating already created instance
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC358138_rev.mrc', fileForUpdateFirstName);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileForUpdateFirstName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileForUpdateFirstName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1', 1);
        FileDetails.checkInstanceQuantityInSummaryTable('1', 1);

        FileDetails.openInstanceInInventory('Updated');
        InstanceRecordView.verifyAdministrativeNote(note);
        InstanceRecordView.viewSource();
        InventoryViewSource.contains('035\t');
        InventoryViewSource.contains(resourceIdentifierForFirstInstance.value);
        InventoryViewSource.contains('650\t');
        InventoryViewSource.contains('Pulse techniques (Medical)');

        // upload a marc file for creating of the new instance
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC358138_with_035.mrc', fileForCreateSecondName);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileForCreateSecondName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileForCreateSecondName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          secondInstanceHrid = initialInstanceHrId;
        });
        InventoryInstance.verifyResourceIdentifier(
          resourceIdentifierForSecondInstance.type,
          resourceIdentifierForSecondInstance.value,
          3,
        );
        InventoryInstance.viewSource();
        InventoryViewSource.contains('035\t');
        InventoryViewSource.contains(resourceIdentifierForSecondInstance.value);

        // upload a marc file for updating already created instance
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC358138_with_035_rev.mrc', fileForUpdateSecondName);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileForUpdateSecondName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileForUpdateSecondName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1', 1);
        FileDetails.checkInstanceQuantityInSummaryTable('1', 1);

        FileDetails.openInstanceInInventory('Updated');
        InstanceRecordView.verifyAdministrativeNote(note);
        InstanceRecordView.viewSource();
        InventoryViewSource.contains('035\t');
        InventoryViewSource.contains(resourceIdentifierForSecondInstance.value);
        InventoryViewSource.contains('650\t');
        InventoryViewSource.contains('Symposia');
      },
    );
  });
});
