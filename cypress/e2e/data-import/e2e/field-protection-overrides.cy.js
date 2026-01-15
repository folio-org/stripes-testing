/* eslint-disable cypress/no-unnecessary-waiting */
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
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
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
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let firstFieldId = null;
    let secondFieldId = null;
    let instanceHrid = null;
    let userId = null;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    // unique file name to upload
    const fileNameForCreatingInstance = `C17018autotestFileCreateInstance${getRandomPostfix()}.mrc`;
    const fileNameForProtect = `C17018 marcFileForC17018-Rev1-Protect${getRandomPostfix()}.mrc`;
    const fileNameForOverride = `C17018 marcFileForC17018-Rev2-Override${getRandomPostfix()}.mrc`;
    const editedFileNameRev1 = `marcFileForC17018-Rev1-Protect${getRandomPostfix()}.mrc`;
    const editedFileNameRev2 = `marcFileForC17018-Rev2-Override${getRandomPostfix()}.mrc`;
    const fileForEditRev1 = 'marcFileForC17018-Rev1-Protect.mrc';
    const fileForEditRev2 = 'marcFileForC17018-Rev2-Override.mrc';

    const protectedFields = {
      firstField: '020',
      secondField: '514',
    };

    // notes for mapping profiles
    const noteForUpdateInstanceMappingProfile =
      'This note was added when the MARC Bib was updated to check field protections';
    const noteForOverrideInstanceMappingProfile =
      'This note was added when the MARC Bib was updated to check field protection OVERRIDES';

    // unique name for notes
    const administrativeNote =
      'This note was added when the MARC Bib was updated to check field protections';
    const instanceNote = 'This is the ORIGINAL version of the non-repeatable 514 note';
    const updatedAdministativeNote =
      'This note was added when the MARC Bib was updated to check field protection OVERRIDES';
    const updatedInstanceNote =
      'This is the UPDATE 2 version of the non-repeatable 514 note, which should replace the UPDATE 1 version';
    const instanceHridFromFile = 'in00000000331';

    // resource identifiers in uploading files
    const resourceIdentifiers = [
      { type: 'ISBN', value: '0866985522' },
      { type: 'ISBN', value: '9782617632537' },
      { type: 'ISBN', value: '4934691323219 (paperback)' },
    ];
    const marcBibMappingProfile = {
      name: `C17018 Update MARC Bib with protections.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };

    const instanceMappingProfile = {
      name: `C17018 Update instance 1.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };

    const marcBibMappingProfileOverride = {
      name: `C17018 Update MARC Bib with protection OVERRIDES.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };

    const instanceMappingProfileOverride = {
      name: `C17018 Update instance 2.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };

    const marcBibActionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C17018 Update MARC Bib with protections.${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };

    const instanceActionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C17018 Update instance 1.${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };

    const marcBibActionProfileOverride = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C17018 Update MARC Bib with protection OVERRIDES.${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };

    const instanceActionProfileOverride = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C17018 Update MARC Bib with protection OVERRIDES.${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };

    const matchProfile = {
      profileName: `C17018 001 to 001 MARC Bib.${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };

    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C17018 Update 1: MARC Bib with protections.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    const jobProfileForOverride = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C17018 Update 2: MARC Bib with protections.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    beforeEach('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        MarcFieldProtection.getListViaApi({
          query: `"field"=="${protectedFields.firstField}"`,
        }).then((list) => {
          if (list) {
            list.forEach(({ id }) => MarcFieldProtection.deleteViaApi(id));
          }
        });
        MarcFieldProtection.getListViaApi({
          query: `"field"=="${protectedFields.secondField}"`,
        }).then((list) => {
          if (list) {
            list.forEach(({ id }) => MarcFieldProtection.deleteViaApi(id));
          }
        });
        MarcFieldProtection.createViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: 'a',
          data: '*',
          source: 'USER',
          field: protectedFields.firstField,
        }).then((resp) => {
          firstFieldId = resp.id;
        });
        MarcFieldProtection.createViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: '*',
          data: '*',
          source: 'USER',
          field: protectedFields.secondField,
        }).then((resp) => {
          secondFieldId = resp.id;
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      // delete created files
      FileManager.deleteFile(`cypress/fixtures/${editedFileNameRev1}`);
      FileManager.deleteFile(`cypress/fixtures/${editedFileNameRev2}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(userId);
        MarcFieldProtection.deleteViaApi(firstFieldId);
        MarcFieldProtection.deleteViaApi(secondFieldId);
        // delete profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForOverride.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(marcBibActionProfile.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(instanceActionProfile.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(marcBibActionProfileOverride.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(instanceActionProfileOverride.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(marcBibMappingProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(instanceMappingProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
          marcBibMappingProfileOverride.name,
        );
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
          instanceMappingProfileOverride.name,
        );
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C17018 Check that field protection overrides work properly during data import (folijet)',
      { tags: ['criticalPath', 'folijet', 'C17018', 'shiftLeft'] },
      () => {
        // create Field mapping profiles
        FieldMappingProfiles.createMappingProfileForUpdatesMarc(marcBibMappingProfile);
        FieldMappingProfileView.checkCreatedMappingProfile(
          marcBibMappingProfile.name,
          protectedFields.firstField,
          protectedFields.secondField,
        );
        FieldMappingProfiles.checkMappingProfilePresented(marcBibMappingProfile.name);

        FieldMappingProfiles.createMappingProfileWithNotes(
          instanceMappingProfile,
          noteForUpdateInstanceMappingProfile,
        );
        FieldMappingProfiles.checkMappingProfilePresented(instanceMappingProfile.name);

        FieldMappingProfiles.createMappingProfileForUpdatesAndOverrideMarc(
          marcBibMappingProfileOverride,
          protectedFields.firstField,
          protectedFields.secondField,
        );
        FieldMappingProfileView.checkCreatedMappingProfile(
          marcBibMappingProfileOverride.name,
          protectedFields.firstField,
          protectedFields.secondField,
        );
        FieldMappingProfiles.checkMappingProfilePresented(marcBibMappingProfileOverride.name);

        FieldMappingProfiles.createMappingProfileWithNotes(
          instanceMappingProfileOverride,
          noteForOverrideInstanceMappingProfile,
        );
        FieldMappingProfiles.checkMappingProfilePresented(instanceMappingProfileOverride.name);

        // create Action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(marcBibActionProfile, marcBibMappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(marcBibActionProfile.name);

        SettingsActionProfiles.create(instanceActionProfile, instanceMappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(instanceActionProfile.name);

        SettingsActionProfiles.create(
          marcBibActionProfileOverride,
          marcBibMappingProfileOverride.name,
        );
        SettingsActionProfiles.checkActionProfilePresented(marcBibActionProfileOverride.name);

        SettingsActionProfiles.create(
          instanceActionProfileOverride,
          instanceMappingProfileOverride.name,
        );
        SettingsActionProfiles.checkActionProfilePresented(instanceActionProfileOverride.name);

        // create Match profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create Job profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfileForUpdate);
        NewJobProfile.linkMatchAndTwoActionProfiles(
          matchProfile.profileName,
          marcBibActionProfile.name,
          instanceActionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

        // need to wait until the first job profile will be created
        cy.wait(2500);
        JobProfiles.createJobProfile(jobProfileForOverride);
        NewJobProfile.linkMatchAndTwoActionProfiles(
          matchProfile.profileName,
          marcBibActionProfileOverride.name,
          instanceActionProfileOverride.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForOverride.profileName);

        // upload a marc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC17018-BeforeOverride.mrc', fileNameForCreatingInstance);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForCreatingInstance);
        Logs.checkJobStatus(fileNameForCreatingInstance, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForCreatingInstance);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1', 0);
        FileDetails.checkInstanceQuantityInSummaryTable('1', 0);
        // open Instance for getting hrid
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          DataImport.editMarcFile(
            fileForEditRev1,
            editedFileNameRev1,
            [instanceHridFromFile],
            [instanceHrid],
          );
          DataImport.editMarcFile(
            fileForEditRev2,
            editedFileNameRev2,
            [instanceHridFromFile],
            [instanceHrid],
          );

          // upload a marc file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          DataImport.verifyUploadState();
          DataImport.uploadFile(editedFileNameRev1, fileNameForProtect);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileForUpdate.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(fileNameForProtect);
          Logs.checkJobStatus(fileNameForProtect, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(fileNameForProtect);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
          });
          FileDetails.checkSrsRecordQuantityInSummaryTable('1', 1);
          FileDetails.checkInstanceQuantityInSummaryTable('1', 1);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyAdministrativeNote(administrativeNote);
          InventoryInstance.verifyResourceIdentifier(
            resourceIdentifiers[0].type,
            resourceIdentifiers[0].value,
            0,
          );
          InventoryInstance.verifyResourceIdentifier(
            resourceIdentifiers[1].type,
            resourceIdentifiers[1].value,
            2,
          );
          InventoryInstance.verifyResourceIdentifier(
            resourceIdentifiers[2].type,
            resourceIdentifiers[2].value,
            1,
          );
          InstanceRecordView.verifyInstanceNote(instanceNote);
          // verify table data in marc bibliographic source
          InventoryInstance.viewSource();
          resourceIdentifiers.forEach((element) => {
            InventoryViewSource.verifyFieldInMARCBibSource(
              protectedFields.firstField,
              element.value,
            );
          });
          InventoryViewSource.verifyFieldInMARCBibSource(protectedFields.secondField, instanceNote);

          // upload a marc file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          DataImport.verifyUploadState();
          DataImport.uploadFile(editedFileNameRev2, fileNameForOverride);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileForOverride.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(fileNameForOverride);
          Logs.checkJobStatus(fileNameForOverride, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(fileNameForOverride);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
          });
          FileDetails.checkSrsRecordQuantityInSummaryTable('1', 1);
          FileDetails.checkInstanceQuantityInSummaryTable('1', 1);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryViewSource.close();
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyAdministrativeNote(administrativeNote);
          InstanceRecordView.verifyAdministrativeNote(updatedAdministativeNote);
          resourceIdentifiers.forEach((element) => {
            InventoryInstance.verifyResourceIdentifierAbsent(element.value);
          });
          InstanceRecordView.verifyInstanceNote(updatedInstanceNote);
          // verify table data in marc bibliographic source
          InventoryInstance.viewSource();
          InventoryViewSource.notContains(`${protectedFields.firstField}\t`);
          InventoryViewSource.verifyFieldInMARCBibSource(
            protectedFields.secondField,
            updatedInstanceNote,
          );
        });
      },
    );
  });
});
