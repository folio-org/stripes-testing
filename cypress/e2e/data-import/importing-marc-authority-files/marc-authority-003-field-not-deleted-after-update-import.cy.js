import {
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(20);
    const testData = {
      authorityHeading: `AT_C1003530_MarcAuthority_${randomPostfix}`,
      tag003value: `Tag003 ${randomLetters}`,
      tag003: '003',
      tag100: '100',
      tag400: '400',
      tag999: '999',
      tag400content: `AT_C1003530_Reference_Original_${randomPostfix}`,
      tag400updatedContent: `AT_C1003530_Reference_Updated_${randomPostfix}`,
      tag400quickmarcContent: `AT_C1003530_Reference_QuickMarc_${randomPostfix}`,
      csvFile: `C1003530 exportedCSVFile${randomPostfix}.csv`,
      exportedMarcFile: `C1003530 exportedMarcFile${randomPostfix}.mrc`,
      modifiedMarcFile: `C1003530 modifiedMarcFile${randomPostfix}.mrc`,
      uploadModifiedMarcFile: `C1003530 uploadMarcFile${randomPostfix}.mrc`,
    };
    const authData = {
      prefix: randomLetters,
      startWithNumber: '1',
    };
    const mappingProfile = {
      name: `C1003530 Update MARC authority records ${randomPostfix}`,
    };
    const actionProfile = {
      name: `C1003530 Update MARC authority records ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_AUTHORITY',
    };
    const matchProfile = {
      profileName: `C1003530 Update MARC authority records by 999 ff $i ${randomPostfix}`,
      incomingRecordFields: {
        field: testData.tag999,
        in1: 'f',
        in2: 'f',
        subfield: 'i',
      },
      existingRecordFields: {
        field: testData.tag999,
        in1: 'f',
        in2: 'f',
        subfield: 'i',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      profileName: `C1003530 Update MARC authority records by 999 ff $i ${randomPostfix}`,
    };
    let createdAuthorityID;

    before('Create test data and login', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C1003530_');

      NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile)
        .then((mappingProfileResponse) => {
          mappingProfile.id = mappingProfileResponse.body.id;
        })
        .then(() => {
          NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
            (actionProfileResponse) => {
              actionProfile.id = actionProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
            matchProfile,
          ).then((matchProfileResponse) => {
            matchProfile.id = matchProfileResponse.body.id;
          });
        })
        .then(() => {
          return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
            jobProfile.profileName,
            matchProfile.id,
            actionProfile.id,
          );
        });

      MarcAuthorities.createMarcAuthorityViaAPI(authData.prefix, authData.startWithNumber, [
        { tag: testData.tag003, content: testData.tag003value },
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag400,
          content: `$a ${testData.tag400content}`,
          indicators: ['\\', '\\'],
        },
      ]).then((createdRecordId) => {
        createdAuthorityID = createdRecordId;
      });

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
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      Users.deleteViaApi(testData.userProperties?.userId);
      if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);
    });

    it(
      'C1003530 Verify that 003 field in authority record is not deleted/changed after the update import (promin)',
      { tags: ['criticalPath', 'promin', 'C1003530'] },
      () => {
        // Step 1: Search for authority record, select and export
        MarcAuthorities.searchBeats(testData.authorityHeading);
        MarcAuthorities.selectAllRecords();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
        MarcAuthorities.exportSelected();
        cy.wait(1000);
        ExportFile.downloadCSVFile(testData.csvFile, 'QuickAuthorityExport*');

        // Step 2: Navigate to Data Export and download .mrc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        ExportFile.uploadFile(testData.csvFile);
        ExportFile.exportWithDefaultJobProfile(
          testData.csvFile,
          'Default authority',
          'Authorities',
        );
        ExportFile.downloadExportedMarcFile(testData.exportedMarcFile);

        // Steps 3-4: Edit exported file — replace 400 field content
        DataImport.editMarcFile(
          testData.exportedMarcFile,
          testData.modifiedMarcFile,
          [testData.tag400content],
          [testData.tag400updatedContent],
        );

        // Steps 5-6: Upload modified file and run update job profile
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.modifiedMarcFile, testData.uploadModifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 6: Wait for import completion
        Logs.waitFileIsImported(testData.uploadModifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

        // Step 7: Open file details and verify Updated status for SRS MARC and Authority
        Logs.openFileDetails(testData.uploadModifiedMarcFile);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        // Step 8: Click Updated in Authority column — record opens in MARC authority app
        FileDetails.openAuthority(RECORD_STATUSES.UPDATED);
        MarcAuthority.waitLoading();

        // Step 9: Verify 400 field was updated and 003 field is NOT deleted/changed
        MarcAuthority.checkRowExistsWithTagAndValue(testData.tag400, testData.tag400updatedContent);
        MarcAuthority.contains(testData.tag003, testData.tag003value);

        // Step 10: Click Actions > Edit
        MarcAuthority.edit();

        // Step 11: Edit 400 field and save; verify 003 is still present
        QuickMarcEditor.updateExistingField(
          testData.tag400,
          `$a ${testData.tag400quickmarcContent}`,
        );
        QuickMarcEditor.pressSaveAndClose();
        MarcAuthority.waitLoading();
        MarcAuthority.checkRowExistsWithTagAndValue(
          testData.tag400,
          testData.tag400quickmarcContent,
        );
        MarcAuthority.checkRowExistsWithTagAndValue(testData.tag003, testData.tag003value);
      },
    );
  });
});
