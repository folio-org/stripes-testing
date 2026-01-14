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
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('ui-orders: Orders', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice, status: 'Reviewed' };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  const secondBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  let user;
  let orderNumber;
  let servicePointId;
  let location;
  let firstInvoice;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      secondBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          Funds.createViaApi(secondFund).then((secondFundResponse) => {
            secondFund.id = secondFundResponse.fund.id;
            secondBudget.fundId = secondFundResponse.fund.id;
            Budgets.createViaApi(secondBudget);

            ServicePoints.getViaApi().then((servicePoint) => {
              servicePointId = servicePoint[0].id;
              NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
                (res) => {
                  location = res;

                  MaterialTypes.createMaterialTypeViaApi(
                    MaterialTypes.getDefaultMaterialType(),
                  ).then((mtypes) => {
                    cy.getAcquisitionMethodsApi({
                      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                    }).then((params) => {
                      // Prepare 2 Open Orders for Rollover
                      Organizations.createOrganizationViaApi(organization).then(
                        (responseOrganizations) => {
                          organization.id = responseOrganizations;
                          defaultOrder.vendor = organization.id;
                          const firstOrderLine = {
                            ...BasicOrderLine.defaultOrderLine,
                            cost: {
                              listUnitPrice: 50.0,
                              currency: 'USD',
                              discountType: 'percentage',
                              quantityPhysical: 1,
                              poLineEstimatedPrice: 50.0,
                            },
                            fundDistribution: [
                              { code: firstFund.code, fundId: firstFund.id, value: 100 },
                            ],
                            locations: [
                              { locationId: location.id, quantity: 1, quantityPhysical: 1 },
                            ],
                            acquisitionMethod: params.body.acquisitionMethods[0].id,
                            physical: {
                              createInventory: 'Instance, Holding, Item',
                              materialType: mtypes.body.id,
                              materialSupplier: responseOrganizations,
                              volumes: [],
                            },
                          };
                          Orders.createOrderViaApi(defaultOrder).then((firstOrderResponse) => {
                            defaultOrder.id = firstOrderResponse.id;
                            orderNumber = firstOrderResponse.poNumber;
                            firstOrderLine.purchaseOrderId = firstOrderResponse.id;

                            OrderLines.createOrderLineViaApi(firstOrderLine);
                            Orders.updateOrderViaApi({
                              ...firstOrderResponse,
                              workflowStatus: ORDER_STATUSES.OPEN,
                            });
                            Invoices.createInvoiceWithInvoiceLineViaApi({
                              vendorId: organization.id,
                              fiscalYearId: defaultFiscalYear.id,
                              poLineId: firstOrderLine.id,
                              fundDistributions: firstOrderLine.fundDistribution,
                              accountingCode: organization.erpCode,
                              releaseEncumbrance: true,
                              subTotal: 50,
                            }).then((invoiceRescponse) => {
                              firstInvoice = invoiceRescponse;
                            });
                          });
                        },
                      );
                    });
                  });
                },
              );
            });
          });
        });
      });
    });
    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      permissions.uiOrdersEdit.gui,
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
    'C368486 Editing fund distribution in PO line when related Reviewed invoice exists (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C368486'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.editFundInPOL(secondFund, '70', '100');
      OrderLines.checkFundInPOL(secondFund);
      TopMenuNavigation.navigateToApp('Finance');
      FinanceHelp.searchByName(secondFund.name);
      Funds.selectFund(secondFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransactionFundTo(
        defaultFiscalYear.code,
        '($70.00)',
        invoice.invoiceNumber,
        'Encumbrance',
        `${secondFund.name} (${secondFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');
      Funds.closeTransactionDetails();
      Funds.closePaneHeader();
      Funds.closeBudgetDetails();
      TopMenuNavigation.navigateToApp('Invoices');
      Invoices.searchByNumber(firstInvoice.vendorInvoiceNo);
      Invoices.selectInvoice(firstInvoice.vendorInvoiceNo);
      Invoices.selectInvoiceLine();
      Invoices.checkFundInInvoiceLine(firstFund);
      TopMenuNavigation.navigateToApp('Finance');
      FinanceHelp.searchByName(secondFund.name);
      Funds.selectFund(secondFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransactionFundTo(
        defaultFiscalYear.code,
        '($70.00)',
        `${orderNumber}-1`,
        'Encumbrance',
        `${secondFund.name} (${secondFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');
    },
  );
});
