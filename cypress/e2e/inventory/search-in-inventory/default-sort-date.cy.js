import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { INVENTORY_DEFAULT_SORT_OPTIONS, APPLICATION_NAMES } from '../../../support/constants';
import { randomizeArray } from '../../../support/utils/arrays';
import DisplaySettings from '../../../support/fragments/settings/inventory/instance-holdings-item/displaySettings';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const titlePrefix = `AT_C553006_Instance_${randomPostfix}`;
    const testData = {};
    const instancesData = [];
    const createdInstanceIds = [];
    const dateIndexes = randomizeArray(Array.from(Array(10).keys()));

    dateIndexes.forEach((dateIndex, index) => {
      instancesData.push({
        title: `${titlePrefix} ${index}`,
        date1: `19${String(80 + dateIndex).padStart(2, '0')}`,
      });
    });

    before('Set display settings, create data', () => {
      cy.getAdminToken();
      InventoryInstances.getInstancesViaApi({
        limit: 100,
        query: 'title="C553006"',
      }).then((instances) => {
        if (instances) {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        }
      });

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        cy.getInstanceDateTypesViaAPI().then(({ instanceDateTypes }) => {
          const instanceDateTypeId = instanceDateTypes[0].id;
          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.inventoryViewEditGeneralSettings.gui,
          ]).then((userProperties) => {
            testData.userProperties = userProperties;
            instancesData.forEach((instance) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instanceTypes[0].id,
                  title: instance.title,
                  dates: {
                    dateTypeId: instanceDateTypeId,
                    date1: instance.date1,
                    date2: '2222',
                  },
                },
              }).then((instanceData) => {
                createdInstanceIds.push(instanceData.instanceId);
              });
            });

            cy.login(testData.userProperties.username, testData.userProperties.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.DISPLAY_SETTINGS);
            DisplaySettings.waitloading();
            DisplaySettings.changeDefaultSortOption(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
            DisplaySettings.checkAfterSaveSuccess();
            DisplaySettings.verifySelectedDefaultSortOption(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.waitContentLoading();
          });
        });
      });
    });

    after('Reset settings, delete data, user', () => {
      cy.getAdminToken();
      cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C553006 Default sort is applied to search result list in "Inventory" app according to selected option in settings ("Date" case) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C553006'] },
      () => {
        InventoryInstances.searchByTitle(titlePrefix);
        InventorySearchAndFilter.verifySearchResult(instancesData[0].title);
        InventoryInstances.checkResultListSortedByColumn(4);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
        InventoryInstances.clickActionsButton();
        InventoryInstances.verifyActionsSortedBy(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
        InventoryInstances.actionsSortBy(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
        InventoryInstances.checkResultListSortedByColumn(0);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventorySearchAndFilter.verifySearchFieldIsEmpty();
        InventorySearchAndFilter.verifyDefaultSearchInstanceOptionSelected();
        InventoryInstances.searchByTitle(titlePrefix);
        InventorySearchAndFilter.verifySearchResult(instancesData[0].title);
        InventoryInstances.checkResultListSortedByColumn(4);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
        InventoryInstances.clickActionsButton();
        InventoryInstances.verifyActionsSortedBy(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
      },
    );
  });
});
