import {
  ACCEPTED_DATA_TYPE_NAMES,
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
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
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
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const testData = {
      tag630: '630',
      tag130: '130',
      tag130content: '',
      createdRecordIDs: [],
      marcValue: 'C374184 Marvel comics',
      searchOption: 'Keyword',
      csvFile: `C374184 exportedCSVFile${getRandomPostfix()}.csv`,
      exportedMarcFile: `C374184 exportedMarcFile${getRandomPostfix()}.mrc`,
      marcFileForModify: 'marcBibFileForC374184_1.mrc',
      modifiedMarcFile: `C374184 editedMarcFile${getRandomPostfix()}.mrc`,
      uploadModifiedMarcFile: `C374184 testMarcFile${getRandomPostfix()}.mrc`,
      updated630Field: [
        22,
        '630',
        '0',
        '0',
        '$a C374184 Marvel comics',
        '$v Catalogs.',
        '$0 http://id.loc.gov/authorities/names/n80026980',
        '',
      ],
      instanceTitle: 'Marvel comics direct distributors meeting / Marvel Comics Group.',
      calloutMessage:
        "is complete. The .csv downloaded contains selected records' UIIDs. To retrieve the .mrc file, please go to the Data export app.",
    };
    const mappingProfile = {
      name: `C374184 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C374184 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_AUTHORITY',
    };
    const matchProfile = {
      profileName: `C374184 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
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
      profileName: `C374184 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC374184.mrc',
        fileName: `C374184 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileForC374184.mrc',
        fileName: `C374184 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
        authorityHeading: 'C374184 Marvel comics',
        propertyName: 'authority',
      },
    ];
    const linkingTagAndValue = {
      rowIndex: 22,
      value: 'C374184 Marvel comics',
      tag: '630',
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C374184*');

      // create Match profile
      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile)
        .then((matchProfileResponse) => {
          matchProfile.id = matchProfileResponse.body.id;
        })
        .then(() => {
          // create Field mapping profile
          NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile).then(
            (mappingProfileResponse) => {
              mappingProfile.id = mappingProfileResponse.body.id;
            },
          );
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
          // create Job profile
          NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
            jobProfile.profileName,
            matchProfile.id,
            actionProfile.id,
          );
        });

      cy.getAdminToken().then(() => {
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
          cy.wait(2000);
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.waitForAuthRefresh(() => {
          cy.loginAsAdmin();
          TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        }, 20_000);
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIconByIndex(22);
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

        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        }, 20_000);
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.marcValue);
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
      'C374184 Edit "010 $a" with valid value in linked "MARC Authority" record when "001" = "$0" by value without prefix (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C374184'] },
      () => {
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
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.marcValue);
        MarcAuthorities.verifyNumberOfTitles(5, '1');
        MarcAuthorities.selectTitle(testData.marcValue);
        MarcAuthorities.checkRecordDetailPageMarkedValue(testData.marcValue);
        MarcAuthority.contains(testData.tag130);
        MarcAuthority.contains(testData.tag130content);
        MarcAuthorities.closeMarcViewPane();
        MarcAuthorities.verifyNumberOfTitles(5, '1');
        MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
        InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
        QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(22);
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated630Field);
      },
    );
  });
});
