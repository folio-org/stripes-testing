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
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      updated245Field: [19, '245', '1', '0', '$a C380519 Variations / $c Van L.  Beethoven.'],
      updated100Field: [
        17,
        '100',
        '1',
        '\\',
        '$a C380519 Ludwig one, Beethoven, $d 1770-1827',
        '$e composer.',
        '$0 http://id.loc.gov/authorities/names/n79107741',
        '',
      ],
      updated240Field: [
        18,
        '240',
        '1',
        '0',
        '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
        '$c Ludwig Van Beethoven.',
        '$0 http://id.loc.gov/authorities/names/n83130832',
        '',
      ],
      updated700Field: [
        50,
        '700',
        '1',
        '\\',
        '$a C380519 Hewitt, Angela, $d 1958-',
        '$e instrumentalist, $e writer of supplementary textual content.',
        '$0 http://id.loc.gov/authorities/names/n91099716',
        '',
      ],
    };
    let firstFieldId = null;
    let secondFieldId = null;
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
            'ffsfeb049c4-d32f-4844-a472-6202bf1abfd1id2e9d64f-cbe1-421c-9b63-45ef8625328c',
            field999data,
          );
          content[0] = firstString;
          FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
        });
      });
    }
    // unique file name to upload
    const nameForUpdatedMarcFile = `C380519autotestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C380519autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C380519autotestFile${getRandomPostfix()}.csv`;
    const nameForPreUpdatedMarcBibFile = 'C380519MarcBibPreUpdated.mrc';
    const mappingProfile = {
      name: `C380519 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C380519 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const matchProfile = {
      profileName: `C380519 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
      profileName: `C380519 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
    };
    const protectedFields = {
      firstField: '100',
      secondField: '700',
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC380519.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileForC380519.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 4,
        propertyName: 'authority',
      },
    ];
    const linkingTagAndValues = [
      {
        rowIndex: 16,
        value: 'C380519 Ludwig one, Beethoven, 1770-1827',
        tag: 100,
      },
      {
        rowIndex: 17,
        value:
          'C380519 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
        tag: 240,
      },
      {
        rowIndex: 49,
        value: 'C380519 Hewitt, Angela, 1958-',
        tag: 700,
      },
    ];
    const createdAuthorityIDs = [];

    before('Creating user and test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380519');

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.getAdminToken()
          .then(() => {
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
            });
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.loginAsAdmin();
              TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
              InventoryInstances.waitContentLoading();
            }, 20_000);
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            linkingTagAndValues.forEach((linking) => {
              QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(linking.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          })
          .then(() => {
            MarcFieldProtection.createViaApi({
              indicator1: '*',
              indicator2: '*',
              subfield: '0',
              data: '*',
              source: 'USER',
              field: protectedFields.firstField,
            }).then((resp) => {
              firstFieldId = resp.id;
            });
            MarcFieldProtection.createViaApi({
              indicator1: '*',
              indicator2: '*',
              subfield: '9',
              data: '*',
              source: 'USER',
              field: protectedFields.secondField,
            }).then((resp) => {
              secondFieldId = resp.id;
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
        })
        .then(() => {
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
      if (createdAuthorityIDs[0]) InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
      createdAuthorityIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
      });
      MarcFieldProtection.deleteViaApi(firstFieldId);
      MarcFieldProtection.deleteViaApi(secondFieldId);
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
      'C380519 Cant delete protected and linked fields using update MARC Bib profile (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C380519'] },
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

        Logs.clickOnHotLink(0, 3, RECORD_STATUSES.UPDATED);
        InventoryInstance.waitLoading();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.updated245Field);
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated100Field);
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated240Field);
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated700Field);
      },
    );
  });
});
