import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C358531_FolioInstance_${randomPostfix}`;
    const contributorValue = `AT_C358531_Contributor_${randomPostfix}`;

    let user;
    let createdInstanceId;

    before('Creating user and test data', () => {
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          InventoryInstances.deleteInstanceByTitleViaApi('AT_C358531_FolioInstance');

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
      'C358531 Verify the hit count does not display on Browse contributors list (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C358531'] },
      () => {
        BrowseContributors.waitForContributorToAppear(contributorValue);
        InventorySearchAndFilter.selectBrowseContributors();
        BrowseContributors.expandNameTypeSection();
        BrowseContributors.browse(contributorValue);
        BrowseContributors.checkSearchResultRecord(contributorValue);

        BrowseContributors.verifyInventoryBrowsePaneheader();
      },
    );
  });
});
