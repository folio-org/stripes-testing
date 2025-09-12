import {
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
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const quantityOfItems = '1';
    const field035 = '(OCoLC)1604274';
    const field900 = '1604274';
    // need to be unique for the test run
    const randomNumber = randomFourDigitNumber();
    const updatedField035 = `(OCoLC)${randomNumber}`;
    const updatedField900 = `${randomNumber}`;

    const marcFileForCreate = {
      filePathToUpload: 'marcBibFileForC651587_1.mrc',
      fileNameToUpload: `C651587 autotestFileForCreate${getRandomPostfix()}.mrc`,
      editedFileNameForCreate: `C651587 editedAutotestFileForCreate${getRandomPostfix()}.mrc`,
    };
    const marcFileForUpdate = {
      filePathToUpload: 'marcBibFileForC651587_2.mrc',
      fileNameToUpload: `C651587 autotestFileForUpdate${getRandomPostfix()}.mrc`,
      editedFileNameForUpdate: `C651587 editedAutotestFileForUpdate${getRandomPostfix()}.mrc`,
      instanceTitle: 'The Journal of ecclesiastical history - UPDATED.',
    };
    const mappingProfile = {
      name: `C651587 Updating MARC bib record${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const actionProfile = {
      name: `C651587 Updating MARC bib record${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const matchProfile = {
      profileName: `C651587 900-035 match with comparison match${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '900',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      existingRecordFields: {
        field: '035',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      qualifierType: 'Begins with',
      qualifierValue: '(OCoLC)',
      compareValue: 'Numerics only',
      compareValueInComparison: 'Numerics only',
      existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C651587 Update MARC bib record with 900$a-035$a match${getRandomPostfix()}`,
    };

    before('Create test user and login', () => {
      DataImport.editMarcFile(
        marcFileForCreate.filePathToUpload,
        marcFileForCreate.editedFileNameForCreate,
        [field035],
        [updatedField035],
      );
      DataImport.editMarcFile(
        marcFileForUpdate.filePathToUpload,
        marcFileForUpdate.editedFileNameForUpdate,
        [field035, field900],
        [updatedField035, updatedField900],
      );
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        marcFileForCreate.editedFileNameForCreate,
        marcFileForCreate.fileNameToUpload,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        marcFileForCreate.instanceId = response[0].instance.id;
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${marcFileForCreate.editedFileNameForCreate}`);
      FileManager.deleteFile(`cypress/fixtures/${marcFileForUpdate.editedFileNameForUpdate}`);
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcFileForCreate.instanceId);
      });
    });

    it(
      'C651587 Check updating MARC Bib record using "Numeric only" comparison in match profile (folijet)',
      { tags: ['criticalPath', 'folijet', 'C651587'] },
      () => {
        // create mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillMappingProfileForUpdatesMarc(mappingProfile);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);
        // create action profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);
        // create match profile
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfileWithQualifierAndIncomingAndExistingRecordFields(
          matchProfile,
        );
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);
        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfile,
          actionProfile.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);
        // upload a marc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(
          marcFileForUpdate.editedFileNameForUpdate,
          marcFileForUpdate.fileNameToUpload,
        );
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileForUpdate.fileNameToUpload);
        Logs.checkJobStatus(marcFileForUpdate.fileNameToUpload, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileForUpdate.fileNameToUpload);
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems, 1);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 1);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InstanceRecordView.verifyInstanceIsOpened(marcFileForUpdate.instanceTitle);
      },
    );
  });
});
