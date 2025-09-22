import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  item: {
    instanceName: `C625 Inventory Instance ${getRandomPostfix()}`,
    itemBarcode: randomFourDigitNumber(),
  },
};

describe('Inventory', () => {
  describe('Holdings', () => {
    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.createInstanceViaApi(
        testData.item.instanceName,
        testData.item.itemBarcode,
      );

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiCreateEditDeleteURL.gui]).then(
        (createdUserProperties) => {
          testData.user = createdUserProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.item.itemBarcode);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C625 Electronic Access --> Relationship --> (Validate matching settings) (folijet)',
      { tags: ['extendedPath', 'folijet', 'C625'] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(testData.item.instanceName);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.clickAddElectronicAccessButton();
        HoldingsRecordEdit.getRelationshipsFromHoldings().then((relationshipNames) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          HoldingsRecordEdit.closeCancelEditingModal();
          SettingsInventory.goToSettingsInventory();
          SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.URL_RELATIONSHIP);
          UrlRelationship.verifyListOfUrlRelationshipInHoldings(relationshipNames);
        });
      },
    );
  });
});
