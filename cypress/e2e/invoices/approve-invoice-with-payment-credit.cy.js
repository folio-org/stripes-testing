import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
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

describe('ui-invoices: Cancelling approved invoices', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };

  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const firstOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  let user;
  let firstOrderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
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
          ServicePoints.getViaApi().then((servicePoint) => {
            servicePointId = servicePoint[0].id;
            NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
              location = res;

              MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
                (mtypes) => {
                  cy.getAcquisitionMethodsApi({
                    query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                  }).then((params) => {
                    // Prepare 2 Open Orders for Rollover
                    Organizations.createOrganizationViaApi(organization).then(
                      (responseOrganizations) => {
                        organization.id = responseOrganizations;
                        firstOrder.vendor = organization.id;
                        const firstOrderLine = {
                          ...BasicOrderLine.defaultOrderLine,
                          cost: {
                            listUnitPrice: 20.0,
                            currency: 'USD',
                            discountType: 'percentage',
                            quantityPhysical: 1,
                            poLineEstimatedPrice: 20.0,
                          },
                          fundDistribution: [
                            { code: defaultFund.code, fundId: defaultFund.id, value: 100 },
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
                        Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                          firstOrder.id = firstOrderResponse.id;
                          firstOrderNumber = firstOrderResponse.poNumber;
                          firstOrderLine.purchaseOrderId = firstOrderResponse.id;

                          OrderLines.createOrderLineViaApi(firstOrderLine);
                          Orders.updateOrderViaApi({
                            ...firstOrderResponse,
                            workflowStatus: ORDER_STATUSES.OPEN,
                          });
                        });
                      },
                    );
                  });
                },
              );
            });
          });
        });
      });
    });

    cy.createTempUser([
      permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      }, 20_000);
    });
  });
  after(() => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C347897 Approve invoice with both payment and credit (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C347897'] },
    () => {
      Invoices.createRolloverInvoice(invoice, organization.name);
      cy.wait(2000);
      Invoices.createInvoiceLinePOLLookUWithSubTotal(firstOrderNumber, '10');
      cy.wait(2000);
      Invoices.createInvoiceLinePOLLookUWithSubTotal(firstOrderNumber, '-10');
      cy.wait(2000);
      Invoices.createInvoiceLinePOLLookUWithSubTotal(firstOrderNumber, '10');
      cy.wait(2000);
      Invoices.approveInvoice();
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.checkFinancialActivityAndOverages('$10.00', '$10.00', '$0.00', '$0.00', '$20.00');
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '($10.00)',
        `${firstOrderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      cy.visit(TopMenu.invoicesPath);
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.payInvoice();
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.checkFinancialActivityAndOverages('$10.00', '$0.00', '$20.00', '$10.00', '$20.00');
      Funds.viewTransactions();
      Funds.selectTransactionInList('Credit');
      Funds.varifyDetailsInTransactionFundTo(
        firstFiscalYear.code,
        '$10.00',
        invoice.invoiceNumber,
        'Credit',
        `${defaultFund.name} (${defaultFund.code})`,
      );
    },
  );
});
