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
      createdRecordIDs: [],
      searchValue: 'C624349',
      searchValueUpdated:
        'C624349 Black Panther UPDATED using 999 ff s match (Fictitious character)',
      searchOption: 'Keyword',
      csvFile: `C624349 exportedCSVFile${getRandomPostfix()}.csv`,
      exportedMarcFile: `C624349 exportedMarcAuthFile${getRandomPostfix()}.mrc`,
      marcFileForModify: 'marcAuthFileForC624349_preupdated.mrc',
      modifiedMarcFile: `C624349 editedMarcFile${getRandomPostfix()}.mrc`,
      uploadModifiedMarcFile: `C624349 testMarcAuthFile${getRandomPostfix()}.mrc`,
      updated700Field: [
        46,
        '600',
        '0',
        '0',
        '$a C624349 Black Panther UPDATED using 999 ff s match $c (Fictitious character)',
        '$v Comic books, strips, etc.',
        '$0 http://id.loc.gov/authorities/names/n2016243491',
        '',
      ],
      instanceTitle:
        "C624349 Black Panther / writer, Ta-Nehisi Coates ; artist, Brian Stelfreeze ; pencils/layouts, Chris Sprouse ; color artist, Laura Martin ; letterer, VC's Joe Sabino.",
      calloutMessage:
        "is complete. The .csv downloaded contains selected records' UIIDs. To retrieve the .mrc file, please go to the Data export app.",
      postfixForLinkedFields: 'UPDATED using 999 ff s match',
    };
    const mappingProfile = {
      name: `AT_C624349_MappingProfile Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `AT_C624349_ActionProfile Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_AUTHORITY',
    };
    const matchProfile = {
      profileName: `AT_C624349_MatchProfile Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
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
      profileName: `AT_C624349_JobProfie Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC624349.mrc',
        fileName: `C624349 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileForC624349.mrc',
        fileName: `C624349 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
    ];
    const linkingTagAndValues = [
      { tag: '100', rowIndex: 33, value: 'C624349 Coates, Ta-Nehisi', uuidIndex: 1 },
      { tag: '600', rowIndex: 46, value: 'C624349 Black Panther', uuidIndex: 2 },
      { tag: '650', rowIndex: 47, value: 'C624349 Kings and rulers', uuidIndex: 3 },
      { tag: '650', rowIndex: 49, value: 'C624349 Insurgency', uuidIndex: 4 },
      { tag: '650', rowIndex: 51, value: 'C624349 Black people', uuidIndex: 5 },
      { tag: '655', rowIndex: 66, value: 'C624349 Comics (Graphic works)', uuidIndex: 6 },
      { tag: '655', rowIndex: 70, value: 'C624349 Comics (Graphic works)', uuidIndex: 6 },
      { tag: '655', rowIndex: 69, value: 'C624349 Superhero comics', uuidIndex: 7 },
      { tag: '700', rowIndex: 75, value: 'C624349 Sprouse, Chris', uuidIndex: 8 },
      { tag: '700', rowIndex: 79, value: 'C624349 Kirby, Jack', uuidIndex: 9 },
      { tag: '700', rowIndex: 80, value: 'C624349 Acuña, Daniel,', uuidIndex: 0 },
    ];

    function replace999SubfieldsInPreupdatedFile(
      exportedFileName,
      preUpdatedFileName,
      finalFileName,
    ) {
      FileManager.readFile(`cypress/fixtures/${exportedFileName}`).then((actualContent) => {
        const records = actualContent.split('');
        records.forEach((record) => {
          linkingTagAndValues.forEach((linkingTagAndValue, index) => {
            if (record.includes(linkingTagAndValue.value)) {
              const lines = record.split('');
              linkingTagAndValues[index].field999data = lines[lines.length - 2];
            }
          });
        });
        FileManager.readFile(`cypress/fixtures/${preUpdatedFileName}`).then((updatedContent) => {
          const content = updatedContent.split('\n');
          let firstString = content[0].slice();
          linkingTagAndValues.forEach((linkingTagAndValue) => {
            firstString = firstString.replace(
              `ffs00000000-0000-0000-0000-00000000000${linkingTagAndValue.uuidIndex}i00000000-0000-0000-0000-00000000000${linkingTagAndValue.uuidIndex}`,
              linkingTagAndValue.field999data,
            );
          });
          content[0] = firstString;
          FileManager.createFile(`cypress/fixtures/${finalFileName}`, content.join('\n'));
        });
      });
    }

    before('Create test data and login', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C624349');

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
          InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          linkingTagAndValues.forEach((linkingTagAndValue) => {
            InventoryInstance.verifyAndClickLinkIconByIndex(linkingTagAndValue.rowIndex);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResults(linkingTagAndValue.value);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              linkingTagAndValue.tag,
              linkingTagAndValue.rowIndex,
            );
            cy.wait(200);
          });
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          cy.wait(4000);
        });

        cy.getAdminToken();
        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.waitLoading();
          MarcAuthorities.verifyDisabledSearchButton();
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
      'C624349 Update 10 linked MARC authority records which are linked to the same MARC bibliographic record using 999 ff $s for match (5 links are retained, 6 links are deleted) (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C624349'] },
      () => {
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.searchValue);
        cy.wait(1000);
        MarcAuthorities.selectAllRecords();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('10 records selected');
        MarcAuthorities.exportSelected();
        cy.wait(1000);
        MarcAuthorities.checkCallout(testData.calloutMessage);
        ExportFile.downloadCSVFile(testData.csvFile, 'QuickAuthorityExport*');
        MarcAuthorities.verifyAllCheckboxesAreUnchecked();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('10 records found');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        ExportFile.uploadFile(testData.csvFile);
        ExportFile.exportWithDefaultJobProfile(
          testData.csvFile,
          'Default authority',
          'Authorities',
        );
        ExportFile.downloadExportedMarcFile(testData.exportedMarcFile);

        // change exported file
        replace999SubfieldsInPreupdatedFile(
          testData.exportedMarcFile,
          testData.marcFileForModify,
          testData.modifiedMarcFile,
        );
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.uploadFileAndRetry(testData.modifiedMarcFile, testData.uploadModifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.uploadModifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        cy.wait(3000); // wait for file details to be loaded
        Logs.openFileDetails(testData.uploadModifiedMarcFile);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.authority,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.srsMarc,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.waitLoading();
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.searchValueUpdated);
        MarcAuthorities.verifyNumberOfTitles(5, '1');
        MarcAuthorities.clickNumberOfTitlesByHeading(testData.searchValueUpdated);
        InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.updated700Field);
        linkingTagAndValues.forEach((linkingTagAndValue, index) => {
          if (index < 5) {
            QuickMarcEditor.verifyRowLinked(linkingTagAndValue.rowIndex);
            QuickMarcEditor.checkLinkedFieldContainsControlledValueByIndex(
              linkingTagAndValue.rowIndex,
              `$a ${linkingTagAndValue.value} ${testData.postfixForLinkedFields}`,
              linkingTagAndValue.tag,
            );
          } else {
            QuickMarcEditor.verifyRowLinked(linkingTagAndValue.rowIndex, false);
            QuickMarcEditor.checkFieldContainsValueByIndex(
              linkingTagAndValue.rowIndex,
              `$a ${linkingTagAndValue.value} $`,
              linkingTagAndValue.tag,
            );
          }
          cy.wait(500);
        });
      },
    );
  });
});
