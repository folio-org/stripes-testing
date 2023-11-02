import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import Parallelization from '../../../support/dictionary/parallelization';

describe('Inventory -> Advanced search', () => {
  const testData = {
    advSearchOption: 'Advanced search',
    expectedSearchResult: 'The Beatles in mono. Adv search 001',
    callNumberValue: 'YCN002003400616',
    itemBarcode: 'ITBRCC400616',
    expectedSearchResultsC400616: [
      'Humans and machines Adv Search 003',
      'Mediterranean conference on medical and biological engineering and computing 2013 Adv Search 003',
    ],
  };
  const createdRecordIDs = [];

  const marcFiles = [
    {
      marc: 'marcBibFileC400610.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 2,
    },
    {
      marc: 'marcBibFileC400616.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 4,
    },
  ];

  before('Creating data', () => {
    cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(marcFile.fileName);
            for (let i = 0; i < marcFile.numberOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((link) => {
                createdRecordIDs.push(link.split('/')[5]);
              });
            }
          },
        );
      });
      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstance.searchByTitle(createdRecordIDs[3]);
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
    });
  });

  beforeEach('Logging in', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    createdRecordIDs.forEach((id, index) => {
      if (index !== 3) InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C400610 Search Instances using advanced search with "AND" operator (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
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
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
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
});
