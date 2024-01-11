import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('marc', () => {
  describe('MARC Authority', () => {
    const testData = {
      tag: '110',
      marcValue: 'Beatles',
      rowIndex: 33,
      searchOption: 'Corporate/Conference name',
      instanceTitle: 'The Beatles in mono.',
    };

    const marcFiles = [
      {
        marc: 'marcBibFileForC375261.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numOfRecords: 1,
      },
      {
        marc: 'marcFileForC375261.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 1,
      },
    ];

    const createdAuthorityIDs = [];

    before('Creating user', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        marcFiles.forEach((marcFile) => {
          cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
            () => {
              DataImport.verifyUploadState();
              DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
              JobProfiles.waitLoadingList();
              JobProfiles.search(marcFile.jobProfileToRun);
              JobProfiles.runImportFile();
              Logs.waitFileIsImported(marcFile.fileName);
              Logs.checkStatusOfJobProfile('Completed');
              Logs.openFileDetails(marcFile.fileName);
              for (let i = 0; i < marcFile.numOfRecords; i++) {
                Logs.getCreatedItemsID(i).then((link) => {
                  createdAuthorityIDs.push(link.split('/')[5]);
                });
              }
            },
          );
        });

        cy.visit(TopMenu.inventoryPath).then(() => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResults(testData.marcValue);
          MarcAuthorities.selectTitle(testData.marcValue);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag, testData.rowIndex);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
      createdAuthorityIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C375261 "Number of titles" link in "MARC authority" app opens linked "MARC bib" record with controlled "110" field (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'nonParallel'] },
      () => {
        MarcAuthorities.switchToBrowse();
        MarcAuthorities.searchByParameter(testData.searchOption, testData.marcValue);
        MarcAuthorities.checkRow(testData.marcValue);
        MarcAuthorities.verifyNumberOfTitles(5, '1');
        MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
        InventoryInstance.checkPresentedText(testData.instanceTitle);
      },
    );
  });
});
