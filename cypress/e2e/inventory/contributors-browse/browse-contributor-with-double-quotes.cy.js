import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import Logs from '../../../support/fragments/data_import/logs/logs';
import getRandomPostfix from '../../../support/utils/stringTools';
import { JOB_STATUS_NAMES } from '../../../support/constants';

describe('inventory', () => {
  describe('Contributors Browse', () => {
    const user = {};
    const marcFile = {
      marc: 'marcBibC397324.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    };
    let createdAuthorityID;
    const notExactSearchName = '"Giuseppe"';
    const exactSearchName = 'Dalla Torre, "Giuseppe"';

    before('Creating user and test data', () => {
      cy.createTempUser([Permissions.inventoryAll.gui])
        .then((createdUserProperties) => {
          user.userProperties = createdUserProperties;
        })
        .then(() => {
          cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
        })
        .then(() => {
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then((link) => {
            createdAuthorityID = link.split('/')[5];
            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
          InventorySearchAndFilter.selectBrowseContributors();
        });
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityID);
    });

    it(
      'C397324 Browse contributor which has double quotes (spitfire)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        BrowseContributors.searchRecordByName(notExactSearchName);
        BrowseContributors.checkBrowseContributorsResulstListVisible(true);
        BrowseContributors.checkNonExactSearchResultForARow(notExactSearchName, 0);
        BrowseContributors.searchRecordByName(exactSearchName);
        BrowseContributors.checkBrowseContributorsResulstListVisible(true);
        BrowseContributors.checkSearchResultRecord(exactSearchName);
        BrowseContributors.openRecord(exactSearchName);
        InventoryInstances.checkResultsPaneContainsRecordWithContributor(exactSearchName);
      },
    );
  });
});
