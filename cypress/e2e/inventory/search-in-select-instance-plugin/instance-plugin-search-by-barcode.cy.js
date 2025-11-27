import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances, {
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = `${randomFourDigitNumber()}${randomFourDigitNumber()}`;
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
    };
    const titlePrefix = `AT_C729566_FolioInstance_${randomPostfix}`;
    const barcodePrefix = `ATC729566${randomDigits}`;
    const searchOptions = [searchItemsOptions[0], searchItemsOptions[1]];
    const instanceTitles = [`${titlePrefix} A`, `${titlePrefix} B`];
    const barcodes = [`${barcodePrefix}1`, `${barcodePrefix}2(${randomDigits})`];
    const folioInstanceDataA = InventoryInstances.generateFolioInstances({
      count: 1,
      instanceTitlePrefix: instanceTitles[0],
      holdingsCount: 1,
      itemsCount: 1,
      itemsProperties: { barcode: barcodes[0] },
    });
    const folioInstanceDataB = InventoryInstances.generateFolioInstances({
      count: 1,
      instanceTitlePrefix: instanceTitles[1],
      holdingsCount: 1,
      itemsCount: 1,
      itemsProperties: { barcode: barcodes[1] },
    });
    const createdInstanceIds = [];
    let location;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C729566');

      cy.then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOngoingOrder({
            vendorId: testData.organization.id,
          });
          Orders.createOrderViaApi(testData.order).then((order) => {
            testData.order = order;
          });
        });
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          location = res;
        });
      }).then(() => {
        cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiOrdersCreate.gui])
          .then((userProperties) => {
            testData.userProperties = userProperties;

            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: folioInstanceDataA,
              location,
            }).then(() => {
              createdInstanceIds.push(folioInstanceDataA[0].instanceId);
            });

            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: folioInstanceDataB,
              location,
            }).then(() => {
              createdInstanceIds.push(folioInstanceDataB[0].instanceId);
            });
          })
          .then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.ordersPath,
              waiter: Orders.waitLoading,
            });
            Orders.selectOrderByPONumber(testData.order.poNumber);
            OrderDetails.selectAddPOLine();
            OrderLineEditForm.clickTitleLookUpButton();
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
          });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      createdInstanceIds.forEach((id) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
      });
      Users.deleteViaApi(testData.userProperties.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
    });

    it(
      'C729566 Select Instance plugin | Search for Instance by item\'s barcode field using "Keyword" and "Barcode" search options (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C729566'] },
      () => {
        searchOptions.forEach((searchOption) => {
          SelectInstanceModal.chooseSearchOption(searchOption);
          SelectInstanceModal.checkSearchOptionSelected(searchOption);
          barcodes.forEach((barcode, index) => {
            SelectInstanceModal.searchByName(barcode);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[index]);
            InventorySearchAndFilter.checkRowsCount(1);
          });
        });
      },
    );
  });
});
