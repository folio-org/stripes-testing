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
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      createdRecordIDs: [],
      filePathForCreate: 'oneMarcBib.mrc',
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      fileNameForCreate: `C415267 marcFileName${getRandomPostfix()}.mrc`,
      filePathForUpdate: 'marcBibFileForC415267.mrc',
      editedFileName: `C415267 marcFileName${getRandomPostfix()}.mrc`,
      fileNameForUpdate: `C415267 marcFileName${getRandomPostfix()}.mrc`,
      tag005: '005',
    };
    const mappingProfile = {
      name: `C415267 Field mapping profile 2 - MODSOURCE-642 -MARC ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      update: true,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C415267 Action profile 2 - MODSOURCE-642 - MARC ${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const matchProfile = {
      profileName: `C415267 Match profile 2 - MODSOURCE-642 - MARC ${getRandomPostfix()}`,
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
      profileName: `C415267 Job profile 2 - MODSOURCE-642 - MARC ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.intercept('GET', 'data-import/splitStatus').as('splitStatus');

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      // delete created files
      FileManager.deleteFile(`cypress/fixtures/${testData.editedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileNameForCreate}`);
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(testData.user.userId);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceHrid}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });
    });

    it(
      'C415267 Update MARC Bib via Data Import/incoming bib has invalid 005 (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C415267'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(testData.filePathForCreate, testData.fileNameForCreate);
        JobProfiles.waitLoadingList();
        JobProfiles.search(testData.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsUploaded();
        Logs.checkJobStatus(testData.fileNameForCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.fileNameForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceHrid = initialInstanceHrId;

          // create Field mapping profile
          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
          FieldMappingProfiles.createMappingProfileForUpdatesMarc(mappingProfile);
          FieldMappingProfileView.closeViewMode(mappingProfile.name);
          FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

          // create Action profile and link it to Field mapping profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          SettingsActionProfiles.create(actionProfile, mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

          // create Match profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          MatchProfiles.createMatchProfile(matchProfile);

          // create Job profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.openNewJobProfileForm();
          NewJobProfile.fillJobProfile(jobProfile);
          NewJobProfile.linkMatchProfile(matchProfile.profileName);
          NewJobProfile.linkActionProfileForMatches(actionProfile.name);
          // wait for the action profile to be linked
          cy.wait(1000);
          NewJobProfile.saveAndClose();
          JobProfiles.waitLoadingList();
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);

          DataImport.editMarcFile(
            testData.filePathForUpdate,
            testData.editedFileName,
            ['HRID'],
            [initialInstanceHrId],
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(testData.editedFileName, testData.fileNameForUpdate);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          cy.wait('@splitStatus', getLongDelay()).then(() => {
            // set date after updating record
            const updatedDate = new Date();
            Logs.waitFileIsImported(testData.fileNameForUpdate);
            Logs.checkJobStatus(testData.fileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(testData.fileNameForUpdate);
            [
              FileDetails.columnNameInResultList.srsMarc,
              FileDetails.columnNameInResultList.instance,
            ].forEach((columnName) => {
              FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
            });
            FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
            InventoryInstance.viewSource();
            InventoryViewSource.contains(`${testData.tag005}\t`);
            InventoryViewSource.verifyFieldContent(3, updatedDate);
          });
        });
      },
    );
  });
});
