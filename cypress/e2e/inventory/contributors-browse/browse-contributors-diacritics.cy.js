import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const instanceTitle = 'C466294 Instance Autotest';
    const exactQuery = 'Wærn, Hakon Autotest B';
    const additionalContributorValues = ['Waern, Hakon Autotest A', 'Waern, Hakon Autotest C'];
    const nonExactQuery = `${exactQuery} Extra`;
    let user;
    let createdInstanceId;
    const browseQueries = [exactQuery, nonExactQuery, exactQuery, nonExactQuery];

    before('Creating user and test data', () => {
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          InventoryInstances.getInstancesViaApi({
            limit: 100,
            query: `title="${instanceTitle}*"`,
          }).then((instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          });

          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            BrowseContributors.getContributorTypes().then((contributorTypes) => {
              InventoryInstance.createInstanceViaApi({
                instanceTitle,
              }).then(({ instanceData }) => {
                cy.getInstanceById(instanceData.instanceId).then((body) => {
                  const requestBody = body;
                  requestBody.contributors = [
                    {
                      name: exactQuery,
                      contributorNameTypeId: contributorNameTypes[0].id,
                      contributorTypeId: contributorTypes[0].id,
                      contributorTypeText: '',
                      primary: true,
                    },
                    {
                      name: additionalContributorValues[0],
                      contributorNameTypeId: contributorNameTypes[0].id,
                      contributorTypeId: contributorTypes[0].id,
                      contributorTypeText: '',
                      primary: false,
                    },
                    {
                      name: additionalContributorValues[1],
                      contributorNameTypeId: contributorNameTypes[0].id,
                      contributorTypeId: contributorTypes[0].id,
                      contributorTypeText: '',
                      primary: false,
                    },
                    {
                      name: 'abc1',
                      contributorNameTypeId: contributorNameTypes[0].id,
                      contributorTypeId: contributorTypes[0].id,
                      contributorTypeText: '',
                      primary: false,
                    },
                    {
                      name: 'abc2',
                      contributorNameTypeId: contributorNameTypes[0].id,
                      contributorTypeId: contributorTypes[0].id,
                      contributorTypeText: '',
                      primary: false,
                    },
                    {
                      name: 'abc3',
                      contributorNameTypeId: contributorNameTypes[0].id,
                      contributorTypeId: contributorTypes[0].id,
                      contributorTypeText: '',
                      primary: false,
                    },
                  ];
                  cy.updateInstance(requestBody);
                  createdInstanceId = instanceData.instanceId;

                  cy.login(user.username, user.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                  });
                  InventorySearchAndFilter.selectBrowseContributors();
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
      'C466294 Browse contributors which has diacritics (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C466294'] },
      () => {
        BrowseContributors.waitForContributorToAppear(exactQuery, true);
        browseQueries.forEach((query) => {
          if (query === exactQuery) {
            BrowseContributors.browse(query);
            BrowseContributors.checkSearchResultRecord(query);
            BrowseContributors.checkRowValue(4, additionalContributorValues[0]);
            BrowseContributors.checkRowValue(6, additionalContributorValues[1]);
          } else {
            BrowseContributors.browse(query);
            BrowseContributors.checkNonExactMatchPlaceholder(query);
            BrowseContributors.checkRowValue(3, additionalContributorValues[0]);
            BrowseContributors.checkRowValue(4, exactQuery);
            BrowseContributors.checkRowValue(6, additionalContributorValues[1]);
          }
        });
      },
    );
  });
});
