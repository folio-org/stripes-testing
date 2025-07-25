import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user = null;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
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
    const fileForCreateFirstName = `C358138 firstAutotestFileForCreate${getRandomPostfix()}.mrc`;
    const fileForCreateSecondName = `C358138 secondAutotestFileForCreate${getRandomPostfix()}.mrc`;
    const fileForUpdateFirstName = `C358138 firstAutotestFileForUpdate${getRandomPostfix()}.mrc`;
    const fileForUpdateSecondName = `C358138 secondAutotestFileForUpdate${getRandomPostfix()}.mrc`;

    const matchProfile = {
      profileName: `C358138 Match on newly-created 035 ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '035',
        in1: '*',
        in2: '*',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      existingRecordOption: NewMatchProfile.optionsList.systemControlNumber,
    };

    const mappingProfile = {
      name: `C358138 Update instance via 035 ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };

    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C358138 Update instance via 035 ${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };

    const jobProfile = {
      profileName: `C358138 Update instance via 035 ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
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
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        // delete profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${firstInstanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${secondInstanceHrid}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });
    });

    it(
      'C358138 Matching on newly-created 035 does not work (regression) (folijet)',
      { tags: ['criticalPath', 'folijet', 'C358138'] },
      () => {
        DataImport.verifyUploadState();
        // upload a marc file for creating of the new instance
        DataImport.uploadFile('marcFileForC358138.mrc', fileForCreateFirstName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileForCreateFirstName);
        Logs.checkJobStatus(fileForCreateFirstName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileForCreateFirstName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
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
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfileWithExistingPart(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create mapping profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addAdministrativeNote(note, 9);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile for update
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfile,
          actionProfile.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for updating already created instance
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC358138_rev.mrc', fileForUpdateFirstName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileForUpdateFirstName);
        Logs.checkJobStatus(fileForUpdateFirstName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileForUpdateFirstName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1', 1);
        FileDetails.checkInstanceQuantityInSummaryTable('1', 1);

        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InstanceRecordView.verifyAdministrativeNote(note);
        InstanceRecordView.viewSource();
        InventoryViewSource.contains('035\t');
        InventoryViewSource.contains(resourceIdentifierForFirstInstance.value);
        InventoryViewSource.contains('650\t');
        InventoryViewSource.contains('Pulse techniques (Medical)');

        // upload a marc file for creating of the new instance
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC358138_with_035.mrc', fileForCreateSecondName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileForCreateSecondName);
        Logs.checkJobStatus(fileForCreateSecondName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileForCreateSecondName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
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
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC358138_with_035_rev.mrc', fileForUpdateSecondName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileForUpdateSecondName);
        Logs.checkJobStatus(fileForUpdateSecondName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileForUpdateSecondName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1', 1);
        FileDetails.checkInstanceQuantityInSummaryTable('1', 1);

        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
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
