import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const testData = {
      titlePrefix: `AT_C423628_FolioInstance_${getRandomPostfix()}`,
    };

    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      paymentMethod: 'EFT',
    };

    const order = {
      ...NewOrder.defaultOneTimeOrder,
      manualPo: false,
    };

    const createdRecordIds = [];
    let orderNumber;
    let orderId;
    let user;

    before('Create user and open Select instance plugin', () => {
      cy.getAdminToken().then(() => {
        for (let i = 0; i < 2; i++) {
          InventoryInstance.createInstanceViaApi({
            instanceTitle: `${testData.titlePrefix}_${i}`,
          }).then(({ instanceData }) => {
            createdRecordIds.push(instanceData.instanceId);
          });
        }

        Organizations.createOrganizationViaApi(organization).then((response) => {
          organization.id = response;
          order.vendor = response;

          cy.createOrderApi(order).then((orderResponse) => {
            orderNumber = orderResponse.body.poNumber;
            orderId = orderResponse.body.id;

            cy.createTempUser([
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiOrdersCreate.gui,
            ]).then((createdUserProperties) => {
              user = createdUserProperties;

              cy.login(user.username, user.password, {
                path: TopMenu.ordersPath,
                waiter: Orders.waitLoading,
              });

              Orders.searchByParameter('PO number', orderNumber);
              Orders.selectFromResultsList(orderNumber);
              OrderLines.addPOLine();
              OrderLines.clickTitleLookUp();
              InventorySearchAndFilter.instanceTabIsDefault();
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(orderId);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
      createdRecordIds.forEach((createdRecordId) => {
        InventoryInstance.deleteInstanceViaApi(createdRecordId);
      });
    });

    it(
      'C423628 Instance plug-in search | Check the "x" icon in the Inventory app search box (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423628'] },
      () => {
        function searchClearAndCheck() {
          SelectInstanceModal.fillInSearchQuery(testData.titlePrefix);
          SelectInstanceModal.checkSearchInputFieldValue(testData.titlePrefix);
          SelectInstanceModal.focusOnSearchField();
          SelectInstanceModal.checkClearIconShownInSearchField();
          SelectInstanceModal.checkSearchButtonEnabled();

          SelectInstanceModal.clearSearchInputField();
          SelectInstanceModal.checkSearchInputFieldInFocus(true);
          SelectInstanceModal.checkClearIconShownInSearchField(false);

          SelectInstanceModal.fillInSearchQuery(testData.titlePrefix);
          SelectInstanceModal.checkSearchInputFieldValue(testData.titlePrefix);
          SelectInstanceModal.focusOnSearchField();
          SelectInstanceModal.checkClearIconShownInSearchField();
          SelectInstanceModal.checkSearchButtonEnabled();

          SelectInstanceModal.clickSearchButton();
          SelectInstanceModal.checkResultsListEmpty(false);
          SelectInstanceModal.checkSearchInputFieldValue(testData.titlePrefix);
          SelectInstanceModal.checkSearchInputFieldInFocus(false);
          SelectInstanceModal.checkClearIconShownInSearchField(false);

          SelectInstanceModal.focusOnSearchField();
          SelectInstanceModal.checkClearIconShownInSearchField();

          SelectInstanceModal.clearSearchInputField();
          SelectInstanceModal.checkSearchInputFieldInFocus(true);
          SelectInstanceModal.checkResultsListEmpty();
          SelectInstanceModal.checkClearIconShownInSearchField(false);
        }

        searchClearAndCheck();

        SelectInstanceModal.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        searchClearAndCheck();

        SelectInstanceModal.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        searchClearAndCheck();
      },
    );
  });
});
