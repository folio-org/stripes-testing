import {
  EXISTING_RECORD_NAMES,
  RECORD_STATUSES,
  DEFAULT_JOB_PROFILE_NAMES,
  APPLICATION_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
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
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      updated100Field: [
        33,
        '100',
        '1',
        '\\',
        '$a C377006 Coates, Ta-Nehisi',
        '$e author.',
        '$0 http://id.loc.gov/authorities/names/n2008001084',
        '',
      ],
      updated700Field: [
        75,
        '700',
        '1',
        '\\',
        '$a C377006 Lee, Stan, $d 1922-2018',
        '$e creator.',
        '$0 http://id.loc.gov/authorities/names/n83169267',
        '',
      ],
      accordion: 'Subject',
      searchOption: 'Keyword',
      marcAuthIcon: 'Linked to MARC authority',
    };
    function replace999SubfieldsInPreupdatedFile(
      exportedFileName,
      preUpdatedFileName,
      finalFileName,
    ) {
      FileManager.readFile(`cypress/fixtures/${exportedFileName}`).then((actualContent) => {
        const lines = actualContent.split('');
        const field999data = lines[lines.length - 2];
        FileManager.readFile(`cypress/fixtures/${preUpdatedFileName}`).then((updatedContent) => {
          const content = updatedContent.split('\n');
          let firstString = content[0].slice();
          firstString = firstString.replace(
            'ffs96774f9a-6852-4ffa-994f-96698435abd3i9974c7df-add1-4b7b-a632-4c4f4be397d0',
            field999data,
          );
          content[0] = firstString;
          FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
        });
      });
    }
    // unique file name to upload
    const nameForUpdatedMarcFile = `C377006autotestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C377006autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C377006autotestFile${getRandomPostfix()}.csv`;
    const nameForPreUpdatedMarcBibFile = 'C377006MarcBibPreUpdated.mrc';
    const mappingProfile = {
      name: `C377006 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C377006 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const matchProfile = {
      profileName: `C377006 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
      profileName: `C377006 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC377006.mrc',
        fileName: `C377006 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileForC377006.mrc',
        fileName: `C377006 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 2,
        propertyName: 'authority',
      },
    ];
    const linkingTagAndValues = [
      {
        rowIndex: 32,
        value: 'C377006 Coates, Ta-Nehisi',
        tag: '100',
      },
      {
        rowIndex: 78,
        value: 'C377006 Lee, Stan, 1922-2018',
        tag: '700',
      },
    ];

    const createdAuthorityIDs = [];

    before('Creating user and test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ])
        .then((createdUserProperties) => {
          testData.preconditionUserId = createdUserProperties.userId;

          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C377006*');
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
            cy.wait(2000);
          });

          // create Match profile
          NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile)
            .then((matchProfileResponse) => {
              matchProfile.id = matchProfileResponse.body.id;
            })
            .then(() => {
              // create Field mapping profile
              NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(
                mappingProfile,
              ).then((mappingProfileResponse) => {
                mappingProfile.id = mappingProfileResponse.body.id;
              });
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
        })
        .then(() => {
          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin();
            TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000);
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          linkingTagAndValues.forEach((fields) => {
            QuickMarcEditor.clickLinkIconInTagField(fields.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(fields.value);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(fields.tag, fields.rowIndex);
          });
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
        });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.waitForAuthRefresh(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000);
      });
    });

    after('Delete user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      Users.deleteViaApi(testData.preconditionUserId);
      if (createdAuthorityIDs[0]) InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
      createdAuthorityIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
      });
      // clean up generated profiles
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForUpdatedMarcFile}`);
    });

    it(
      'C377006 Update linked "MARC bib" record with multiple "$0" in repeatable and not repeanable fields >> and open it for edit/derive (added "$0" not matching existing link) (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C377006'] },
      () => {
        InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
        InventoryInstances.selectInstance();
        // download .csv file
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        // download exported marc file
        ExportFile.uploadFile(nameForCSVFile);
        ExportFile.exportWithDefaultJobProfile(nameForCSVFile);
        ExportFile.downloadExportedMarcFile(nameForExportedMarcFile);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        cy.log('#####End Of Export#####');

        // add 999 subfield values from exported file to pre-updated file with field 100 deleted
        replace999SubfieldsInPreupdatedFile(
          nameForExportedMarcFile,
          nameForPreUpdatedMarcBibFile,
          nameForUpdatedMarcFile,
        );

        // upload the exported marc file with 999.f.f.s fields
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(nameForUpdatedMarcFile, nameForUpdatedMarcFile);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameForUpdatedMarcFile);
        Logs.checkJobStatus(nameForUpdatedMarcFile, 'Completed');
        Logs.openFileDetails(nameForUpdatedMarcFile);
        Logs.verifyInstanceStatus(0, 3, RECORD_STATUSES.UPDATED);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated100Field);
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated700Field);
        QuickMarcEditor.closeEditorPane();

        InventoryInstance.viewSource();
        InventoryViewSource.contains(
          `${testData.marcAuthIcon}\n\t${linkingTagAndValues[0].tag}\t1  \t$a C377006 Coates, Ta-Nehisi $e author. $0 http://id.loc.gov/authorities/names/n2008001084 $9`,
        );
        InventoryViewSource.contains(
          `${testData.marcAuthIcon}\n\t${linkingTagAndValues[1].tag}\t1  \t$a C377006 Lee, Stan, $d 1922-2018 $e creator. $0 http://id.loc.gov/authorities/names/n83169267 $9`,
        );
        InventoryViewSource.close();
        InventoryInstance.deriveNewMarcBib();
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated100Field);
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated700Field);
      },
    );
  });
});
