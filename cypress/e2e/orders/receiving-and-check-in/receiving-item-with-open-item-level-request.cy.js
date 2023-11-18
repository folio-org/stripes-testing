import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import testType from '../../../support/dictionary/testTypes';
import NewOrder from '../../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import Orders from '../../../support/fragments/orders/orders';
import Receiving from '../../../support/fragments/receiving/receiving';
import TopMenu from '../../../support/fragments/topMenu';
import Helper from '../../../support/fragments/finance/financeHelper';
import OrdersHelper from '../../../support/fragments/orders/ordersHelper';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Users from '../../../support/fragments/users/users';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Orders: Receiving and Check-in', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const orderLineTitle = BasicOrderLine.defaultOrderLine.titleOrPackage;
  const firstPiece = {
    copyNumber: Helper.getRandomBarcode(),
    enumeration: Helper.getRandomBarcode(),
    chronology: Helper.getRandomBarcode(),
    caption: `autotestCaption-${Helper.getRandomBarcode()}`,
  };
  const secondPiece = {
    copyNumber: Helper.getRandomBarcode(),
    enumeration: Helper.getRandomBarcode(),
    chronology: Helper.getRandomBarcode(),
    caption: `autotestCaption-${Helper.getRandomBarcode()}`,
  };
  const thirdPiece = {
    copyNumber: Helper.getRandomBarcode(),
    enumeration: Helper.getRandomBarcode(),
    chronology: Helper.getRandomBarcode(),
    caption: `autotestCaption-${Helper.getRandomBarcode()}`,
  };
  const fourthPiece = {
    copyNumber: Helper.getRandomBarcode(),
    enumeration: Helper.getRandomBarcode(),
    chronology: Helper.getRandomBarcode(),
    caption: `autotestCaption-${Helper.getRandomBarcode()}`,
  };
  let orderNumber;
  let user;

  before(() => {
    cy.createTempUser([
      permissions.uiInventoryViewInstances.gui,
      permissions.uiInventoryViewCreateEditItems.gui,
      permissions.uiOrdersView.gui,
      permissions.uiReceivingViewEditCreate.gui,
      permissions.uiRequestsCreate.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  it(
    'C402765 Receiving an item with an open item level request (thunderjet) (TaaS)',
    { tags: [testType.smoke, devTeams.thunderjet] },
    () => {},
  );
});
