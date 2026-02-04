import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const user = {};
    const marcFile = {
      marc: 'marcBibC397324.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
      numOfRecords: 1,
    };
    let createdAuthorityID;
    const notExactSearchName = '"Giuseppe"';
    const exactSearchName = 'Dalla Torre, "Giuseppe"';

    before('Creating user and test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        user.userProperties = createdUserProperties;
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityID = record[marcFile.propertyName].id;
          });
        });

        cy.login(user.userProperties.username, user.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventorySearchAndFilter.selectBrowseContributors();
        BrowseContributors.waitForContributorToAppear(exactSearchName);
      });
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityID);
    });

    it(
      'C397324 Browse contributor which has double quotes (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C397324', 'eurekaPhase1'] },
      () => {
        BrowseContributors.searchRecordByName(notExactSearchName);
        BrowseContributors.checkBrowseContributorsResulstListVisible(true);
        BrowseContributors.checkNonExactMatchPlaceholder(notExactSearchName);
        BrowseContributors.searchRecordByName(exactSearchName);
        BrowseContributors.checkBrowseContributorsResulstListVisible(true);
        BrowseContributors.checkSearchResultRecord(exactSearchName);
        BrowseContributors.openRecord(exactSearchName);
        InventoryInstances.checkResultsPaneContainsRecordWithContributor(exactSearchName);
      },
    );
  });
});
