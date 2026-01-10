import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const testData = {
      advSearchOption: 'Advanced search',
      expectedSearchResult: 'The Beatles in mono. Adv search 001',
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
    let instanceHrid;

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

        cy.then(() => {
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
        }).then(() => {
          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"id"=="${createdRecordIDs[3]}"`,
          }).then((instance) => {
            instanceHrid = instance.hrid;
          });
        });
      });
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C736739 Search Instances using advanced search with "AND" operator (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C736739'] },
      () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
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
      { tags: ['criticalPath', 'spitfire', 'C400616', 'eurekaPhase1'] },
      () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
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
          instanceHrid,
          'Contains all',
          'Instance HRID',
          'NOT',
        );
        InventoryInstances.checkAdvSearchModalValues(
          1,
          instanceHrid,
          'Contains all',
          'Instance HRID',
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
      { tags: ['criticalPath', 'spitfire', 'C414977', 'eurekaPhase1'] },
      () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
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
        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.byShared('No');
        });
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
        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.byShared('No');
        });
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
        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.byShared('No');
        });
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        testData.expectedFirstSearchResultsC414977.forEach((expectedResult) => {
          InventorySearchAndFilter.verifySearchResult(expectedResult);
        });
        InventorySearchAndFilter.checkRowsCount(3);
      },
    );
  });
});
