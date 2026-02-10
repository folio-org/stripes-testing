import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import { Budgets, FundDetails, Funds } from '../../../support/fragments/finance';
import Transactions from '../../../support/fragments/finance/transactions/transactions';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Approvals from '../../../support/fragments/settings/invoices/approvals';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Finance', () => {
  describe('Transactions', () => {
    const organization = NewOrganization.getDefaultOrganization();
    const testData = {
      user: {},
      fiscalYear: {},
      fund: {},
      budget: {},
      organization,
      firstOrder: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
      secondOrder: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
      firstInvoice: {},
      secondInvoice: {},
      thirdInvoice: {},
    };
    const isApprovePayEnabled = true;

    before(() => {
      cy.getAdminToken()
        .then(() => {
          const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
            ledger: { restrictEncumbrance: false, restrictExpenditures: true },
            budget: { allocated: 100, allowableEncumbrance: 100, allowableExpenditure: 100 },
          });
          testData.fiscalYear = fiscalYear;
          testData.fund = fund;
          testData.budget = budget;

          cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
            (locationResponse) => {
              testData.location = locationResponse;
            },
          );
          cy.getBookMaterialType().then((mtypeResponse) => {
            testData.materialType = mtypeResponse;
          });
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
          }).then((aqResponse) => {
            testData.acquisitionMethod = aqResponse.body.acquisitionMethods[0];
          });
          Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
            organization.id = responseOrganizations;
          });
        })
        .then(() => {
          const orderLine = {
            id: uuid(),
            ...BasicOrderLine.defaultOrderLine,
            cost: {
              listUnitPrice: 10,
              currency: 'USD',
              discountType: 'percentage',
              quantityPhysical: 1,
              poLineEstimatedPrice: 10,
            },
            fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
            locations: [{ locationId: testData.location.id, quantity: 1, quantityPhysical: 1 }],
            acquisitionMethod: testData.acquisitionMethod.id,
            physical: {
              createInventory: 'Instance, Holding, Item',
              materialType: testData.materialType.id,
              materialSupplier: organization.id,
              volumes: [],
            },
          };

          Orders.createOrderViaApi(testData.firstOrder).then((orderResponse) => {
            testData.firstOrder.id = orderResponse.id;
            orderLine.purchaseOrderId = orderResponse.id;
            testData.firstOrderNumber = orderResponse.poNumber;

            OrderLines.createOrderLineViaApi(orderLine);
            Orders.updateOrderViaApi({
              ...orderResponse,
              workflowStatus: ORDER_STATUSES.OPEN,
            });
          });

          // create first invoice with invoice line (subTotal: 15$)
          Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: organization.id,
            fiscalYearId: testData.fiscalYear.id,
            fundDistributions: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
            accountingCode: organization.erpCode,
            releaseEncumbrance: true,
            subTotal: 15,
          }).then((invoiceResponse) => {
            testData.firstInvoice = invoiceResponse;

            Invoices.changeInvoiceStatusViaApi({
              invoice: invoiceResponse,
              status: INVOICE_STATUSES.APPROVED,
            });
          });

          // create second invoice with invoice line (subTotal: -20$)
          Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: organization.id,
            fiscalYearId: testData.fiscalYear.id,
            fundDistributions: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
            accountingCode: organization.erpCode,
            releaseEncumbrance: true,
            subTotal: -20,
          }).then((secondInvoiceResponse) => {
            testData.secondInvoice = secondInvoiceResponse;

            Invoices.changeInvoiceStatusViaApi({
              invoice: secondInvoiceResponse,
              status: INVOICE_STATUSES.PAID,
            });
          });
          // create third invoice with three invoice lines (subTotals: 16$, -10$, 100$)
          cy.getBatchGroups().then((batchGroup) => {
            Invoices.createInvoiceViaApi({
              vendorId: testData.organization.id,
              fiscalYearId: testData.fiscalYear.id,
              batchGroupId: batchGroup.id,
              accountingCode: testData.organization.erpCode,
            }).then((invoiceResponse) => {
              testData.thirdInvoice = invoiceResponse;

              const firstInvoiceLine = {
                invoiceId: invoiceResponse.id,
                invoiceLineStatus: 'Open',
                fundDistributions: [
                  {
                    distributionType: 'percentage',
                    value: 100,
                    fundId: testData.fund.id,
                    code: testData.fund.code,
                    encumbrance: null,
                  },
                ],
                description: `Description for the first invoice line ${getRandomPostfix()}`,
                quantity: 1,
                subTotal: 16,
              };
              const secondInvoiceLine = {
                invoiceId: invoiceResponse.id,
                invoiceLineStatus: 'Open',
                fundDistributions: [
                  {
                    distributionType: 'percentage',
                    value: 100,
                    fundId: testData.fund.id,
                    code: testData.fund.code,
                    encumbrance: null,
                  },
                ],
                description: `Description for the second invoice line ${getRandomPostfix()}`,
                quantity: 1,
                subTotal: -10,
              };
              const thirdInvoiceLine = {
                invoiceId: invoiceResponse.id,
                invoiceLineStatus: 'Open',
                fundDistributions: [
                  {
                    distributionType: 'percentage',
                    value: 100,
                    fundId: testData.fund.id,
                    code: testData.fund.code,
                    encumbrance: null,
                  },
                ],
                description: `Description for the third invoice line ${getRandomPostfix()}`,
                quantity: 1,
                subTotal: 100,
              };
              Invoices.createInvoiceLineViaApi(firstInvoiceLine);
              Invoices.createInvoiceLineViaApi(secondInvoiceLine);
              Invoices.createInvoiceLineViaApi(thirdInvoiceLine);
            });
          });
          Approvals.setApprovePayValueViaApi(isApprovePayEnabled);
        });

      cy.createTempUser([
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.uiInvoicesPayInvoices.gui,
        Permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.waitLoading();
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    // may be flaky due to concurrency issues because 'Approve and pay in one click' is set to 'true'
    it(
      'C496167 Invoice with three invoice lines (including credit) can NOT be paid when available expenditure balance is less that invoice total  (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C496167'] },
      () => {
        Invoices.searchByNumber(testData.thirdInvoice.vendorInvoiceNo);
        Invoices.selectInvoice(testData.thirdInvoice.vendorInvoiceNo);
        InvoiceView.checkInvoiceDetails({
          invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
        });
        Invoices.canNotApproveAndPayInvoice(testData.fund);
        InvoiceView.checkInvoiceDetails({
          invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
        });
        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.openFundDetailsPane(testData.fund.name);
        Funds.waitLoading();
        FundDetails.viewTransactionsForCurrentBudget();
        Transactions.waitLoading();
        Funds.checkAbsentTransaction('Payment');
        Funds.checkTransactionCount('Pending payment', 1);
      },
    );
  });
});
