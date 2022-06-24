import TestTypes from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import Orders from '../../support/fragments/orders/orders';
import Helper from '../../support/fragments/finance/financeHelper';
import PoNumber from '../../support/fragments/settings/orders/poNumber';
import TopMenu from '../../support/fragments/topMenu';
import Receiving from '../../support/fragments/receiving/receiving';

describe('ui-users:', () => {
  const instanceTitle = `autotestTitle ${Helper.getRandomBarcode()}`;
  const itemQuantity = '1';
  let vendorId;
  let locationId;
  let materialTypeId;
  const firstOrderNumber = 'auto99999test';
  const secondOrderNumber = 'auto100000test';
  let user = {};
  const orderNumbers = [firstOrderNumber, secondOrderNumber];

  beforeEach(() => {
    cy.getAdminToken()
      .then(() => {
        cy.getOrganizationApi({ query: 'name="GOBI Library Solutions"' })
          .then(organization => { vendorId = organization.id; });
        cy.getLocations({ limit:1 })
          .then(location => { locationId = location.id; });
        cy.getMaterialTypes({ query: 'name="book"' })
          .then(materialType => { materialTypeId = materialType.id; });
      })
      .then(() => {
        PoNumber.getViaApi({ query: 'configName="orderNumber"' })
          .then((res) => {
            PoNumber.editViaApi(res[0].id);
          });
        Orders.createOrderWithOrderLineViaApi(
          NewOrder.getDefaultOrder(vendorId, firstOrderNumber),
          BasicOrderLine.getDefaultOrderLine(itemQuantity, instanceTitle, locationId, materialTypeId)
        );
        Orders.createOrderWithOrderLineViaApi(
          NewOrder.getDefaultOrder(vendorId, secondOrderNumber),
          BasicOrderLine.getDefaultOrderLine(itemQuantity, instanceTitle, locationId, materialTypeId)
        );
      });

    cy.createTempUser([
      permissions.createOrdersAndOrderLines.gui,
      permissions.editOrdersAndOrderLines.gui,
      permissions.viewOrdersAndOrderLines.gui,
      permissions.uiInventoryViewCreateEditHoldings.gui,
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.uiInventoryViewCreateEditItems,
      permissions.settingsDataImportEnabled.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.uiReceivingViewEditCreate.gui
    ])
      .then(userProperties => {
        user = userProperties;
      })
      .then(() => {
        cy.login(user.username, user.password);
        orderNumbers.forEach(number => {
          const caption = `autotest_caption_${getRandomPostfix()}`;
          const barcode = Helper.getRandomBarcode();

          cy.visit(TopMenu.ordersPath);
          Orders.searchByParameter('PO number', number);
          Helper.selectFromResultsList();
          Orders.openOrder();
          Orders.receiveOrderViaActions();
          Receiving.receivePiece(0, caption, barcode);
        });
      });
  });

  it('C350590 Match on POL and update related Instance, Holdings, Item', { tags: [TestTypes.smoke] }, () => {


  });
});
