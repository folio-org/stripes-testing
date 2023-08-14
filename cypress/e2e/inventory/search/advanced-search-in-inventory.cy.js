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

describe('Inventory -> Advanced search', () => {
  const testData = {
    advSearchOption: 'Advanced search',
    expectedSearchResult: 'The Beatles in mono. Adv search 001'
  };
  const createdRecordIDs = [];

  const marcFiles = [
    {
      marc: 'marcBibFileC400610.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numberOfRecords: 2
    }
  ];

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
      marcFiles.forEach(marcFile => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numberOfRecords; i++) {
            Logs.getCreatedItemsID(i).then(link => {
              createdRecordIDs.push(link.split('/')[5]);
            });
          }
        });
      });
      cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
    });
  });

  after('Deleting data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach(id => {
      InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it('C400610 Search Instances using advanced search with "AND" operator (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    InventoryInstances.clickAdvSearchButton();
    InventoryInstances.checkAdvSearchInstancesModalFields(0);
    InventoryInstances.checkAdvSearchInstancesModalFields(1);
    InventoryInstances.checkAdvSearchInstancesModalFields(2);
    InventoryInstances.checkAdvSearchInstancesModalFields(3);
    InventoryInstances.checkAdvSearchInstancesModalFields(4);
    InventoryInstances.checkAdvSearchInstancesModalFields(5);
    InventoryInstances.fillAdvSearchRow(0, 'The Beatles Adv search keyword', 'Starts with', 'Keyword (title, contributor, identifier, HRID, UUID)');
    InventoryInstances.checkAdvSearchModalValues(0, 'The Beatles Adv search keyword', 'Starts with', 'Keyword (title, contributor, identifier, HRID, UUID)');
    InventoryInstances.fillAdvSearchRow(1, 'Rock music Adv search subj 001', 'Exact phrase', 'Subject', 'AND');
    InventoryInstances.checkAdvSearchModalValues(1, 'Rock music Adv search subj 001', 'Exact phrase', 'Subject', 'AND');
    InventoryInstances.clickSearchBtnInAdvSearchModal();
    InventoryInstances.checkAdvSearchModalAbsence();
    InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
    InventorySearchAndFilter.verifySearchResult(testData.expectedSearchResult);
    InventorySearchAndFilter.checkRowsCount(1);
  });
});
