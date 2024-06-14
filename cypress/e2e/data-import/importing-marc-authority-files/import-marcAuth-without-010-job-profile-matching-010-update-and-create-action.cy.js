import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const testData = {
      createdRecordIDs: [],
      marcValueWith010:
        'C422067 Test import authority (with 010 Sz) Mostly Chopin Festival. $e Orchestra $t sonet $3 test $w control',
      marcValueWithout010:
        'C422067 Test import authority (without 010) Mostly Chopin Festival. $e Orchestra $t sonet $3 test $w control',
    };
    const defaultActionProfileName = 'Default - Create MARC Authority';
    const mappingProfile = {
      name: `C422067 Update MARC authority by matching of '010 $a' subfield value (with Create action for non-matches) ${getRandomPostfix()}`,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
      name: `C422067 Update MARC authority by matching of '010 $a' subfield value (with Create action for non-matches) ${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const matchProfile = {
      profileName: `C422067 Update MARC authority by matching of '010 $a' subfield value (with Create action for non-matches) ${getRandomPostfix()}`,
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
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C422067 Update MARC authority by matching of '010 $a' subfield value (with Create action for non-matches) ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const marcFiles = {
      marc: 'marcAuthFileForC422067.mrc',
      fileName: `C422067 testMarcFile.${getRandomPostfix()}.mrc`,
      numOfRecords: 2,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.loginAsAdmin();
      // create Match profile
      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile);

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
      NewJobProfile.linkActionProfileForNonMatches(defaultActionProfileName);
      // wait for the action profile to be linked
      cy.wait(1000);
      NewJobProfile.saveAndClose();

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.dataExportEnableApp.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

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
      testData.createdRecordIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C422067 Import "MARC authority" record without "010" field using job profile with MATCH by "010" field for update and with create action (spitfire)',
      { tags: ['smoke', 'spitfire'] },
      () => {
        DataImport.uploadFile(marcFiles.marc, marcFiles.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFiles.fileName);
        Logs.checkJobStatus(marcFiles.fileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFiles.fileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        for (let i = 0; i < marcFiles.numOfRecords; i++) {
          Logs.getCreatedItemsID(i).then((link) => {
            testData.createdRecordIDs.push(link.split('/')[5]);
          });
        }
        Logs.clickOnHotLink(0, 6, RECORD_STATUSES.CREATED);
        MarcAuthority.contains(testData.marcValueWith010);

        TopMenuNavigation.navigateToApp('Data import');
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        Logs.clickOnHotLink(1, 6, RECORD_STATUSES.CREATED);
        MarcAuthority.contains(testData.marcValueWithout010);
      },
    );
  });
});
