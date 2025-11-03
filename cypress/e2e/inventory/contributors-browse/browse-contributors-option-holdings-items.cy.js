import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
  searchHoldingsOptions,
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C353642_FolioInstance_${randomPostfix}`;
    const contributorValue = `AT_C353642_Contributor_${randomPostfix}`;
    const browseContributorsOption = 'Browse contributors';

    let user;
    let createdInstanceId;

    before('Creating user and test data', () => {
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          InventoryInstances.deleteInstanceByTitleViaApi('AT_C353642_FolioInstance');

          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            BrowseContributors.getContributorTypes({
              searchParams: { limit: 1, query: 'source<>local' },
            }).then((contributorTypes) => {
              InventoryInstance.createInstanceViaApi({
                instanceTitle,
              }).then(({ instanceData }) => {
                cy.getInstanceById(instanceData.instanceId).then((body) => {
                  const requestBody = body;
                  requestBody.contributors = [
                    {
                      name: contributorValue,
                      contributorNameTypeId: contributorNameTypes[0].id,
                      contributorTypeId: contributorTypes[0].id,
                      contributorTypeText: '',
                      primary: true,
                    },
                  ];
                  cy.updateInstance(requestBody);
                  createdInstanceId = instanceData.instanceId;

                  cy.login(user.username, user.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                    authRefresh: true,
                  });
                });
              });
            });
          });
        },
      );
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(createdInstanceId);
    });

    it(
      'C353642 Verify that "Browse contributors" search option not displayed at "Holdings"/"item" tabs. (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C353642'] },
      () => {
        BrowseContributors.waitForContributorToAppear(contributorValue);
        InventorySearchAndFilter.selectBrowseContributors();
        BrowseContributors.browse(contributorValue);
        BrowseContributors.checkSearchResultRecord(contributorValue);

        InventorySearchAndFilter.switchToSearchTab();
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchHoldingsOptions[0]);
        InventorySearchAndFilter.clickSearchOptionSelect();
        InventorySearchAndFilter.verifySearchOptionIncluded(browseContributorsOption, false);

        InventorySearchAndFilter.switchToInstance();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchInstancesOptions[0]);
        InventorySearchAndFilter.clickSearchOptionSelect();
        InventorySearchAndFilter.verifySearchOptionIncluded(browseContributorsOption, false);

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchItemsOptions[0]);
        InventorySearchAndFilter.clickSearchOptionSelect();
        InventorySearchAndFilter.verifySearchOptionIncluded(browseContributorsOption, false);
      },
    );
  });
});
