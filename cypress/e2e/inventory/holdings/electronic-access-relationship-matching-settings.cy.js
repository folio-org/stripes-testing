import { Permissions } from '../../../support/dictionary';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
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
      { tags: ['extendedPath', 'folijet'] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(testData.item.instanceName);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.clickAddElectronicAccessButton();
        HoldingsRecordEdit.getRelationshipsFromHoldings().then((relationshipNames) => {
          cy.visit(SettingsMenu.urlRelationshipPath);
          UrlRelationship.verifyListOfUrlRelationshipInHoldings(relationshipNames);
        });
      },
    );
  });
});
