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
import NewAgreement from '../../support/fragments/agreements/newAgreement';
import AgreementsDetails from '../../support/fragments/agreements/agreementViewDetails';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../support/fragments/finance/funds/funds';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Invoices from '../../support/fragments/invoices/invoices';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import { ORDER_TYPES } from '../../support/constants';
import Agreements from '../../support/fragments/agreements/agreements';

describe('Orders: orders', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: ORDER_TYPES.ONGOING,
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
  const defaultAgreement = { ...NewAgreement.defaultAgreement };
  const firstFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '100';
  let user;
  let location;
  let servicePointId;
  let orderNumber;
  let firstDate;
  let secondDate;
  let firstCard;
  let secondCard;
  let thirdCard;
  let thirdDate;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
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
    Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
      organization.id = organizationsResponse;
      order.vendor = organizationsResponse;
    });
    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList();
      Orders.editOrder();
      Orders.approveOrder();
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '40',
        '1',
        '40',
        location.institutionId,
      );
      cy.then(() => {
        firstDate = DateTools.getCurrentUTCTime();
        firstCard = `${firstDate}\nView this version\nSource: ADMINISTRATOR, Diku_admin\nOriginal version`;
      });
      // Need to wait for the next card in the order history to be created with a difference of a minute.
      cy.wait(60000);
      OrderLines.editPOLInOrder();
      OrderLines.editFundInPOL(defaultFund, '70', '70');
      OrderLines.addNewNote();
      cy.then(() => {
        secondDate = DateTools.getCurrentUTCTime();
        secondCard = `${secondDate}\nView this version\nSource: ADMINISTRATOR, Diku_admin\nChanged\nEstimated price\nPhysical unit price\nValue`;
      });
      // Need to wait for the next card in the order history to be created with a difference of a minute.
      cy.wait(60000);
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      cy.then(() => {
        thirdDate = DateTools.getCurrentUTCTime();
        thirdCard = `${thirdDate}\nView this version\nSource: ADMINISTRATOR, Diku_admin\nCurrent version\nChanged\nCurrent encumbrance\nHolding\nName (code)\nPayment status\nReceipt status`;
      });
      cy.visit(TopMenu.invoicesPath);
      Invoices.createRolloverInvoice(invoice, organization.name);
      Invoices.createInvoiceLineFromPol(orderNumber);
      cy.visit(TopMenu.agreementsPath);
      Agreements.switchToLocalKBSearch();
      AgreementsDetails.selectCurrentStatusInPackages();
      AgreementsDetails.selectPackageFromList();
      AgreementsDetails.addPackageToBusket();
      AgreementsDetails.openBusket();
      AgreementsDetails.createNewAgreementInBusket();
      NewAgreement.fill(defaultAgreement);
      NewAgreement.save();
      AgreementsDetails.openAgreementLinesSection();
      AgreementsDetails.newAgreementLine(`${orderNumber}-1`);
    });
    cy.createTempUser([permissions.uiOrdersView.gui, permissions.uiNotesItemView.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
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
    'C369047: "Version history" viewing for Order line (thunderjet)',
    { tags: [TestTypes.criticalPath, devTeams.thunderjet] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.openVersionHistory();
      OrderLines.checkVersionHistoryCard(firstDate, firstCard);
      OrderLines.checkVersionHistoryCard(secondDate, secondCard);
      OrderLines.checkVersionHistoryCard(thirdDate, thirdCard);
      OrderLines.selectVersionHistoryCard(secondDate);
      OrderLines.selectVersionHistoryCard(thirdDate);
      OrderLines.selectVersionHistoryCard(firstDate);
      OrderLines.closeVersionHistory();
    },
  );
});
