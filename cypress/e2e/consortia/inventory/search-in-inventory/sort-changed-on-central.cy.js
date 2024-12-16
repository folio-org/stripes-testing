import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import { INVENTORY_DEFAULT_SORT_OPTIONS } from '../../../../support/constants';
import { randomizeArray } from '../../../../support/utils/arrays';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Consortia', () => {
      const titlePrefix = `C543872Auto ${getRandomPostfix()}`;
      const contributorPrefix = `C543872Contrib ${getRandomPostfix()}`;
      const testData = {};
      const instancesData = [];
      const createdInstanceIds = [];
      const contributorIndexes = randomizeArray(Array.from(Array(10).keys()));

      contributorIndexes.forEach((contributorIndex, index) => {
        instancesData.push({
          title: `${titlePrefix} ${index}`,
          contributors: [
            {
              name: `${contributorPrefix} ${contributorIndexes[contributorIndex]}`,
            },
          ],
        });
      });

      before('Set display settings', () => {
        cy.resetTenant();
        cy.getAdminToken();
        // admin does not have required permission by default - a new user with this permission created
        cy.createTempUser([Permissions.inventoryViewEditGeneralSettings.gui]).then(
          (userProperties) => {
            testData.settingsUserProperties = userProperties;
            cy.assignAffiliationToUser(
              Affiliations.College,
              testData.settingsUserProperties.userId,
            );
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.settingsUserProperties.userId, [
              Permissions.inventoryViewEditGeneralSettings.gui,
            ]);
            cy.resetTenant();
            cy.getToken(
              testData.settingsUserProperties.username,
              testData.settingsUserProperties.password,
              false,
            );
            cy.setupInventoryDefaultSortViaAPI(
              INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS.toLowerCase(),
            );
            cy.setTenant(Affiliations.College);
            cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());
          },
        );
      });

      before('Create data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        // delete existing related instances
        InventoryInstances.getInstancesViaApi({
          title: `${titlePrefix.split(' ')[0]}*`,
        }).then((instances) => {
          if (instances) {
            instances.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });
        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypes) => {
            BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
              cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
                (userProperties) => {
                  testData.userProperties = userProperties;
                  instancesData.forEach((instance) => {
                    instance.instanceTypeId = instanceTypes[0].id;
                    instance.contributors[0].contributorNameTypeId = contributorNameTypes[0].id;
                    InventoryInstances.createFolioInstanceViaApi({
                      instance,
                    }).then((instanceData) => {
                      createdInstanceIds.push(instanceData.instanceId);
                    });
                  });
                  cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
                  cy.setTenant(Affiliations.College);
                  cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
                    Permissions.uiInventoryViewInstances.gui,
                  ]);
                },
              );
            });
          })
          .then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            // Workaround: Force to trigger authn/refresh request
            cy.reload();
            InventoryInstances.waitContentLoading();
          });
      });

      after('Reset settings, delete data, users', () => {
        cy.resetTenant();
        cy.getToken(
          testData.settingsUserProperties.username,
          testData.settingsUserProperties.password,
          false,
        );
        cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());
        cy.getAdminToken();
        createdInstanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
        Users.deleteViaApi(testData.settingsUserProperties.userId);
      });

      it(
        'C543872 Default sort changed on Central tenant does not impact Member tenant search result list (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C543872'] },
        () => {
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventoryInstances.searchByTitle(titlePrefix);
          InventoryInstances.checkResultListSortedByColumn(2);
          InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);
          InventoryInstances.clickActionsButton();
          InventoryInstances.verifyActionsSortedBy(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);
          InventoryInstances.actionsSortBy(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
          InventoryInstances.checkResultListSortedByColumn(1);
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.verifyResultPaneEmpty();
          InventorySearchAndFilter.verifySearchFieldIsEmpty();
          InventoryInstances.searchByTitle(titlePrefix);
          InventoryInstances.checkResultListSortedByColumn(2);
          InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);
          InventoryInstances.clickActionsButton();
          InventoryInstances.verifyActionsSortedBy(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(titlePrefix);
          InventoryInstances.checkResultListSortedByColumn(1);
          InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
          InventoryInstances.clickActionsButton();
          InventoryInstances.verifyActionsSortedBy(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.verifyResultPaneEmpty();
          InventorySearchAndFilter.verifySearchFieldIsEmpty();
          InventoryInstances.searchByTitle(titlePrefix);
          InventoryInstances.checkResultListSortedByColumn(1);
          InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
          InventoryInstances.clickActionsButton();
          InventoryInstances.verifyActionsSortedBy(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
        },
      );
    });
  });
});
