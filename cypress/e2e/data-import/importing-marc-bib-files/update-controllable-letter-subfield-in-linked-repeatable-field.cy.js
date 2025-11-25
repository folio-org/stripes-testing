import {
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  DEFAULT_JOB_PROFILE_NAMES,
  APPLICATION_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      markedValue: 'C385660 Lee, Stan,',
      createdRecordIDs: [],
      marcFileForModify: 'marcBibFileForC385660_1.mrc',
      modifiedMarcFile: `C385660 editedMarcFile${getRandomPostfix()}.mrc`,
      uploadModifiedMarcFile: `C385660 testMarcFile${getRandomPostfix()}.mrc`,
      instanceTitle:
        "Black Panther / writer, Ta-Nehisi Coates ; artist, Brian Stelfreeze ; pencils/layouts, Chris Sprouse ; color artist, Laura Martin ; letterer, VC's Joe Sabino.",
      updated700Field: [
        74,
        '700',
        '1',
        '\\',
        '$a C385660 Lee, Stan, $d 1922-2018',
        '$e author.',
        '$0 http://id.loc.gov/authorities/names/n83169267',
        '',
      ],
    };
    const mappingProfile = {
      name: `C385660 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C385660 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const matchProfile = {
      profileName: `C385660 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      profileName: `C385660 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC385660.mrc',
        fileName: `C385660 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileC385660.mrc',
        fileName: `C385660 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
        propertyName: 'authority',
      },
    ];
    const linkingTagAndValue = {
      tag: '700',
      rowIndex: 78,
      value: 'C385660 Lee, Stan,',
    };

    before('Creating test data', () => {
      cy.getAdminToken().then(() => {
        // make sure there are no duplicate records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C385660*');

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
      // create Match profile
      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile)
        .then((matchProfileResponse) => {
          matchProfile.id = matchProfileResponse.body.id;
        })
        .then(() => {
          // create Field mapping profile
          NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile).then(
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

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.waitForAuthRefresh(() => {
          cy.loginAsAdmin();
          TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        }, 20_000).then(() => {
          InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIconByIndex(linkingTagAndValue.rowIndex);
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

        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
      MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1]);
      // clean up generated profiles
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.exportedFileName}`);
    });

    it(
      'C385660 Update controllable letter subfield in linked repeatable field (multiple repeatable fields with same indicators) (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C385660'] },
      () => {
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventorySearchAndFilter.exportInstanceAsMarc();
        // download exported marc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        ExportFile.getExportedFileNameViaApi().then((name) => {
          testData.exportedFileName = name;

          cy.wait(4000);
          ExportFile.downloadExportedMarcFile(testData.exportedFileName);

          DataImport.editMarcFile(
            testData.exportedFileName,
            testData.modifiedMarcFile,
            ['Lee, Stan', 'ecreator.'],
            ['Lee, Stanley', 'eauthor.'],
          );
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFile(testData.modifiedMarcFile, testData.modifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.modifiedMarcFile);
        Logs.checkJobStatus(testData.modifiedMarcFile, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.modifiedMarcFile);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated700Field);
        QuickMarcEditor.openLinkingAuthorityByIndex(74);
        MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedValue);
      },
    );
  });
});
