import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C9300_FolioInstance_${randomPostfix}`;
      const searchTerm = `AT_C9300_Contributor_${randomPostfix}`;
      const searchOption = searchInstancesOptions[1]; // Contributor
      const suppressDiscoveryAccordion = 'Suppress from discovery';
      const originallySuppressedInstanceIndexes = [2, 5];
      const suppressedInstanceIndexes = [1, 6];
      const notSuppressedInstanceIndexes = [3, 4, 7];
      const instanceIds = [];
      let user;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C9300_FolioInstance');
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiInventoryViewCreateEditInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
              for (let i = 1; i <= 7; i++) {
                const instance = {
                  title: `${instanceTitlePrefix}_${i}`,
                  contributors: [
                    {
                      name: searchTerm,
                      contributorNameTypeId: contributorNameTypes[0].id,
                    },
                  ],
                  instanceTypeId: instanceTypes[0].id,
                };
                if (originallySuppressedInstanceIndexes.includes(i)) {
                  instance.discoverySuppress = true;
                }
                InventoryInstances.createFolioInstanceViaApi({
                  instance,
                }).then((instanceData) => {
                  instanceIds.push(instanceData.instanceId);
                });
              }
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        instanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C9300 Filter "Instance" records by "Suppress from discovery" filter in the "Instance" segment (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C9300'] },
        () => {
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);

          suppressedInstanceIndexes.forEach((index) => {
            InventorySearchAndFilter.searchByParameter(searchOption, searchTerm);
            InventorySearchAndFilter.verifyResultListExists();
            for (let i = 1; i <= 7; i++) {
              InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${i}`);
            }
            InventoryInstances.selectInstanceById(instanceIds[index - 1]);
            InventoryInstance.waitLoading();
            InventoryInstance.editInstance();
            InstanceRecordEdit.waitLoading();
            InstanceRecordEdit.clickDiscoverySuppressCheckbox();
            InstanceRecordEdit.verifyDiscoverySuppressCheckbox(true);
            InstanceRecordEdit.saveAndClose();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });

          InventorySearchAndFilter.searchByParameter(searchOption, searchTerm);
          InventorySearchAndFilter.verifyResultListExists();
          for (let i = 1; i <= 7; i++) {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${i}`);
          }

          InventorySearchAndFilter.expandAccordion(suppressDiscoveryAccordion);
          InventorySearchAndFilter.verifyCheckboxInAccordion(suppressDiscoveryAccordion, 'No');
          InventorySearchAndFilter.verifyCheckboxInAccordion(suppressDiscoveryAccordion, 'Yes');

          InventorySearchAndFilter.selectOptionInExpandedFilter(suppressDiscoveryAccordion, 'Yes');
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(
            originallySuppressedInstanceIndexes.length + suppressedInstanceIndexes.length,
          );
          [...originallySuppressedInstanceIndexes, ...suppressedInstanceIndexes].forEach(
            (index) => {
              InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
            },
          );

          InventorySearchAndFilter.selectOptionInExpandedFilter(
            suppressDiscoveryAccordion,
            'Yes',
            false,
          );
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(7);
          for (let i = 1; i <= 7; i++) {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${i}`);
          }

          InventorySearchAndFilter.selectOptionInExpandedFilter(suppressDiscoveryAccordion, 'No');
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(notSuppressedInstanceIndexes.length);
          notSuppressedInstanceIndexes.forEach((index) => {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
          });
        },
      );
    });
  });
});
