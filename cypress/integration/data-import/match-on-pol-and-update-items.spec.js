import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';

describe('ui-users:', () => {
  const instanceTitle = `autotestTitle ${Helper.getRandomBarcode()}`;
  const itemQuantity = '1';
  let vendorId;
  let locationId;
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  let orderNumber;
  let user = {};

  beforeEach(() => {
    cy.getAdminToken();
    cy.getOrganizationApi({ query: 'name="GOBI Library Solutions"' })
      .then(organization => {
        vendorId = organization.id;
      });
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` })
      .then(location => { 
        locationId = location.id; });
    cy.getMaterialTypes({ query: 'name="book"' })
      .then(materialType => { orderLine.physical.materialType = materialType.id; });
      .then(() => {
            Orders.createOrderWithOrderLineViaApi(
              NewOrder.getDefaultOrder({vendor: vendorId})),
              BasicOrderLine.getDefaultOrderLine(itemQuantity, instanceTitle, effectiveLocation.id)
            )
              .then(order => {
                orderNumber = order;
              });
          });
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

