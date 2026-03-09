import permissions from '../../support/dictionary/permissions';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { Budgets, TransactionDetails } from '../../support/fragments/finance';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';

describe('Invoices', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    organization: {},
    order: {},
    orderLine: {},
    invoice: {},
    user: {},
    location: {},
    encumbranceId: '',
  };

  const orderAmount = 100;

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      FiscalYears.createViaApi(FiscalYears.defaultUiFiscalYear).then((fiscalYearResponse) => {
        testData.fiscalYear = fiscalYearResponse;

        const ledger = {
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: fiscalYearResponse.id,
        };

        Ledgers.createViaApi(ledger).then((ledgerResponse) => {
          testData.ledger = ledgerResponse;

          const fund = {
            ...Funds.getDefaultFund(),
            ledgerId: ledgerResponse.id,
          };

          Funds.createViaApi(fund).then((fundResponse) => {
            testData.fund = fundResponse.fund;

            const budget = {
              ...Budgets.getDefaultBudget(),
              fiscalYearId: fiscalYearResponse.id,
              fundId: fundResponse.fund.id,
              allocated: 1000,
            };

            Budgets.createViaApi(budget).then((budgetResponse) => {
              testData.budget = budgetResponse;
            });
          });
        });
      });

      Organizations.createOrganizationViaApi({
        ...NewOrganization.defaultUiOrganizations,
        isVendor: true,
      }).then((organizationResponse) => {
        testData.organization = {
          id: organizationResponse,
          ...NewOrganization.defaultUiOrganizations,
        };
      });

      ServicePoints.getViaApi().then((servicePoint) => {
        NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
          (locationResponse) => {
            testData.location = locationResponse;
          },
        );
      });
    });

    cy.then(() => {
      const order = {
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        orderType: 'One-Time',
        reEncumber: true,
      };

      cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        }).then((acquisitionMethod) => {
          const orderLine = {
            ...BasicOrderLine.defaultOrderLine,
            cost: {
              listUnitPrice: orderAmount,
              currency: 'USD',
              discountType: 'percentage',
              quantityPhysical: 1,
              poLineEstimatedPrice: orderAmount,
            },
            fundDistribution: [
              {
                code: testData.fund.code,
                fundId: testData.fund.id,
                distributionType: 'percentage',
                value: 100,
              },
            ],
            locations: [
              {
                locationId: testData.location.id,
                quantity: 1,
                quantityPhysical: 1,
              },
            ],
            acquisitionMethod: acquisitionMethod.body.acquisitionMethods[0].id,
            physical: {
              createInventory: 'Instance, Holding, Item',
              materialType: materialType.id,
              materialSupplier: testData.organization.id,
              volumes: [],
            },
          };

          Orders.createOrderWithOrderLineViaApi(order, orderLine).then((orderResponse) => {
            testData.order = orderResponse;

            Orders.updateOrderViaApi({
              ...orderResponse,
              workflowStatus: ORDER_STATUSES.OPEN,
            }).then(() => {
              Orders.updateOrderViaApi({
                ...orderResponse,
                workflowStatus: 'Pending',
              });
            });
          });
        });
      });
    });

    cy.then(() => {
      Approvals.setApprovePayValue(false);
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersEdit.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C350631 Encumbrance is released and Pending payment/Payment are created successfully (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C350631'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      Orders.openOrder();

      Orders.newInvoiceFromOrder();
      cy.getBatchGroups().then((batchGroup) => {
        const invoice = {
          ...NewInvoice.defaultUiInvoice,
          batchGroup: batchGroup.name,
          invoiceDate: DateTools.getCurrentDate(),
        };
        testData.invoice = invoice;
        Invoices.createInvoiceFromOrderWithoutFY(invoice);

        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.checkFundDistibutionTableContent([
          {
            name: testData.fund.name,
            currentEncumbrance: `$${orderAmount}.00`,
          },
        ]);
        InvoiceLineDetails.checkInvoiceLineDetails({
          checkboxes: [
            {
              locator: { labelText: 'Release encumbrance' },
              conditions: { disabled: true, checked: true },
            },
          ],
        });

        InvoiceLineDetails.closeInvoiceLineDetailsPane();

        Invoices.approveInvoice();

        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.checkFundDistibutionTableContent([
          {
            name: testData.fund.name,
            currentEncumbrance: '$0.00',
          },
        ]);

        InvoiceLineDetails.openEncumbrancePane(testData.fund.name);
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: testData.fiscalYear.code },
            { key: 'Amount', value: '$0.00' },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: testData.fund.name },
            { key: 'Initial encumbrance', value: `$${orderAmount}.00` },
            { key: 'Awaiting payment', value: `$${orderAmount}.00` },
            { key: 'Expended', value: '$0.00' },
            { key: 'Status', value: 'Released' },
          ],
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.searchByNumber(testData.invoice.invoiceNumber);
        Invoices.selectInvoice(testData.invoice.invoiceNumber);
        Invoices.payInvoice();

        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.checkFundDistibutionTableContent([
          {
            name: testData.fund.name,
            currentEncumbrance: '$0.00',
          },
        ]);

        InvoiceLineDetails.openEncumbrancePane(testData.fund.name);
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: testData.fiscalYear.code },
            { key: 'Amount', value: '$0.00' },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: testData.fund.name },
            { key: 'Initial encumbrance', value: `$${orderAmount}.00` },
            { key: 'Awaiting payment', value: '$0.00' },
            { key: 'Expended', value: `$${orderAmount}.00` },
            { key: 'Status', value: 'Released' },
          ],
        });
      });
    },
  );
});
