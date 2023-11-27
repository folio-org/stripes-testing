import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('Finance: Funds', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const firstLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const firstOrder = {
    ...NewOrder.defaultOngoingTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const item = {
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  };
  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  const allocatedQuantity = '100';
  let user;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      firstLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(firstLedger).then((ledgerResponse) => {
        firstLedger.id = ledgerResponse.id;
        firstFund.ledgerId = firstLedger.id;
        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(firstFund.name);
          Funds.selectFund(firstFund.name);
          Funds.addBudget(allocatedQuantity);
          Funds.closeBudgetDetails();
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
    });
    firstOrder.vendor = organization.name;
    InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);

    cy.createTempUser([
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
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
    Orders.deleteOrderViaApi(firstOrder.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    NewLocation.deleteViaApi(location.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C374188: Available balance can NOT be made a negative number by PO when ledger "Enforce all budget encumbrance limits" option is active (Thunderjet) (TaaS)',
    { tags: [testType.extendedPath, devTeams.thunderjet] },
    () => {
      Orders.createApprovedOrderForRollover(firstOrder, true).then((firstOrderResponse) => {
        firstOrder.id = firstOrderResponse.id;
        OrderLines.addPOLine();
        OrderLines.selectRandomInstanceInTitleLookUP(item.instanceName, 0);
        OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
          firstFund,
          '100',
          '2',
          '200',
          location.institutionId,
        );
        OrderLines.backToEditingOrder();
        Orders.openOrder();
        Orders.checkOrderIsNotOpened(firstFund.code);
      });
    },
  );
});
