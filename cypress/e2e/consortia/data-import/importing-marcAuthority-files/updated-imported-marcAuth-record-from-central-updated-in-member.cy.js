import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import getRandomPostfix from '../../../../support/utils/stringTools';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfiles from '../../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import FileManager from '../../../../support/utils/fileManager';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  RECORD_STATUSES,
  EXISTING_RECORDS_NAMES,
} from '../../../../support/constants';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../../support/fragments/settings/dataImport';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import NewFieldMappingProfile from '../../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';

describe('data-import', () => {
  describe('Importing MARC Authority files', () => {
    const testData = {
      tag377: '377',
      addedField: '400 0 $a Данте Алигери $d 1265-1321',
      updated1XXField: '$a Dante Alighieri, $d 1265-1321, $t Divine Comedy',
      deletedSubfield: '$zno 98058852',
      createdRecordIDs: [],
      marcValue: 'C405144 Dante Alighieri, 1265-1321',
      updatedMarcValue: 'Dante Alighieri, 1265-1321, Divine Comedy',
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
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
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
      recordType: EXISTING_RECORDS_NAMES.MARC_AUTHORITY,
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
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        propertyName: 'relatedAuthorityInfo',
        numOfRecords: 1,
        authorityHeading: 'C405144 Dante Alighieri, 1265-1321',
      },
    ];
    const linkingTagAndValue = {
      rowIndex: 56,
      value: 'C405144 Roberts, Julia,',
      tag: '700',
    };
    const users = {};

    before('Create test data and login', () => {
      cy.getAdminToken();
      // create user A
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.dataExportEnableApp.gui,
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

      marcFiles.forEach((marcFile) => {
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.entries.forEach((record) => {
            testData.createdRecordIDs.push(record[marcFile.propertyName].idList[0]);
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
      { tags: ['criticalPathECS', 'spitfire'] },
      () => {
        cy.login(users.userAProperties.username, users.userAProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
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

        cy.visit(TopMenu.dataExportPath);
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
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.modifiedMarcFile, testData.uploadModifiedMarcFile);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.uploadModifiedMarcFile);
        Logs.checkJobStatus(testData.uploadModifiedMarcFile, 'Completed');
        Logs.openFileDetails(testData.uploadModifiedMarcFile);
        Logs.verifyInstanceStatus(0, 3, RECORD_STATUSES.UPDATED);
        Logs.clickOnHotLink(0, 3, RECORD_STATUSES.UPDATED);
        MarcAuthority.notContains(testData.addedField);
        MarcAuthority.contains(testData.tag377);
        MarcAuthority.contains(testData.updated1XXField);
        MarcAuthority.notContains(testData.deletedSubfield);

        cy.login(users.userBProperties.username, users.userBProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.updatedMarcValue);
        MarcAuthority.notContains(testData.addedField);
        MarcAuthority.contains(testData.tag377);
        MarcAuthority.contains(testData.updated1XXField);
        MarcAuthority.notContains(testData.deletedSubfield);
      },
    );
  });
});
