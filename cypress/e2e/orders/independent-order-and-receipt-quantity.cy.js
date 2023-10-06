import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import testType from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import { RECEIPT_STATUS_VIEW, RECEIVING_WORKFLOW_NAMES } from '../../support/constants';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
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
  let orderNumber;
  let user;
  let effectiveLocationServicePoint;
  let location;

  before(() => {
    cy.getAdminToken();
    ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 2"' }).then((servicePoints) => {
      effectiveLocationServicePoint = servicePoints[0];
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

    cy.createTempUser([permissions.uiOrdersCreate.gui, permissions.uiOrdersEdit.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after(() => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C389465 Receiving workflow is automatically set to "Independent order and receipt quantity" if a user selects "Receipt not required" receipt status (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
      OrderLines.POLineInfoWithReceiptNotRequiredStatus(location.institutionId);
      OrderLines.checkPOLReceiptStatus(RECEIPT_STATUS_VIEW.RECEIPT_NOT_REQUIRED);
      OrderLines.checkPOLReceivingWorkflow(
        RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      );
      OrderLines.editPOLInOrder();
      OrderLines.POLineInfoEditWithPendingReceiptStatus();
      OrderLines.checkCalloutMessageInEditedPOL(orderNumber, '1');
      OrderLines.checkPOLReceiptStatus(RECEIPT_STATUS_VIEW.PENDING);
      OrderLines.checkPOLReceivingWorkflow(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      );
      OrderLines.editPOLInOrder();
      OrderLines.POLineInfoEditWithReceiptNotRequiredStatus();
      OrderLines.checkCalloutMessageInEditedPOL(orderNumber, '1');
      OrderLines.checkPOLReceiptStatus(RECEIPT_STATUS_VIEW.RECEIPT_NOT_REQUIRED);
      OrderLines.checkPOLReceivingWorkflow(
        RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      OrderLines.selectPOLInOrder(0);
      OrderLines.checkPOLReceiptStatus(RECEIPT_STATUS_VIEW.RECEIPT_NOT_REQUIRED);
      OrderLines.checkPOLReceivingWorkflow(
        RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      );
    },
  );
});
