import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ItemView from '../../support/fragments/inventory/inventoryItem/itemView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InteractorsTools from '../../support/utils/interactorsTools';

const successCalloutMessage = '1 item has been successfully moved.';
let userId;
const item = {
    instanceName: `Inventory-test-${Number(new Date())}`,
    ITEM_BARCODE: `123${getRandomPostfix()}`,
};

const secondItem = {
    instanceName: `Inventory-test-${getRandomPostfix()}`,
    ITEM_BARCODE: `123${getRandomPostfix()}`,
};

describe('inventory', () => {
    before('create test data', () => {
        cy.createTempUser([
            permissions.inventoryAll.gui,
            permissions.uiInventoryMoveItems.gui,
            permissions.uiInventoryHoldingsMove.gui,
            permissions.uiInventorySingleRecordImport.gui,
        ])
            .then(userProperties => {
                userId = userProperties.userId;
                cy.login(userProperties.username, userProperties.password);
                cy.visit(TopMenu.inventoryPath);
                cy.getAdminToken()
                    .then(() => {
                        ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' });
                        cy.getUsers({
                            limit: 1,
                            query: `"personal.lastName"="${userProperties.username}" and "active"="true"`
                        });
                    })
                    .then(() => {
                        InventoryInstances.createInstanceViaApi(item.instanceName, item.ITEM_BARCODE);
                        InventoryInstances.createInstanceViaApi(secondItem.instanceName, secondItem.ITEM_BARCODE);
                    });
            });
    })

    // after('delete test data', () => {
    //     InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.ITEM_BARCODE);
    //     InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(secondItem.ITEM_BARCODE);
    //     Users.deleteViaApi(userId);
    // })

    it('C15187 Move some items with in a holdings record to another holdings associated with another instance', { tags: [TestTypes.criticalPath, devTeams.firebird] }, () => {
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.ITEM_BARCODE)
        InventorySearchAndFilter.selectSearchResultItem();
        ItemView.closeDetailView();
        InventoryInstance.moveHoldingsToAnotherInstanceByItemTitle(secondItem.instanceName);

        InventoryInstance.moveItemsToAnotherInstance(secondItem.instanceName);
        InventoryInstance.confirmMove();
        InteractorsTools.checkCalloutMessage(successCalloutMessage);

    });
})