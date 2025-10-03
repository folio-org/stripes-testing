import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  RECORD_STATUSES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import ActionProfiles from '../../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const testData = {
      tag377: '377',
      addedField: '\t400\t0  \t$a Данте Алигери $d 1265-1321',
      updated1XXField: '$a C405144 Dante Alighieri, $d 1265-1321, $t Divine Comedy',
      deletedSubfield: '$zno 98058852',
      createdRecordIDs: [],
      marcValue: 'C405144 Dante Alighieri, 1265-1321',
      updatedMarcValue: 'C405144 Dante Alighieri, 1265-1321, Divine Comedy',
      markedValue: 'C405144 Dante Alighieri,',
      searchOption: 'Keyword',
      calloutMessage:
        "is complete. The .csv downloaded contains selected records' UIIDs. To retrieve the .mrc file, please go to the Data export app.",
      csvFile: `C405144 exportedCSVFile${getRandomPostfix()}.csv`,
      exportedMarcFile: `C405144 exportedMarcFile${getRandomPostfix()}.mrc`,
      marcFileForModify: 'C405144MarcAuthPreUpdated.mrc',
      modifiedMarcFile: `C405144 editedMarcFile${getRandomPostfix()}.mrc`,
      uploadModifiedMarcFile: `C405144 testMarcFile${getRandomPostfix()}.mrc`,
    };

    const mappingProfile = {
      name: `C405144 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
      name: `C405144 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const matchProfile = {
      profileName: `C405144 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      existingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C405144 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    const marcFiles = [
      {
        marc: 'marcAuthFileForC405144.mrc',
        fileName: `C405144 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
        numOfRecords: 1,
        authorityHeading: 'C405144 Dante Alighieri, 1265-1321',
      },
    ];

    const users = {};

    before('Create test data and login', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C405144');
      // create user A
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]).then((userProperties) => {
        users.userAProperties = userProperties;
      });
      cy.resetTenant();

      // create user B
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
        .then((userProperties) => {
          users.userBProperties = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, users.userBProperties.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(users.userBProperties.userId, [
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]);
          cy.resetTenant();
        });

      cy.loginAsAdmin();
      // create Match profile
      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile);

      // create Field mapping profile
      NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile);

      // create Action profile and link it to Field mapping profile
      TopMenuNavigation.openAppFromDropdown(
        APPLICATION_NAMES.SETTINGS,
        APPLICATION_NAMES.DATA_IMPORT,
      );
      SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
      ActionProfiles.create(actionProfile, mappingProfile.name);

      // create Job profile
      TopMenuNavigation.openAppFromDropdown(
        APPLICATION_NAMES.SETTINGS,
        APPLICATION_NAMES.DATA_IMPORT,
      );
      SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
      JobProfiles.openNewJobProfileForm();
      NewJobProfile.fillJobProfile(jobProfile);
      NewJobProfile.linkMatchProfile(matchProfile.profileName);
      NewJobProfile.linkActionProfileForMatches(actionProfile.name);
      // wait for the action profile to be linked
      cy.wait(1000);
      NewJobProfile.saveAndClose();

      marcFiles.forEach((marcFile) => {
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            testData.createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(users.userAProperties.userId);
      Users.deleteViaApi(users.userBProperties.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);
      MarcAuthority.deleteViaAPI(testData.createdRecordIDs[0]);
    });

    it(
      'C405144 Updated "MARC authority" record via "Data import" from Central tenant is updated in Member tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire', 'C405144'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(users.userAProperties.username, users.userAProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          cy.reload();
          MarcAuthorities.waitLoading();
        }, 20_000);
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.marcValue);
        cy.wait(1000);
        MarcAuthorities.selectAllRecords();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
        MarcAuthorities.exportSelected();
        cy.wait(1000);
        MarcAuthorities.checkCallout(testData.calloutMessage);
        ExportFile.downloadCSVFile(testData.csvFile, 'QuickAuthorityExport*');
        MarcAuthorities.verifyAllCheckboxesAreUnchecked();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record found');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        ExportFile.uploadFile(testData.csvFile);
        ExportFile.exportWithDefaultJobProfile(testData.csvFile, 'authority', 'Authorities');
        ExportFile.downloadExportedMarcFile(testData.exportedMarcFile);

        // change exported file
        DataImport.replace999SubfieldsInPreupdatedFile(
          testData.exportedMarcFile,
          testData.marcFileForModify,
          testData.modifiedMarcFile,
        );
        // upload the exported marc file with 999.f.f.s fields
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.modifiedMarcFile, testData.uploadModifiedMarcFile);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImportedForConsortia(testData.uploadModifiedMarcFile);
        Logs.checkJobStatus(testData.uploadModifiedMarcFile, 'Completed');
        Logs.openFileDetails(testData.uploadModifiedMarcFile);
        Logs.verifyInstanceStatus(0, 6, RECORD_STATUSES.UPDATED);
        Logs.clickOnHotLink(0, 6, RECORD_STATUSES.UPDATED);
        MarcAuthority.contains(testData.addedField);
        MarcAuthority.notContains(testData.tag377);
        MarcAuthority.contains(testData.updated1XXField);
        MarcAuthority.notContains(testData.deletedSubfield);

        cy.waitForAuthRefresh(() => {
          cy.login(users.userBProperties.username, users.userBProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          cy.reload();
          MarcAuthorities.waitLoading();
        }, 20_000);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.updatedMarcValue);
        MarcAuthority.contains(testData.addedField);
        MarcAuthority.notContains(testData.tag377);
        MarcAuthority.contains(testData.updated1XXField);
        MarcAuthority.notContains(testData.deletedSubfield);
      },
    );
  });
});
