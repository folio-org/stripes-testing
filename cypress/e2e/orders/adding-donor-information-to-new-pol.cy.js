import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Budgets from '../../support/fragments/finance/budgets/budgets';

describe('Orders', () => {
  const firstFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const firstOrganization = {
    ...NewOrganization.defaultUiOrganizations,
    isDonor: true,
    isVendor: true,
  };

  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  let user;
  let orderNumber;
  let location;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(firstOrganization).then((responseFirstOrganization) => {
      firstOrganization.id = responseFirstOrganization;
      FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
        firstFiscalYear.id = firstFiscalYearResponse.id;
        firstBudget.fiscalYearId = firstFiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = firstFiscalYear.id;
        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;
          defaultFund.ledgerId = defaultLedger.id;

          Funds.createViaApi(defaultFund).then((fundResponse) => {
            defaultFund.id = fundResponse.fund.id;
            firstBudget.fundId = fundResponse.fund.id;
            Budgets.createViaApi(firstBudget);
          });
        });
      });

      cy.getLocations({ limit: 1 }).then((res) => {
        location = res;
      });

      defaultOrder.vendor = firstOrganization.id;
      Orders.createOrderViaApi(defaultOrder).then((firstOrderResponse) => {
        defaultOrder.id = firstOrderResponse.id;
        orderNumber = firstOrderResponse.poNumber;
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
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C422251 Adding donor information to a new PO line (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C422251'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 25);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '40',
        '1',
        '40',
        location.name,
      );
      OrderLines.editPOLInOrder();
      OrderLines.openDonorInformationSection();
      OrderLines.checkAddDonorButtomisActive();
    },
  );
});
