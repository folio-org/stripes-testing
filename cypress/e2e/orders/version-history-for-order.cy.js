import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import Orders from '../../support/fragments/orders/orders';
import TestTypes from '../../support/dictionary/testTypes';
import NewOrder from '../../support/fragments/orders/newOrder';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../support/utils/stringTools';
import OrderLines from '../../support/fragments/orders/orderLines';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import DateTools from '../../support/utils/dateTools';
import Users from '../../support/fragments/users/users';

describe('Orders: orders', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: false,
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
  let user;
  let location;
  let servicePointId;
  let orderNumber;
  let firstDate;
  let firstCard;

  before(() => {
    cy.getAdminToken();

    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;
      });
    });
    Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
      organization.id = organizationsResponse;
      order.vendor = organizationsResponse;
    });
    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
      // Need to wait for the next card in the order history to be created with a difference of a minute.
      cy.wait(40000);
      cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList();
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
      OrderLines.fillInPOLineInfoForExportWithLocation('Purchase', location.institutionId);
      OrderLines.backToEditingOrder();
      Orders.editOrder();
      Orders.approveOrder();
    });
    cy.then(() => {
      firstDate = DateTools.getCurrentUTCTime();
      firstCard = `${firstDate}\nView this version\nSource: ADMINISTRATOR, Diku_admin\nCurrent version\nChanged\nApproved\nnextPolNumber`;
    });
    // Need to wait for the next card in the order history to be created with a difference of a minute.
    cy.wait(70000);
    cy.createTempUser([permissions.uiOrdersEdit.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C369046: "Version history" viewing for Order (thunderjet)',
    { tags: [TestTypes.criticalPath, devTeams.thunderjet] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.openVersionHistory();
      Orders.checkVersionHistoryCard(firstDate, firstCard);
      Orders.closeVersionHistory();
      Orders.editOrderToManual(orderNumber);
      cy.then(() => {
        const secondDate = DateTools.getCurrentUTCTime();
        const secondCard = `${secondDate}\nView this version\nSource: ${user.username}, ${user.firstName}\nCurrent version\nChanged\nManual`;
        Orders.openVersionHistory();
        Orders.checkVersionHistoryCard(secondDate, secondCard);
        Orders.closeVersionHistory();
        // Need to wait for the next card in the order history to be created with a difference of a minute.
        cy.wait(60000);
        cy.then(() => {
          Orders.openOrder();
          const thirdDate = DateTools.getCurrentUTCTime();
          const thirdCard = `${thirdDate}\nView this version\nSource: ${user.username}, ${user.firstName}\nCurrent version\nChanged\nApproval date\nApproved by\nDate opened\nWorkflow status`;
          Orders.openVersionHistory();
          Orders.checkVersionHistoryCard(thirdDate, thirdCard);
          Orders.closeVersionHistory();
          // Need to wait for the next card in the order history to be created with a difference of a minute.
          cy.wait(60000);
          Orders.closeOrder('Cancelled');
          cy.then(() => {
            const forthDate = DateTools.getCurrentUTCTime();
            const forthCard = `${forthDate}\nView this version\nSource: ${user.username}, ${user.firstName}\nCurrent version\nChanged\nNotes on closure\nReason for closure\nWorkflow status`;
            Orders.openVersionHistory();
            Orders.checkVersionHistoryCard(forthDate, forthCard);
            Orders.selectVersionHistoryCard(firstDate);
            Orders.selectVersionHistoryCard(secondDate);
            Orders.selectVersionHistoryCard(thirdDate);
            Orders.selectVersionHistoryCard(forthDate);
          });
        });
      });
    },
  );
});
