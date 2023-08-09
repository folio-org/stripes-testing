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
  const testData = {};
  const createdRecordIDs = [];

  const marcFiles = [
    {
      marc: 'marcBibFileC376596.mrc',
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
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numberOfRecords; i++) {
            Logs.getCreatedItemsID().then(link => {
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
    // InventorySearchAndFilter.selectSearchOptions('Contributor', 'Sauguet, Henri');
    // InventorySearchAndFilter.checkContributorRequest();
    // InventorySearchAndFilter.checkContributorsColumResult('Sauguet');
    // InventorySearchAndFilter.checkContributorsColumResult('Henri');
    // // The resetAll button is used because the reset search input is very unstable
    // InventorySearchAndFilter.resetAll();

    // searchQueries.forEach(query => {
    //   InventorySearchAndFilter.selectSearchOptions('Contributor', query);
    //   InventorySearchAndFilter.clickSearch();
    //   InventorySearchAndFilter.checkContributorsColumResult('Sauguet');
    //   InventorySearchAndFilter.checkContributorsColumResult('Henri');
    //   if (query.includes('1901-1989')) InventorySearchAndFilter.checkContributorsColumResult('Henri');
    //   InventorySearchAndFilter.resetAll();
    // });
  });
});
