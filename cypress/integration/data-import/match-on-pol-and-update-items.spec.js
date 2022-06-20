import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import Orders from '../../support/fragments/orders/orders';
import Helper from '../../support/fragments/finance/financeHelper';
import PoNumberEdit from '../../support/fragments/settings/orders/poNumberEdit';

describe('ui-users:', () => {
  const instanceTitle = `autotestTitle ${Helper.getRandomBarcode()}`;
  const itemQuantity = '1';
  let vendorId;
  let locationId;
  let materialTypeId;
  const firstOrderNumber = 'autotestOrder99999';
  let user = {};

  beforeEach(() => {
    cy.getAdminToken()
      .then(() => {
        PoNumberEdit.viaApi();
        cy.getOrganizationApi({ query: 'name="GOBI Library Solutions"' })
          .then(organization => { vendorId = organization.id; });
        cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` })
          .then(location => { locationId = location.id; });
        cy.getMaterialTypes({ query: 'name="book"' })
          .then(materialType => { materialTypeId = materialType.id; });
      })
      .then(() => {
        Orders.createOrderWithOrderLineViaApi(
          NewOrder.getDefaultOrder(vendorId, firstOrderNumber),
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
      permissions.moduleDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;
      })
      .then(() => {
        cy.login(user.username, user.password);
      });
  });

  it('C350590 Match on POL and update related Instance, Holdings, Item', { tags: [TestTypes.smoke] }, () => {

  });
});
