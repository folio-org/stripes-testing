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
    const contributorPrefix = 'Wærn, Hakon Autotest';
    const exactQuery = `${contributorPrefix} C`;
    const nonExactQuery = `${exactQuery} Extra`;
    const exactQueryNoDiacritics = exactQuery.replace('æ', 'ae');
    const nonExactQueryNoDiacritics = `${exactQueryNoDiacritics} Extra`;
    const additionalContributorValues = [
      `${contributorPrefix.replace('æ', 'ae')} A`,
      `${contributorPrefix.replace('æ', 'ae')} B`,
      `${contributorPrefix.replace('æ', 'ae')} D`,
    ];
    let user;
    let createdInstanceId;
    const browseQueries = [
      exactQuery,
      nonExactQuery,
      exactQueryNoDiacritics,
      nonExactQueryNoDiacritics,
    ];

    before('Creating user and test data', () => {
      cy.getAdminToken();
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
                      name: additionalContributorValues[2],
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
      { tags: ['criticalPath', 'spitfire', 'C466294'] },
      () => {
        BrowseContributors.waitForContributorToAppear(exactQuery);
        browseQueries.forEach((query) => {
          InventorySearchAndFilter.selectBrowseContributors();
          BrowseContributors.browse(query);
          if (query === exactQuery || query === exactQueryNoDiacritics) {
            BrowseContributors.checkSearchResultRecord(exactQuery);
            BrowseContributors.checkRowValue(3, additionalContributorValues[0]);
            BrowseContributors.checkRowValue(4, additionalContributorValues[1]);
            BrowseContributors.checkRowValue(6, additionalContributorValues[2]);
          } else {
            BrowseContributors.checkNonExactMatchPlaceholder(query);
            BrowseContributors.checkRowValue(2, additionalContributorValues[0]);
            BrowseContributors.checkRowValue(3, additionalContributorValues[1]);
            BrowseContributors.checkRowValue(4, exactQuery);
            BrowseContributors.checkRowValue(6, additionalContributorValues[2]);
          }
          BrowseContributors.resetAllInSearchPane();
          InventorySearchAndFilter.verifyKeywordsAsDefault();
        });
      },
    );
  });
});
