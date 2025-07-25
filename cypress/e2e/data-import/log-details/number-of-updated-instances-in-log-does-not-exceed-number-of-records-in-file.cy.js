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
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    const fieldProtectionIds = [];
    let instanceHRID = null;
    const quantityOfItems = '1';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const marcFileNameForCreate = `C367966 autotestFile${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C367966 editedAutotestFile${getRandomPostfix()}.mrc`;
    const marcFileName = `C367966 autotestFile${getRandomPostfix()}.mrc`;
    const protectedFields = {
      firstField: '020',
      secondField: '514',
    };
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          name: `C367966 Update MARC Bib with protections ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
          name: `createInstanceActionProf${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          name: `C367966 Update instance 1 ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          administrativeNote:
            'This note was added when the MARC Bib was updated to check field protections',
          noteInFile: 'This is the ORIGINAL version of the non-repeatable 514 note',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `createInstanceActionProf${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
    ];
    const matchProfile = {
      profileName: `C367966 001 to 001 MARC Bib ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C367966 Update 1: MARC Bib with protections ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      // delete created file in fixtures
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken().then(() => {
        cy.wrap(fieldProtectionIds).each((id) => {
          MarcFieldProtection.deleteViaApi(id);
        });
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C367966 Confirm the number of updated instances in the import log does not exceed the number of records in the file (folijet)',
      { tags: ['criticalPath', 'folijet', 'C367966'] },
      () => {
        MarcFieldProtection.createViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: 'a',
          data: '*',
          source: 'USER',
          field: protectedFields.firstField,
        }).then((resp) => {
          fieldProtectionIds.push(resp.id);
        });
        MarcFieldProtection.createViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: '*',
          data: '*',
          source: 'USER',
          field: protectedFields.secondField,
        }).then((resp) => {
          fieldProtectionIds.push(resp.id);
        });

        // create Field mapping profiles
        FieldMappingProfiles.createMappingProfileForUpdatesMarc(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.createMappingProfileWithNotes(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
          collectionOfMappingAndActionProfiles[1].mappingProfile.administrativeNote,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        // create Action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create Match profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create Job profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchAndTwoActionProfiles(
          matchProfile.profileName,
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC367966_BeforeOverride.mrc', marcFileNameForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileNameForCreate);
        Logs.checkJobStatus(marcFileNameForCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileNameForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;

          InstanceRecordView.viewSource();
          InventoryViewSource.contains('514\t');
          InventoryViewSource.contains(
            collectionOfMappingAndActionProfiles[1].mappingProfile.noteInFile,
          );
          DataImport.editMarcFile(
            'marcFileForC367966_Rev1Protect.mrc',
            editedMarcFileName,
            ['in00000000331'],
            [instanceHRID],
          );
        });

        // upload an edited marc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileName);
        Logs.checkJobStatus(marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.instance,
        );
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 1);
      },
    );
  });
});
