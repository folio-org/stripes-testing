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
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import { JOB_STATUS_NAMES } from '../../../support/constants';

describe('Browse in Inventory', () => {
  const testData = {
    contributorName: 'McOrmond, Steve, 1971- (Test)',
  };

  const values = {
    name: 'McOrmond, Steve, 1971- (Test)',
    contributorNameTypeId: '2b94c631-fca9-4892-a730-03ee529ffe2a',
    authorityId: 'bb30e977-f934-4a2f-8fb8-858bac51b7ad',
    isAnchor: true,
    totalRecords: 1
  };

  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  const fileName = `testInventoryFile.${getRandomPostfix()}.mrc`;
  const createdInstanceIDs = [];

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiInventoryViewCreateEditInstances.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
  });

  afterEach('Deleting data', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();
  });

  after('Deleting data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    createdInstanceIDs.forEach(id => {
      InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it('C359597 Verify that contributors with the same "Name" , "Name type" and "authorityID" will display as one row in the response (spitfire)',
    { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
      DataImport.uploadFile('marcFileForC359597.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.searchJobProfileForImport(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(fileName);
      for (let i = 0; i < 1; i++) {
        Logs.getCreatedItemsID(i).then(link => {
          createdInstanceIDs.push(link.split('/')[5]);
        });
      }

      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      BrowseContributors.select();
      BrowseContributors.browse(testData.contributorName);
      BrowseContributors.checkSearchResultRecord(testData.contributorName);
      BrowseContributors.checkContributorRowValues(values);
    });
});
