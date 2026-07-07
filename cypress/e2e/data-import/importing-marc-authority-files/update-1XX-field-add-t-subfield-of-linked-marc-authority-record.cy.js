import {
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  DEFAULT_JOB_PROFILE_NAMES,
  APPLICATION_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const testData = {
      tag110: '110',
      createdRecordIDs: [],
      marcValue: 'C374170 Beatles',
      updatedMarcValue: 'C374170 Beatles The Beatles in mono.',
      searchOption: 'Keyword',
      csvFile: `C374170 exportedCSVFile${getRandomPostfix()}.csv`,
      exportedMarcFile: `C374170 exportedMarcFile${getRandomPostfix()}.mrc`,
      modifiedMarcFile: `C374170 editedMarcFile${getRandomPostfix()}.mrc`,
      uploadModifiedMarcFile: `C374170 testMarcFile${getRandomPostfix()}.mrc`,
      calloutMessage:
        "is complete. The .csv downloaded contains selected records' UIIDs. To retrieve the .mrc file, please go to the Data export app.",
      instanceTitle: 'AT_C374170_Marc_Instance',
      updated110AuthContent: '$a C374170 Beatles $t The Beatles in mono.',
      updated110BibField: [
        33,
        '110',
        '2',
        '\\',
        '$a C374170 Beatles $0 http://id.loc.gov/authorities/names/n79018119 $4 prf',
      ],
    };
    const mappingProfile = {
      name: `C374170 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C374170 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_AUTHORITY',
    };
    const matchProfile = {
      profileName: `C374170 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
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
      profileName: `C374170 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC374170.mrc',
        fileName: `C374170 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileForC374170.mrc',
        fileName: `C374170 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
    ];
    const linkingTagAndValue = {
      rowIndex: 33,
      value: 'C374170 Beatles',
      tag: '110',
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C374170*');

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
          NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile).then(
            (matchProfileResponse) => {
              matchProfile.id = matchProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          // create Job profile
          NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
            jobProfile.profileName,
            matchProfile.id,
            actionProfile.id,
          );
        });

      cy.then(() => {
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
      }).then(() => {
        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        }).then(() => {
          cy.waitForAuthRefresh(() => {
            cy.reload();
            InventoryInstances.waitContentLoading();
          });
          InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(linkingTagAndValue.tag);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.searchResults(linkingTagAndValue.value);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
            linkingTagAndValue.tag,
            linkingTagAndValue.rowIndex,
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
          authRefresh: true,
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
      InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
      testData.createdRecordIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
      });
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);
    });

    it(
      'C374170 Update "1XX" field value (add "$t") of linked "MARC authority" record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C374170'] },
      () => {
        // Precondition: User is on "MARC authority" pane with search results for "MARC Authority" record
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.marcValue);

        // Step 1, 2: Export the "MARC Authority" record to a CSV file and download it
        MarcAuthorities.selectAllRecords();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
        MarcAuthorities.exportSelected();
        cy.wait(1000);
        MarcAuthorities.checkCallout(testData.calloutMessage);
        ExportFile.downloadCSVFile(testData.csvFile, 'QuickAuthorityExport*');
        MarcAuthorities.verifyAllCheckboxesAreUnchecked();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record found');

        // Step 3, 4: Go to "Data export" app and download the exported MARC file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        ExportFile.uploadFile(testData.csvFile);
        ExportFile.exportWithDefaultJobProfile(
          testData.csvFile,
          'Default authority',
          'Authorities',
        );
        ExportFile.downloadExportedMarcFile(testData.exportedMarcFile);

        // Step 5, 6, 7: Open ".mrc" file and add $t subfield to 110 field in the exported MARC authority file
        DataImport.editMarcFile(
          testData.exportedMarcFile,
          testData.modifiedMarcFile,
          ['C374170 Beatles'],
          ['C374170 Beatles\x1ftThe Beatles in mono.'],
        );

        // Step 8, 9, 10: Upload the modified MARC authority file and run the job profile to update the record
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

        // Step 11, 12, 13: Go to "MARC authority" app and verify that the record is updated
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.marcValue);
        MarcAuthorities.verifyEmptyNumberOfTitlesForRowWithValue(testData.marcValue);
        MarcAuthorities.selectTitle(testData.updatedMarcValue);
        MarcAuthority.waitLoading();
        MarcAuthority.contains(testData.updated110AuthContent);

        MarcAuthority.edit();
        QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
        QuickMarcEditor.checkContentByTag(testData.tag110, testData.updated110AuthContent);
        QuickMarcEditor.closeAuthorityEditorPane();

        // Step 14, 15, 16: Go to "Inventory" app and verify that the linked "MARC bibliographic" record is updated
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
        InventoryInstance.checkMarcAppIconAbsent(0);

        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
        QuickMarcEditor.verifyIconsAfterUnlinkingByTag(testData.tag110);
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.updated110BibField);
      },
    );
  });
});
