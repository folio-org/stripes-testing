import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import DuplicateInvoiceModal from '../../support/fragments/invoices/modal/duplicateInvoiceModal';
import InteractorsTools from '../../support/utils/interactorsTools';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import InvoiceStates from '../../support/fragments/invoices/invoiceStates';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORDER_STATUSES,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';

describe('Invoices', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    organization: {
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    },
    order: {},
    orderLine: {},
    invoice: {},
    duplicatedInvoice: {},
    acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit(),
    user: {},
    adminUser: {},
    adminMembershipId: null,
  };

  const createFinanceData = () => {
    return FiscalYears.createViaApi(FiscalYears.defaultUiFiscalYear).then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      const ledger = {
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: fiscalYearResponse.id,
      };

      return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        const fund = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
        };

        return Funds.createViaApi(fund).then((fundResponse) => {
          testData.fund = fundResponse.fund;

          const budget = {
            ...Budgets.getDefaultBudget(),
            fiscalYearId: fiscalYearResponse.id,
            fundId: fundResponse.fund.id,
            allocated: 1000,
          };

          return Budgets.createViaApi(budget).then((budgetResponse) => {
            testData.budget = budgetResponse;
          });
        });
      });
    });
  };

  const createOrderWithLine = (acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: ORDER_TYPES.ONE_TIME_API,
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine = {
        ...BasicOrderLine.defaultOrderLine,
        purchaseOrderId: orderResponse.id,
        cost: {
          listUnitPrice: 100.0,
          currency: 'USD',
          quantityPhysical: 1,
          poLineEstimatedPrice: 100.0,
        },
        fundDistribution: [
          {
            code: testData.fund.code,
            fundId: testData.fund.id,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 100,
          },
        ],
        locations: [],
        acquisitionMethod: acquisitionMethodId,
        physical: {
          createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE,
          materialSupplier: testData.organization.id,
        },
      };

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return OrderLines.getOrderLineViaApi({ query: `id=="${orderLineResponse.id}"` }).then(
            (orderLinesArray) => {
              testData.orderLine = orderLinesArray[0];
            },
          );
        });
      });
    });
  };

  const createInvoice = (batchGroupId) => {
    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: testData.organization.id,
      poLineId: testData.orderLine.id,
      fiscalYearId: testData.fiscalYear.id,
      batchGroupId,
      fundDistributions: testData.orderLine.fundDistribution,
      accountingCode: testData.organization.erpCode,
      subTotal: -20.0,
      acqUnitIds: [testData.acqUnit.id],
      invoiceStatus: INVOICE_STATUSES.OPEN,
    }).then((invoice) => {
      testData.invoice = invoice;
      return Invoices.changeInvoiceStatusViaApi({
        invoice,
        status: INVOICE_STATUSES.PAID,
      });
    });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;

      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        })
        .then((acquisitionMethod) => {
          return createOrderWithLine(acquisitionMethod.body.acquisitionMethods[0].id).then(() => {
            return cy.getBatchGroups().then((batchGroup) => {
              return createInvoice(batchGroup.id);
            });
          });
        });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    return AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then(
      (acquisitionUnit) => {
        testData.acqUnit = acquisitionUnit;

        return cy.getAdminUserDetails().then((adminUser) => {
          testData.adminUser = adminUser;

          return AcquisitionUnits.assignUserViaApi(adminUser.id, testData.acqUnit.id).then(
            (membershipId) => {
              testData.adminMembershipId = membershipId;

              return createFinanceData().then(() => {
                return createOrderData().then(() => {
                  return cy
                    .createTempUser([
                      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
                      Permissions.assignAcqUnitsToNewInvoice.gui,
                    ])
                    .then((userProperties) => {
                      testData.user = userProperties;

                      cy.login(testData.user.username, testData.user.password, {
                        path: TopMenu.invoicesPath,
                        waiter: Invoices.waitLoading,
                      });
                    });
                });
              });
            },
          );
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      AcquisitionUnits.unAssignUserViaApi(testData.adminMembershipId);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id);
    });
  });

  it(
    'C514984 Duplicate invoice in "Paid" status with acquisition unit that active user does not belong to Extended (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C514984'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.ACQUISITION_UNITS, value: testData.acqUnit.name },
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });
      Invoices.selectDuplicateInvoice();
      DuplicateInvoiceModal.clickDuplicateButton(false);
      InteractorsTools.checkCalloutErrorMessage(
        InvoiceStates.invoiceOperationNotPermittedBecauseOfAcqUnitMessage,
      );
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.ACQUISITION_UNITS, value: testData.acqUnit.name },
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.PAID },
        ],
      });
      InvoiceView.toggleMetadataAccordion();
      InvoiceView.verifyMetadataContent({
        createdBy: `${testData.adminUser.personal.lastName}, ${testData.adminUser.personal.firstName}`,
      });
    },
  );
});
