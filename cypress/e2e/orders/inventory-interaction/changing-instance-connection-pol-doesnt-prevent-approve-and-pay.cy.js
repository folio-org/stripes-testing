import {
  CHANGE_INSTANCE_HOLDINGS_OPERATIONS,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import { InventoryInstance, InventoryInstances } from '../../../support/fragments/inventory';
import InvoiceEditForm from '../../../support/fragments/invoices/invoiceEditForm';
import InvoiceView from '../../../support/fragments/invoices/invoiceView';
import Invoices from '../../../support/fragments/invoices/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../../support/fragments/orders';
import ChangeInstanceModal from '../../../support/fragments/orders/modals/changeInstanceModal';
import DeleteHoldingsModal from '../../../support/fragments/orders/modals/deleteHoldingsModal';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { Approvals, BatchGroups } from '../../../support/fragments/settings/invoices';
import { Locations } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const testData = {
      targetIdentifier: '9780375806131 test',
      targetProductId: '9780375806131',
      targetQualifier: 'test',
    };

    before('Create test data', () => {
      testData.initialInstanceTitle = `AT_C398006_InitialInstance_${getRandomPostfix()}`;
      testData.targetInstanceTitle = `AT_C398006_TargetInstance_${getRandomPostfix()}`;
      testData.organization = {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C398006_Organization_${getRandomPostfix()}`,
      };
      testData.invoice = {
        invoiceDate: DateTools.getCurrentDate(),
        vendorInvoiceNo: `AT_C398006_${getRandomPostfix()}`,
        paymentMethod: 'EFT',
      };

      cy.clearLocalStorage();
      cy.getAdminToken();

      Approvals.setApprovePayValueViaApi(true);

      BatchGroups.getBatchGroupsViaApi({ limit: 1 }).then(([batchGroup]) => {
        testData.invoice.batchGroupName = batchGroup.name;
      });

      Organizations.createOrganizationViaApi(testData.organization).then(() => {});

      const { fund, ledger, fiscalYear, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        budget: { allocated: 100 },
      });
      testData.fund = fund;
      testData.ledger = ledger;
      testData.fiscalYear = fiscalYear;
      testData.budget = budget;

      cy.getInstanceTypes({ limit: 1 });
      cy.getAcquisitionMethodsApi().then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
      Locations.getViaApiAnyDefault(1).then(([location]) => {
        testData.location = location;
      });

      InventoryInstances.getIdentifierTypes({ query: 'name=="ISBN"' }).then((isbnType) => {
        testData.isbnTypeId = isbnType.id;
        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: testData.initialInstanceTitle,
          },
        }).then((instanceId) => {
          testData.initialInstanceId = instanceId;
        });
        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: testData.targetInstanceTitle,
            identifiers: [
              {
                identifierTypeId: testData.isbnTypeId,
                value: testData.targetIdentifier,
              },
            ],
          },
        }).then((instanceId) => {
          testData.targetInstanceId = instanceId;
        });
      });

      cy.then(() => {
        Orders.createOrderViaApi(
          NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
        ).then((order) => {
          testData.order = order;

          OrderLines.createOrderLineViaApi({
            ...BasicOrderLine.getDefaultOrderLine({
              title: testData.initialInstanceTitle,
              purchaseOrderId: order.id,
              acquisitionMethod: testData.acquisitionMethod.id,
              instanceId: testData.initialInstanceId,
              specialLocationId: testData.location.id,
              fundDistribution: [
                {
                  fundId: testData.fund.id,
                  distributionType: 'percentage',
                  value: 100,
                },
              ],
              listUnitPrice: 25,
            }),
            details: { subscriptionInterval: 0 },
          }).then((createdOrderLine) => {
            testData.orderLine = createdOrderLine;
            Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          });
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.uiInvoicesPayInvoices.gui,
        Permissions.uiOrdersEdit.gui,
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
      Approvals.setApprovePayValueViaApi(false);
      Invoices.getInvoiceViaApi({
        query: `vendorInvoiceNo=="${testData.invoice.vendorInvoiceNo}"`,
      }).then(({ invoices }) => {
        if (invoices && invoices.length) {
          Invoices.deleteInvoiceViaApi(invoices[0].id, { failOnStatusCode: false });
        }
      });
      Orders.deleteOrderViaApi(testData.order.id, false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      InventoryInstance.deleteInstanceViaApi(testData.initialInstanceId);
      InventoryInstance.deleteInstanceViaApi(testData.targetInstanceId);
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi({
        id: testData.budget.id,
        fundId: testData.fund.id,
        ledgerId: testData.ledger.id,
        fiscalYearId: testData.fiscalYear.id,
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C398006 Changing instance connection on POL doesn\'t prevent to approve and pay invoice ("Approve and pay in one click" setting is enabled) (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C398006', 'nonParallel'] },
      () => {
        // Step 1: Click PO number link
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.selectOrderByPONumber(testData.order.poNumber);

        // Step 2: Click POL under PO lines accordion
        OrderDetails.openPolDetails(testData.initialInstanceTitle);

        // Step 3: Actions > Change instance connection
        OrderLineDetails.changeInstanceConnection();

        // Step 4: Search for target instance, select it
        SelectInstanceModal.searchByName(testData.targetInstanceTitle);
        SelectInstanceModal.selectInstance({ shouldConfirm: true });

        // Step 5: Select "Find or create new" in How to update Holdings
        ChangeInstanceModal.selectHoldingOperation({
          operation: CHANGE_INSTANCE_HOLDINGS_OPERATIONS.FIND_OR_CREATE_NEW,
          shouldConfirm: false,
        });

        // Step 6: Click Submit
        ChangeInstanceModal.clickSubmitButton({ updated: false });

        // Step 7: Click Keep Holdings, verify new title in POL
        DeleteHoldingsModal.verifyModalView();
        DeleteHoldingsModal.clickKeepHoldingsButton();
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [{ key: 'Title', value: testData.targetInstanceTitle }],
        });

        // Step 8: Check Product identifiers table
        OrderLineDetails.checkProductIdentifiers([
          { productId: testData.targetIdentifier, qualifier: '' },
        ]);

        // Step 9: Click back arrow to return to PO pane
        OrderLineDetails.backToOrderDetails();

        // Step 10: Actions > New invoice > Submit in Create invoice modal
        OrderDetails.createNewInvoice();

        // Step 11: Fill invoice fields
        InvoiceEditForm.fillInvoiceFields({
          invoiceDate: testData.invoice.invoiceDate,
          vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
          batchGroupName: testData.invoice.batchGroupName,
          paymentMethod: testData.invoice.paymentMethod,
        });

        // Step 12: Save & close — invoice and invoice line saved
        InvoiceEditForm.clickSaveButton({ invoiceCreated: true, invoiceLineCreated: true });
        InvoiceView.waitLoading();

        // Step 13: Actions > Approve & pay > Submit, verify Paid status
        InvoiceView.approveInvoice({ isApprovePayEnabled: true });
        InvoiceView.verifyStatus(INVOICE_STATUSES.PAID);
      },
    );
  });
});
