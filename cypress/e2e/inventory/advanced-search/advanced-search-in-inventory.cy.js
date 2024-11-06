import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const testData = {
      advSearchOption: 'Advanced search',
      expectedSearchResult: 'The Beatles in mono. Adv search 001',
      callNumberValue: 'YCN002003400616',
      itemBarcode: 'ITBRCC400616',
      expectedSearchResultsC400616: [
        'Humans and machines Adv Search 003',
        'Mediterranean conference on medical and biological engineering and computing 2013 Adv Search 003',
      ],
      expectedFirstSearchResultsC414977: [
        'Queer comrades : gay identity and Tongzhi activism in postsocialist China / Hongwei Bao.',
        'Queer festivals : challenging collective identities in a transnational europe / Konstantinos Eleftheriadis.',
        'Sexuality, iconography, and fiction in French : queering the martyr / Jason James Hartford.',
      ],
      expectedSecondSearchResultC414977: 'Reckon / Steve McOrmond.',
    };
    const querySearches = [' *Adv Search 003', ' *Adv Search 001'];
    const createdRecordIDs = [];

    const marcFiles = [
      {
        marc: 'marcBibFileC466156.mrc',
        fileName: `C466156 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numberOfRecords: 2,
        propertyName: 'instance',
      },
      {
        marc: 'marcBibFileC400616.mrc',
        fileName: `C400616 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numberOfRecords: 4,
        propertyName: 'instance',
      },
      {
        marc: 'marcBibFileC414977.mrc',
        fileName: `C414977 testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numberOfRecords: 9,
        propertyName: 'instance',
      },
    ];

    before('Creating data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      querySearches.forEach((querySearch) => {
        InventoryInstances.deleteInstanceByTitleViaApi(querySearch);
      });
      testData.expectedFirstSearchResultsC414977.forEach((expectedFirstSearchResultC414977) => {
        InventoryInstances.deleteInstanceByTitleViaApi(expectedFirstSearchResultC414977);
      });
      InventoryInstances.deleteInstanceByTitleViaApi(testData.expectedSecondSearchResultC414977);

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        }).then(() => {
          InventoryInstances.searchByTitle(createdRecordIDs[3]);
          InventoryInstances.selectInstance();
          InventoryInstance.pressAddHoldingsButton();
          InventoryNewHoldings.fillRequiredFields();
          HoldingsRecordEdit.fillCallNumber(testData.callNumberValue);
          InventoryNewHoldings.saveAndClose();
          InventoryInstance.waitLoading();
          // wait to make sure holdings created - otherwise added item might not be saved
          cy.wait(1500);
          InventoryInstance.addItem();
          InventoryInstance.fillItemRequiredFields();
          InventoryInstance.fillItemBarcode(testData.itemBarcode);
          InventoryInstance.saveItemDataAndVerifyExistence('-');
        });
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      createdRecordIDs.forEach((id, index) => {
        if (index !== 3) InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C466156 Search Instances using advanced search with "AND" operator (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466156'] },
      () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.checkAdvSearchInstancesModalFields(0);
        InventoryInstances.checkAdvSearchInstancesModalFields(1);
        InventoryInstances.checkAdvSearchInstancesModalFields(2);
        InventoryInstances.checkAdvSearchInstancesModalFields(3);
        InventoryInstances.checkAdvSearchInstancesModalFields(4);
        InventoryInstances.checkAdvSearchInstancesModalFields(5);
        InventoryInstances.fillAdvSearchRow(
          0,
          'The Beatles Adv search keyword',
          'Starts with',
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        InventoryInstances.checkAdvSearchModalValues(
          0,
          'The Beatles Adv search keyword',
          'Starts with',
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        InventoryInstances.fillAdvSearchRow(
          1,
          'Rock music Adv search subj 001',
          'Exact phrase',
          'Subject',
          'AND',
        );
        InventoryInstances.checkAdvSearchModalValues(
          1,
          'Rock music Adv search subj 001',
          'Exact phrase',
          'Subject',
          'AND',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        InventorySearchAndFilter.verifySearchResult(testData.expectedSearchResult);
        InventorySearchAndFilter.checkRowsCount(1);
      },
    );

    it(
      'C400616 Search Instances using advanced search with a combination of operators (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C400616'] },
      () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          '(OCoLC)on1100023840001116',
          'Exact phrase',
          'OCLC number, normalized',
        );
        InventoryInstances.checkAdvSearchModalValues(
          0,
          '(OCoLC)on1100023840001116',
          'Exact phrase',
          'OCLC number, normalized',
        );
        InventoryInstances.fillAdvSearchRow(
          1,
          'YCN00200300487',
          'Contains all',
          'Effective call number (item), shelving order',
          'NOT',
        );
        InventoryInstances.checkAdvSearchModalValues(
          1,
          'YCN00200300487',
          'Contains all',
          'Effective call number (item), shelving order',
          'NOT',
        );
        InventoryInstances.fillAdvSearchRow(
          2,
          createdRecordIDs[4],
          'Exact phrase',
          'Instance UUID',
          'AND',
        );
        InventoryInstances.checkAdvSearchModalValues(
          2,
          createdRecordIDs[4],
          'Exact phrase',
          'Instance UUID',
          'AND',
        );
        InventoryInstances.fillAdvSearchRow(
          3,
          'Adv search subj 003 Roa Romero, Laura',
          'Starts with',
          'Contributor',
          'OR',
        );
        InventoryInstances.checkAdvSearchModalValues(
          3,
          'Adv search subj 003 Roa Romero, Laura',
          'Starts with',
          'Contributor',
          'OR',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        testData.expectedSearchResultsC400616.forEach((expectedResult) => InventorySearchAndFilter.verifySearchResult(expectedResult));
        InventorySearchAndFilter.checkRowsCount(2);
      },
    );

    it(
      'C414977 Searching Instances using advanced search with "Exact phrase" option returns correct results (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C414977'] },
      () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          'queering the',
          'Exact phrase',
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        InventoryInstances.checkAdvSearchModalValues(
          0,
          'queering the',
          'Exact phrase',
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        testData.expectedFirstSearchResultsC414977.forEach((expectedResult) => {
          InventorySearchAndFilter.verifySearchResult(expectedResult);
        });
        InventorySearchAndFilter.checkRowsCount(3);

        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          'McOrmond, Steven Craig, 1971-',
          'Exact phrase',
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        InventoryInstances.checkAdvSearchModalValues(
          0,
          'McOrmond, Steven Craig, 1971-',
          'Exact phrase',
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        InventorySearchAndFilter.verifySearchResult(testData.expectedSecondSearchResultC414977);
        InventorySearchAndFilter.checkRowsCount(1);

        InventorySearchAndFilter.switchToHoldings();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          'queering the',
          'Exact phrase',
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        InventoryInstances.checkAdvSearchModalValues(
          0,
          'queering the',
          'Exact phrase',
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        testData.expectedFirstSearchResultsC414977.forEach((expectedResult) => {
          InventorySearchAndFilter.verifySearchResult(expectedResult);
        });
        InventorySearchAndFilter.checkRowsCount(3);

        InventorySearchAndFilter.switchToItem();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          'queering the',
          'Exact phrase',
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        InventoryInstances.checkAdvSearchModalValues(
          0,
          'queering the',
          'Exact phrase',
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        testData.expectedFirstSearchResultsC414977.forEach((expectedResult) => {
          InventorySearchAndFilter.verifySearchResult(expectedResult);
        });
        InventorySearchAndFilter.checkRowsCount(3);
      },
    );
  });
});
