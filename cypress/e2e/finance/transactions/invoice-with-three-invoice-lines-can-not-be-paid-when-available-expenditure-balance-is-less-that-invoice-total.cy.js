import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../../support/constants';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import Invoices from '../../../support/fragments/invoices/invoices';
import NewInvoice from '../../../support/fragments/invoices/newInvoice';
import Approvals from '../../../support/fragments/settings/invoices/approvals';
import InvoiceLineDetails from '../../../support/fragments/invoices/invoiceLineDetails';
import OrderLinesLimit from '../../../support/fragments/settings/orders/orderLinesLimit';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';

describe('Finance: Transactions', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const firstLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: false,
    restrictExpenditures: true,
  };
  const firstFund = { ...Funds.defaultUiFund };

  const firstOrder = {
    id: uuid(),
    vendor: '',
    orderType: 'One-Time',
    approved: true,
    reEncumber: true,
  };

  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
    allowableEncumbrance: 100,
    allowableExpenditure: 100,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const isApprovePayDisabled = false;
  let user;
  let location;
  let firstOrderNumber;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      firstLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(firstLedger).then((ledgerResponse) => {
        firstLedger.id = ledgerResponse.id;
        firstFund.ledgerId = firstLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          cy.getLocations({ limit: 1 }).then((res) => {
            location = res;

            cy.getDefaultMaterialType().then((mtype) => {
              cy.getAcquisitionMethodsApi({
                query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
              }).then((params) => {
                // Prepare 2 Open Orders for Rollover
                Organizations.createOrganizationViaApi(organization).then(
                  (responseOrganizations) => {
                    organization.id = responseOrganizations;
                    firstOrder.vendor = organization.id;
                    cy.getBatchGroups().then((batchGroup) => {
                      invoice.batchGroup = batchGroup.name;
                    });
                    OrderLinesLimit.setPOLLimitViaApi(3);
                    const firstOrderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      cost: {
                        listUnitPrice: 95,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 95,
                      },
                      fundDistribution: [
                        { code: firstFund.code, fundId: firstFund.id, value: 100 },
                      ],
                      locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                      acquisitionMethod: params.body.acquisitionMethods[0].id,
                      physical: {
                        createInventory: 'Instance, Holding, Item',
                        materialType: mtype.id,
                        materialSupplier: responseOrganizations,
                        volumes: [],
                      },
                    };
                    const secondOrderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      id: uuid(),
                      cost: {
                        listUnitPrice: 10.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 10.0,
                      },
                      fundDistribution: [
                        { code: firstFund.code, fundId: firstFund.id, value: 100 },
                      ],
                      locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                      acquisitionMethod: params.body.acquisitionMethods[0].id,
                      physical: {
                        createInventory: 'Instance, Holding, Item',
                        materialType: mtype.id,
                        materialSupplier: responseOrganizations,
                        volumes: [],
                      },
                    };
                    const thirdOrderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      id: uuid(),
                      cost: {
                        listUnitPrice: 5.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 1,
                        poLineEstimatedPrice: 5.0,
                      },
                      fundDistribution: [
                        { code: firstFund.code, fundId: firstFund.id, value: 100 },
                      ],
                      locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                      acquisitionMethod: params.body.acquisitionMethods[0].id,
                      physical: {
                        createInventory: 'Instance, Holding, Item',
                        materialType: mtype.id,
                        materialSupplier: responseOrganizations,
                        volumes: [],
                      },
                    };
                    Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                      firstOrder.id = firstOrderResponse.id;
                      firstOrderLine.purchaseOrderId = firstOrderResponse.id;
                      secondOrderLine.purchaseOrderId = firstOrderResponse.id;
                      thirdOrderLine.purchaseOrderId = firstOrderResponse.id;
                      firstOrderNumber = firstOrderResponse.poNumber;
                      OrderLines.createOrderLineViaApi(firstOrderLine);
                      OrderLines.createOrderLineViaApi(secondOrderLine);
                      OrderLines.createOrderLineViaApi(thirdOrderLine);

                      Orders.updateOrderViaApi({
                        ...firstOrderResponse,
                        workflowStatus: ORDER_STATUSES.OPEN,
                      });
                      cy.loginAsAdmin({
                        path: TopMenu.ordersPath,
                        waiter: Orders.waitLoading,
                      });
                      Orders.searchByParameter('PO number', firstOrderNumber);
                      Orders.selectFromResultsList(firstOrderNumber);
                      Orders.newInvoiceFromOrder();
                      Invoices.createInvoiceFromOrderWithMultiLines(
                        invoice,
                        defaultFiscalYear.code,
                      );
                      Invoices.closeInvoiceDetailsPane();
                      cy.visit(TopMenu.settingsInvoiveApprovalPath);
                      SettingsInvoices.checkApproveAndPayCheckboxIfNeeded();
                    });
                  },
                );
              });
            });
          });
        });
      });
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      permissions.uiInvoicesPayInvoices.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();

    OrderLinesLimit.setPOLLimitViaApi(1);
    Approvals.setApprovePayValue(isApprovePayDisabled);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C449373 Invoice with three invoice lines can NOT be paid when available expenditure balance is less that invoice total (thunderjet)',
    { tags: ['criticalPathBroken', 'thunderjet', 'C449373'] },
    () => {
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.canNotApproveAndPayInvoice(
        `One or more Fund distributions on this invoice can not be paid, because there is not enough money in [${firstFund.code}].`,
      );
      Invoices.selectInvoiceLineByNumber('$95.00');
      Invoices.verifyCurrentEncumbrance('$95.00');
      Invoices.backToInvoiceDetailsView();
      Invoices.selectInvoiceLineByNumber('$10.00');
      Invoices.verifyCurrentEncumbrance('$10.00');
      Invoices.backToInvoiceDetailsView();
      Invoices.selectInvoiceLineByNumber('$5.00');
      Invoices.verifyCurrentEncumbrance('$5.00');
      InvoiceLineDetails.openFundDetailsPane(firstFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.checkAbsentTransaction('Pending payment');
      Funds.checkAbsentTransaction('Payment');
    },
  );
});
