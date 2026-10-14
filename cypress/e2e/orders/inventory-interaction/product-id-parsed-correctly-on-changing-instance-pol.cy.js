import {
  APPLICATION_NAMES,
  CHANGE_INSTANCE_HOLDINGS_OPERATIONS,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import { InventoryInstance, InventoryInstances } from '../../../support/fragments/inventory';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InvoiceEditForm from '../../../support/fragments/invoices/invoiceEditForm';
import InvoiceView from '../../../support/fragments/invoices/invoiceView';
import Invoices from '../../../support/fragments/invoices/invoices';
import SelectOrderLinesModal from '../../../support/fragments/invoices/modal/selectOrderLinesModal';
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
import { BatchGroups } from '../../../support/fragments/settings/invoices';
import { Locations } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const testData = {
      initialIdentifier: '9780375806131 test',
      initialProductId: '9780375806131',
      initialQualifier: 'test',
      updatedIdentifier: '1-56619-909-3 test2',
      updatedProductId: '1-56619-909-3',
      updatedQualifier: 'test2',
    };

    before('Create test data', () => {
      testData.instanceTitle = `AT_C398007_FolioInstance_${getRandomPostfix()}`;
      testData.organization = {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C398007_Organization_${getRandomPostfix()}`,
      };
      testData.invoice = {
        invoiceDate: DateTools.getCurrentDate(),
        vendorInvoiceNo: `AT_C398007_${getRandomPostfix()}`,
        paymentMethod: 'EFT',
      };

      cy.clearLocalStorage();
      cy.getAdminToken();

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
            title: testData.instanceTitle,
            identifiers: [
              {
                identifierTypeId: testData.isbnTypeId,
                value: testData.initialIdentifier,
              },
            ],
          },
        }).then((instanceId) => {
          testData.instanceId = instanceId;
        });
      });

      cy.then(() => {
        Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        ).then((order) => {
          testData.order = order;

          OrderLines.createOrderLineViaApi({
            ...BasicOrderLine.getDefaultOrderLine({
              title: testData.instanceTitle,
              purchaseOrderId: order.id,
              acquisitionMethod: testData.acquisitionMethod.id,
              instanceId: testData.instanceId,
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
            details: {
              productIds: [
                {
                  productId: testData.initialProductId,
                  qualifier: testData.initialQualifier,
                  productIdType: testData.isbnTypeId,
                },
              ],
              subscriptionInterval: 0,
            },
          }).then((createdOrderLine) => {
            testData.orderLine = createdOrderLine;
            Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          });
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInvoicesApproveInvoices.gui,
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.uiInvoicesPayInvoices.gui,
        Permissions.uiOrdersEdit.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Invoices.getInvoiceViaApi({
        query: `vendorInvoiceNo=="${testData.invoice.vendorInvoiceNo}"`,
      }).then(({ invoices }) => {
        if (invoices && invoices.length) {
          Invoices.deleteInvoiceViaApi(invoices[0].id, { failOnStatusCode: false });
        }
      });
      Orders.deleteOrderViaApi(testData.order.id, false);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi({
        id: testData.budget.id,
        fundId: testData.fund.id,
        ledgerId: testData.ledger.id,
        fiscalYearId: testData.fiscalYear.id,
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C398007 Product ID numbers are parsed correctly when using "Change instance" action on POL (for one-time order) (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C398007'] },
      () => {
        // Step 1: Open Instance, verify Identifiers accordion shows initial identifier
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.verifyResourceIdentifier('ISBN', testData.initialIdentifier, 0);

        // Step 2: Click Actions > Edit instance
        InventoryInstance.editInstance();

        // Step 3: Replace existing identifier value
        InstanceRecordEdit.fillIdentifierValue(testData.updatedIdentifier);

        // Step 4: Save & close, verify updated identifier is displayed
        InstanceRecordEdit.saveAndClose();
        InventoryInstance.verifyResourceIdentifier('ISBN', testData.updatedIdentifier, 0);

        // Step 5: Navigate to Orders, open order, open POL, verify Product ID and Qualifier
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.openPolDetails(testData.instanceTitle);
        OrderLineDetails.checkProductIdentifiers([
          { productId: testData.initialProductId, qualifier: testData.initialQualifier },
        ]);

        // Step 6: Click Actions > Change instance connection
        OrderLineDetails.changeInstanceConnection();

        // Step 7: Search for instance in popup, click on it
        SelectInstanceModal.searchByName(testData.instanceTitle);
        SelectInstanceModal.selectInstance({ shouldConfirm: true });

        // Step 8: Select "Find or create" > Submit > Keep Holdings, verify updated Product ID and Qualifier
        ChangeInstanceModal.selectHoldingOperation({
          operation: CHANGE_INSTANCE_HOLDINGS_OPERATIONS.FIND_OR_CREATE_NEW,
          shouldConfirm: false,
        });
        ChangeInstanceModal.clickSubmitButton({ updated: false });
        DeleteHoldingsModal.verifyModalView();
        DeleteHoldingsModal.clickKeepHoldingsButton();
        OrderLineDetails.checkProductIdentifiers([
          { productId: testData.updatedIdentifier, qualifier: '' },
        ]);

        // Step 9: Navigate to Invoices, click Actions > New
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.waitLoading();
        Invoices.openInvoiceEditForm({ createNew: true });

        // Step 10: Fill in invoice fields
        InvoiceEditForm.fillInvoiceFields({
          invoiceDate: testData.invoice.invoiceDate,
          vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
          vendorName: testData.organization.name,
          batchGroupName: testData.invoice.batchGroupName,
          paymentMethod: testData.invoice.paymentMethod,
        });

        // Step 11: Save & close
        InvoiceEditForm.clickSaveButton({ invoiceCreated: true, invoiceLineCreated: false });
        InvoiceView.waitLoading();

        // Steps 12-13: Open Select order lines modal, search for POL, verify Product ID, select row
        InvoiceView.openSelectOrderLineModal();
        SelectOrderLinesModal.searchByName(testData.orderLine.poLineNumber);
        SelectOrderLinesModal.assertSearchResults([testData.updatedIdentifier]);
        SelectOrderLinesModal.selectFromSearchResults();
        SelectOrderLinesModal.checkOrderLineSelected();

        // Step 14: Save — invoice line added
        SelectOrderLinesModal.clickSaveButton();

        // Steps 15-16: Approve invoice
        Invoices.approveInvoice();

        // Steps 17-18: Pay invoice, verify Paid status
        Invoices.payInvoice();
        InvoiceView.verifyStatus(INVOICE_STATUSES.PAID);
      },
    );
  });
});
