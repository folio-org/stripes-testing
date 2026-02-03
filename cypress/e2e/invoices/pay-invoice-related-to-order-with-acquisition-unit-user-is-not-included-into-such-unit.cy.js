import { INVOICE_STATUSES, ORDER_STATUSES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import {
  InvoiceEditForm,
  InvoiceLineDetails,
  InvoiceView,
  Invoices,
} from '../../support/fragments/invoices';
import ApproveInvoiceModal from '../../support/fragments/invoices/modal/approveInvoiceModal';
import { BasicOrderLine, NewOrder, OrderDetails, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import { Approvals } from '../../support/fragments/settings/invoices';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import SettingsInvoices from '../../support/fragments/invoices/settingsInvoices';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const ledger = { ...Ledgers.defaultUiLedger };
  const fund = { ...Funds.defaultUiFund };
  const budget = {
    ...Budgets.getDefaultBudget(),
    allocated: 101,
  };
  const isApprovePayEnabled = true;
  const isApprovePayDisabled = false;
  const testData = {
    acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit({ protectRead: true }),
    user: {},
    invoice: {
      invoiceDate: DateTools.getFormattedDate({ date: new Date() }),
      batchGroupName: 'FOLIO',
      vendorInvoiceNo: getRandomPostfix(),
      paymentMethod: 'Cash',
    },
  };
  const order = NewOrder.getDefaultOrder({ vendorId: organization.id });

  before('Create test data and login', () => {
    cy.getAdminToken();
    AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then(() => {
      cy.getAdminUserDetails().then((user) => {
        AcquisitionUnits.assignUserViaApi(user.id, testData.acqUnit.id).then((id) => {
          testData.membershipAdminId = id;
        });
      });
    });
    Organizations.createOrganizationViaApi(organization).then((organizationResp) => {
      organization.id = organizationResp;

      FiscalYears.createViaApi(fiscalYear).then((fiscalYearResp) => {
        fiscalYear.id = fiscalYearResp.id;
        budget.fiscalYearId = fiscalYearResp.id;
        ledger.fiscalYearOneId = fiscalYearResp.id;

        Ledgers.createViaApi(ledger).then((ledgerResp) => {
          ledger.id = ledgerResp.id;
          fund.ledgerId = ledgerResp.id;

          Funds.createViaApi(fund).then((fundResp) => {
            fund.id = fundResp.fund.id;
            budget.fundId = fundResp.fund.id;

            Budgets.createViaApi(budget);

            const orderLine = BasicOrderLine.getDefaultOrderLine({
              acquisitionMethod: testData.acqUnit.id,
              automaticExport: true,
              purchaseOrderId: order.id,
              vendorDetail: { vendorAccount: null },
              fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
            });

            Orders.createOrderWithOrderLineViaApi(order, orderLine).then((respOrder) => {
              testData.order = respOrder;

              Orders.updateOrderViaApi({
                ...testData.order,
                workflowStatus: ORDER_STATUSES.OPEN,
                acqUnitIds: [testData.acqUnit.id],
              });
            });
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiSettingsAcquisitionUnitsViewEditCreateDelete.gui,
      Permissions.uiSettingsAcquisitionUnitsManageAcqUnitUserAssignments.gui,
      Permissions.invoiceSettingsAll.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      AcquisitionUnits.assignUserViaApi(userProperties.userId, testData.acqUnit.id);

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.settingsInvoiveApprovalPath,
        waiter: SettingsInvoices.waitApprovalsLoading,
      });
      SettingsInvoices.checkApproveAndPayCheckboxIfNeeded();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Approvals.setApprovePayValue(isApprovePayDisabled);
    AcquisitionUnits.unAssignUserViaApi(testData.membershipAdminId);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C446069 Pay invoice related to order with acquisition unit (user is not included into such unit) (thunderjet)',
    { tags: ['criticalPathBroken', 'thunderjet', 'C446069'] },
    () => {
      TopMenuNavigation.navigateToApp('Orders');
      Orders.selectOrdersPane();
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.createNewInvoice();
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
        batchGroupName: testData.invoice.batchGroupName,
        vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
        paymentMethod: testData.invoice.paymentMethod,
      });
      cy.wait(1000);
      InvoiceEditForm.clickSaveButton({ invoiceCreated: true, invoiceLineCreated: true });

      cy.visit(SettingsMenu.acquisitionUnitsPath);
      AcquisitionUnits.unAssignUser(testData.user.username, testData.acqUnit.name);

      cy.visit(TopMenu.invoicesPath);
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.clickApproveAndPayInvoice({ isApprovePayEnabled });
      ApproveInvoiceModal.clickSubmitButton({ isApprovePayEnabled });
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.openFundDetailsPane(fund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.verifyTransactionWithAmountExist('Payment', '($1.00)');
    },
  );
});
