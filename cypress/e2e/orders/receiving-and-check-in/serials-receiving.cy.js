import { ITEM_STATUS_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      approved: true,
    };
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      accounts: [
        {
          accountNo: getRandomPostfix(),
          accountStatus: 'Active',
          acqUnitIds: [],
          appSystemNo: '',
          description: 'Main library account',
          libraryCode: 'COB',
          libraryEdiCode: getRandomPostfix(),
          name: 'TestAccout1',
          notes: '',
          paymentMethod: 'Cash',
        },
      ],
    };
    const firstPiece = {
      copyNumber: Helper.getRandomBarcode(),
      enumeration: Helper.getRandomBarcode(),
      chronology: Helper.getRandomBarcode(),
      displaySummary: `AQA-${Helper.getRandomBarcode()}`,
    };

    let orderNumber;
    let user;
    let effectiveLocationServicePoint;
    let location;

    before(() => {
      cy.getAdminToken();

      ServicePoints.getCircDesk2ServicePointViaApi().then((servicePoint) => {
        effectiveLocationServicePoint = servicePoint;
        NewLocation.createViaApi(
          NewLocation.getDefaultLocation(effectiveLocationServicePoint.id),
        ).then((locationResponse) => {
          location = locationResponse;
          Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
            organization.id = organizationsResponse;
            order.vendor = organizationsResponse;
          });
          cy.createOrderApi(order).then((response) => {
            orderNumber = response.body.poNumber;
          });
        });
      });

      cy.createTempUser([
        permissions.uiInventoryViewInstances.gui,
        permissions.uiOrdersEdit.gui,
        permissions.uiOrdersCreate.gui,
        permissions.uiOrdersView.gui,
        permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C739 Serials receiving - "Receiving workflow" and create items in inventory from receiving area (items for receiving includes "Order closed" statuses) (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C739'] },
      () => {
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.createPOLineViaActions();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 10);
        OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
          'Purchase',
          location.name,
          '2',
        );
        OrderLines.backToEditingOrder();
        Orders.openOrder();
        OrderLines.selectPOLInOrder(0);
        OrderLines.receiveOrderLineViaActions();
        Receiving.selectLinkFromResultsList();
        Receiving.addPiece(
          firstPiece.displaySummary,
          firstPiece.copyNumber,
          firstPiece.enumeration,
          firstPiece.chronology,
        );
        Receiving.selectPiece(firstPiece.displaySummary);
        Receiving.selectConnectedInEditPiece();
        ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.ON_ORDER);
      },
    );
  });
});
