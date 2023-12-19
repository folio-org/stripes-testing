import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import getRandomPostfix from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import {
  JOB_STATUS_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  RECORD_STATUSES,
  EXISTING_RECORDS_NAMES,
} from '../../../support/constants';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';

describe('data-import', () => {
  describe('Importing MARC Authority files', () => {
    const testData = {
      tag110: '110',
      createdRecordIDs: [],
      marcValue: 'C374167 DiCaprio',
      markedValue: 'C374167 DiCaprio, Leonardo',
      searchOption: 'Keyword',
      csvFile: `exportedCSVFile${getRandomPostfix()}.csv`,
      exportedMarcFile: `exportedMarcFile${getRandomPostfix()}.mrc`,
      marcFileForModify: 'marcBibFileForC374167_1.mrc',
      modifiedMarcFile: `C374167 editedMarcFile${getRandomPostfix()}.mrc`,
      uploadModifiedMarcFile: `C374167 testMarcFile${getRandomPostfix()}.mrc`,
      updated700Field: [
        65,
        '700',
        '1',
        '\\',
        '$a C374167 DiCaprio, Leonardo $e actor. $0 id.loc.gov/authorities/names/n94000330',
      ],
    };
    const mappingProfile = {
      name: `C374167 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
      name: `C374167 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const matchProfile = {
      profileName: `C374167 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
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
      profileName: `C374167 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC374167.mrc',
        fileName: `C374167 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numOfRecords: 2,
      },
      {
        marc: 'marcAuthFileForC374167.mrc',
        fileName: `C374167 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 1,
        authorityHeading: 'C374167 DiCaprio, Leonardo',
      },
    ];
    const linkingTagForFirstMarcBib = [
      {
        rowIndex: 65,
        value: '374167 DiCaprio',
        tag: 700,
      },
    ];

    const linkingTagForSecondMarcBib = [{ rowIndex: 22, value: '374167 DiCaprio', tag: 700 }];
    const twoMarcBibsToLink = [
      {
        marcBibRecord: 'C374167 Titanic / written and directed by James Cameron.',
        linkingFields: linkingTagForFirstMarcBib,
      },
      {
        marcBibRecord:
          'C374167 Aviator / Leonardo DiCaprio, Matt Damon, Jack Nicholson, Robert De Niro, Ray Liotta, Martin Scorsese, Barbara De Fina, Brad Grey, Alan Mak, Felix Chong, Nicholas Pileggi, William Monahan.',
        linkingFields: linkingTagForSecondMarcBib,
      },
    ];

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.loginAsAdmin()
        .then(() => {
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
            cy.visit(TopMenu.dataImportPath);
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            Logs.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(marcFile.fileName);
            for (let i = 0; i < marcFile.numOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((link) => {
                testData.createdRecordIDs.push(link.split('/')[5]);
              });
            }
          });
        })
        .then(() => {
          cy.visit(TopMenu.inventoryPath);
          InventoryInstances.waitContentLoading();
          twoMarcBibsToLink.forEach((marcBib) => {
            InventoryInstances.searchByTitle(marcBib.marcBibRecord);
            cy.wait(1500);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            marcBib.linkingFields.forEach((linking) => {
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
          });
        });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportEnableApp.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.marcValue);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
      InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[1]);
      MarcAuthority.deleteViaAPI(testData.createdRecordIDs[2]);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);
    });

    it(
      'C374167 Update "1XX" tag value of linked "MARC Authority" record which controls 2 "MARC Bib" records (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        cy.wait(1000);
        MarcAuthorities.selectAllRecords();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
        MarcAuthorities.exportSelected();
        cy.wait(1000);
        MarcAuthorities.checkCallout(
          "is complete. The .csv downloaded contains selected records' UIIDs. To retrieve the .mrc file, please go to the Data export app.",
        );
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
        cy.visit(TopMenu.dataImportPath);
        DataImport.uploadFile(testData.modifiedMarcFile, testData.uploadModifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        cy.wait(10000);
        Logs.waitFileIsImported(testData.uploadModifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.uploadModifiedMarcFile);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        cy.visit(TopMenu.marcAuthorities);
        MarcAuthoritiesSearch.searchBy(testData.searchOption, testData.marcValue);
        MarcAuthorities.verifyNumberOfTitles(5, '');
        MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
        MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedValue);
        MarcAuthority.contains(testData.tag110);

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.checkInstanceTitle(twoMarcBibsToLink[0].marcBibRecord);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
        QuickMarcEditor.verifyIconsAfterUnlinking(65);
        QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.updated700Field);
        QuickMarcEditor.closeEditorPane();
        InventoryInstances.searchByTitle(testData.createdRecordIDs[1]);
        InventoryInstances.selectInstance();
        InventoryInstance.checkInstanceTitle(twoMarcBibsToLink[1].marcBibRecord);
        InventoryInstance.viewSource();
        InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
        InventoryViewSource.notContains('$9');
      },
    );
  });
});
