import moment from 'moment';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileManager from '../../../support/utils/fileManager';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import {
  JOB_STATUS_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import { getLongDelay } from '../../../support/utils/cypressTools';

describe('data-import', () => {
  describe('Importing MARC Authority files', () => {
    const random010fieldValue = `n  4200${randomFourDigitNumber()}`;
    const testData = {
      createdRecordIDs: [],
      filePathForCreate: 'oneMarcAuthority.mrc',
      editedFileNameForCreate: `C415366 marcFileName${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      fileNameForCreate: `C415366 marcFileName${getRandomPostfix()}.mrc`,
      filePathForUpdate: 'marcAuthFileForC415366.mrc',
      editedFileNameForUpdate: `C415366 marcFileName${getRandomPostfix()}.mrc`,
      fileNameForUpdate: `C415366 marcFileName${getRandomPostfix()}.mrc`,
      tag005: '005',
      todayDate: moment(new Date()).format('YYYYMMDD'),
    };
    const mappingProfile = {
      name: `C415366 Field mapping profile 2 - MODSOURCE-642 - MARC Authority${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
      name: `C415366 Action profile 2 - MODSOURCE-642 - MARC Authority${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const matchProfile = {
      profileName: `C415366 Match profile 2 - MODSOURCE-642 - MARC Authority${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '010',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      existingRecordFields: {
        field: '010',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      recordType: EXISTING_RECORDS_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C415366 Job profile 2 - MODSOURCE-642 - MARC Authority${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.intercept('GET', 'data-import/splitStatus').as('splitStatus');
        // need to change the 010 field to random value in the file for creating because the match is by the 010 field
        DataImport.editMarcFile(
          testData.filePathForCreate,
          testData.editedFileNameForCreate,
          ['n  42008104'],
          [random010fieldValue],
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      Users.deleteViaApi(testData.user.userId);
      MarcAuthority.deleteViaAPI(testData.createdRecordIDs[0]);
      FileManager.deleteFile(`cypress/fixtures/${testData.editedFileNameForCreate}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.editedFileNameForUpdate}`);
    });

    it(
      'C415366 Update MARC Authority via Data Import/incoming record has invalid 005 (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(testData.editedFileNameForCreate, testData.fileNameForCreate);
        JobProfiles.waitLoadingList();
        JobProfiles.search(testData.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.fileNameForCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.fileNameForCreate);
        for (let i = 0; i < 1; i++) {
          Logs.getCreatedItemsID(i).then((link) => {
            testData.createdRecordIDs.push(link.split('/')[5]);
          });
        }
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.openAuthority(RECORD_STATUSES.CREATED);
        MarcAuthority.waitLoading();

        // need to change the 010 field to random value in the file for updating because the match is by the 010 field
        DataImport.editMarcFile(
          testData.filePathForUpdate,
          testData.editedFileNameForUpdate,
          ['n  42008104'],
          [random010fieldValue],
        );

        // create Match profile
        NewMatchProfile.createMatchProfileViaApiMarc(matchProfile);
        // create Field mapping profile
        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile);
        // create Action profile and link it to Field mapping profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(actionProfile.name);
        // wait for the action profile to be linked
        cy.wait(1000);
        NewJobProfile.saveAndClose();

        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.editedFileNameForUpdate, testData.fileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        cy.wait('@splitStatus', getLongDelay()).then(() => {
          // set date after updating record
          const updatedDate = new Date();
          JobProfiles.waitFileIsImported(testData.fileNameForUpdate);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(testData.fileNameForUpdate);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.authority,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
          });
          FileDetails.openAuthority(RECORD_STATUSES.UPDATED);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.tag005);
          MarcAuthority.verifyFieldContent(3, updatedDate);
        });
      },
    );
  });
});
