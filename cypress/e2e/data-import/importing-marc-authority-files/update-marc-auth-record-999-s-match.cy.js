import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import {
  EXISTING_RECORD_NAMES,
  APPLICATION_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const testData = {
      createdRecordIDs: [],
      searchOption: 'Keyword',
      createdRecordTitle: 'C350668 Chin, Staceyann, 1972- Crossfire.',
      updatedBySRecordTitle: 'C350668 Chin, Staceyann, 1972- Updated by 999ffSs match',
      updatedBySRecord1XXcontent:
        '$a C350668 Chin, Staceyann, $d 1972- $t Updated by 999ffSs match',
      added400fieldContent: '$a C350668 added field',
      csvFile: `C350668 exportedCSVFile${getRandomPostfix()}.csv`,
      exportedMarcFile: `C350668 exportedMarcFile${getRandomPostfix()}.mrc`,
      marcFileForModify: 'marcAuthFileForC350668ModifiedByS.mrc',
      modifiedMarcFile: `C350668 editedMarcFile${getRandomPostfix()}.mrc`,
      uploadModifiedMarcFile: `C350668 testMarcFile${getRandomPostfix()}.mrc`,
    };
    const mappingProfile = {
      name: `C350668 Update MARC authority records ${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C350668 Update MARC authority records ${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_AUTHORITY',
    };
    const matchProfile = {
      profileName: `C350668 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
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
      profileName: `C350668 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
    };
    const marcFile = {
      marc: 'marcAuthFileForC350668.mrc',
      fileName: `C350668_testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numOfRecords: 1,
      authorityHeading: 'C350668 Chin, Staceyann, 1972- Crossfire. Spoken word',
      propertyName: 'authority',
    };
    const propertyName = 'authority';
    let createdAuthorityID;

    before('Create test data and login', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C350668*');

      // create Field mapping profile
      NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile)
        .then((mappingProfileResponse) => {
          mappingProfile.id = mappingProfileResponse.body.id;
        })
        .then(() => {
          // create Action profile and link it to Field mapping profile
          NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
            (actionProfileResponse) => {
              actionProfile.id = actionProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          // create Match profile
          return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
            matchProfile,
          ).then((matchProfileResponse) => {
            matchProfile.id = matchProfileResponse.body.id;
          });
        })
        .then(() => {
          // create Job profiles for $s match
          return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
            jobProfile.profileName,
            matchProfile.id,
            actionProfile.id,
          );
        });

      // import (create) MARC authority
      DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfileToRun).then(
        (response) => {
          response.forEach((record) => {
            createdAuthorityID = record[propertyName].id;
          });
        },
      );

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      Users.deleteViaApi(testData.userProperties.userId);
      if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);
    });

    it(
      'C350668 Update a MARC authority record via data import. Record match with 999 ff $s (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C350668'] },
      () => {
        MarcAuthorities.searchBy(testData.searchOption, testData.createdRecordTitle);
        MarcAuthorities.selectAllRecords();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
        MarcAuthorities.exportSelected();
        cy.wait(1000);
        // MarcAuthorities.checkCallout(testData.calloutMessage);
        ExportFile.downloadCSVFile(testData.csvFile, 'QuickAuthorityExport*');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        ExportFile.uploadFile(testData.csvFile);
        ExportFile.exportWithDefaultJobProfile(
          testData.csvFile,
          'Default authority',
          'Authorities',
        );
        ExportFile.downloadExportedMarcFile(testData.exportedMarcFile);

        // change exported file
        DataImport.replace999SubfieldsInPreupdatedFile(
          testData.exportedMarcFile,
          testData.marcFileForModify,
          testData.modifiedMarcFile,
        );
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(testData.modifiedMarcFile, testData.uploadModifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.uploadModifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.uploadModifiedMarcFile);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBy(testData.searchOption, testData.updatedBySRecordTitle);
        MarcAuthorities.selectTitle(testData.updatedBySRecordTitle);
        MarcAuthority.contains(testData.updatedBySRecord1XXcontent);
        MarcAuthority.contains(testData.added400fieldContent);
      },
    );
  });
});
