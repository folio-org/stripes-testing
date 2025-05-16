import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import { APPLICATION_NAMES, RECEIVING_WORKFLOW_NAMES } from '../../support/constants';

describe('Orders', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const firstOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-time',
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '1000';
  const barcode = FinanceHelp.getRandomBarcode();
  const enumeration = 'autotestCaption';
  const copyNumber = FinanceHelp.getRandomBarcode();
  const chronology = FinanceHelp.getRandomBarcode();
  const displaySummary = `AQA_${FinanceHelp.getRandomBarcode()}`;
  let user;
  let orderNumber;
  let servicePointId;
  let location;
  let orderLineTitle;

  before(() => {
    cy.clearLocalStorage();
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(firstFund.name);
          Funds.selectFund(firstFund.name);
          Funds.addBudget(allocatedQuantity);
        });
      });
    });
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;
      });
    });

    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
      invoice.accountingCode = organization.erpCode;
      firstOrder.orderType = 'One-time';
    });
    firstOrder.vendor = organization.name;
    TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.ORDERS);
    Orders.selectOrdersPane();
    Orders.createApprovedOrderForRollover(firstOrder, true).then((firstOrderResponse) => {
      firstOrder.id = firstOrderResponse.id;
      orderNumber = firstOrderResponse.poNumber;
      Orders.checkCreatedOrder(firstOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        firstFund,
        '100',
        '1',
        '100',
        location.name,
        RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      OrderLines.getOrderLineViaApi({
        query: `poLineNumber=="*${orderNumber}*"`,
      }).then((orderLinesResponse) => {
        orderLineTitle = orderLinesResponse[0].titleOrPackage;
      });
      OrderLines.selectPOLInOrder();
      OrderLines.receiveOrderLinesViaActions();
      Receiving.selectPOLInReceive(orderLineTitle);
      Receiving.addPiece(displaySummary, copyNumber, enumeration, chronology);
      Receiving.selectPiece(displaySummary);
      Receiving.openDropDownInEditPieceModal();
      Receiving.quickReceivePiece(enumeration);
      Receiving.checkReceivedPiece(0, enumeration, barcode);
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVOICES);
      Invoices.createRolloverInvoice(invoice, organization.name);
      Invoices.createInvoiceLineFromPol(orderNumber);
      // Need to wait, while data will be loaded
      cy.wait(4000);
      Invoices.approveInvoice();
    });
    cy.createTempUser([
      permissions.uiInventoryViewInstances.gui,
      permissions.uiOrdersView.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiReceivingViewEditDelete.gui,
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
    'C375110 Encumbered amount is not changed after deleting received piece when related approved invoice exists (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.receiveOrderLinesViaActions();
      Receiving.selectPOLInReceive(orderLineTitle);
      Receiving.selectPieceInReceived(chronology);
      Receiving.openDropDownInEditPieceModal();
      Receiving.deleteItemPiece();
      ReceivingDetails.openOrderLineDetails();
      OrderLines.openPageCurrentEncumbrance('$0.00');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${firstFund.name} (${firstFund.code})`,
      );
      Funds.checkInitialEncumbranceDetails('$100.00');
      Funds.checkStatusInTransactionDetails('Released');
    },
  );
});
