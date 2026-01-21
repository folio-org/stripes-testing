import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import Budgets from '../../../support/fragments/finance/budgets/budgets';

describe('Finance', () => {
  describe('Funds', () => {
    const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const defaultLedger = { ...Ledgers.defaultUiLedger };
    const defaultFund = { ...Funds.defaultUiFund };
    const firstOrder = {
      ...NewOrder.defaultOngoingTimeOrder,
      orderType: 'Ongoing',
      ongoing: { isSubscription: false, manualRenewal: false },
      approved: true,
      reEncumber: true,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const item = {
      instanceName: `AT_C374188_FolioInstance_${getRandomPostfix()}`,
      itemBarcode: getRandomPostfix(),
    };
    const defaultBudget = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
    };
    const errorMessage = `One or more fund distributions on this order can not be encumbered, because there is not enough money in [${defaultFund.code}].`;
    defaultFiscalYear.code = defaultFiscalYear.code.slice(0, -1) + '1';
    let user;
    let location;

    before(() => {
      cy.getAdminToken();
      FiscalYears.createViaApi(defaultFiscalYear).then((defaultFiscalYearResponse) => {
        defaultFiscalYear.id = defaultFiscalYearResponse.id;
        defaultBudget.fiscalYearId = defaultFiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;
          defaultFund.ledgerId = defaultLedger.id;

          Funds.createViaApi(defaultFund).then((fundResponse) => {
            defaultFund.id = fundResponse.fund.id;
            defaultBudget.fundId = fundResponse.fund.id;
            Budgets.createViaApi(defaultBudget);
          });
        });
      });
      cy.getLocations({ limit: 1 }).then((res) => {
        location = res;
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
      Users.deleteViaApi(user.userId);
    });

    it(
      'C374188 Available balance can NOT be made a negative number by PO when ledger "Enforce all budget encumbrance limits" option is active (Thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C374188'] },
      () => {
        Orders.createApprovedOrderForRollover(firstOrder, true).then((firstOrderResponse) => {
          firstOrder.id = firstOrderResponse.id;
          OrderLines.addPOLine();
          OrderLines.selectRandomInstanceInTitleLookUP(item.instanceName, 0);
          OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
            defaultFund,
            '100',
            '2',
            '200',
            location.name,
          );
          OrderLines.backToEditingOrder();
          Orders.openOrder();
          Orders.checkOneOfCalloutsContainsErrorMessage(errorMessage);
        });
      },
    );
  });
});
