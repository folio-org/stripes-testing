import QueryModal, { QUERY_OPERATIONS } from '../../../support/fragments/bulk-edit/query-modal';
import {
  FUND_WITH_LEDGER_FIELDS,
  INVOICE_LINES_FIELDS,
  INVOICES_FIELDS,
  ORGANIZATIONS_FIELDS,
  PURCHASE_ORDER_LINES_FIELDS,
  TRANSACTIONS_FIELDS,
  USERS_FIELDS,
} from '../../../support/constants/query-builder';
import { Budgets, Transactions } from '../../../support/fragments/finance';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../../support/fragments/invoices/invoices';
import { Lists } from '../../../support/fragments/lists/lists';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Query Builder', () => {
    const listName = `AT_C1259785_List_${getRandomPostfix()}`;
    const TAG = `urgent_${getRandomPostfix()}`;
    const testData = {
      tagId: null,
      fiscalYear: {},
      ledger: {},
      fund: {},
      budget: {},
      organization: {},
      order: {},
      orderLine: {},
      nonTaggedOrganization: {},
      nonTaggedOrder: {},
      nonTaggedOrderLine: {},
      nonTaggedFund: {},
      nonTaggedBudget: {},
      secondTaggedFund: {},
      secondTaggedBudget: {},
      transactionIds: [],
      invoice: {},
      taggedInvoiceLine: {},
      nonTaggedInvoice: {},
      nonTaggedInvoiceLine: {},
      taggedUser: {},
    };

    before('Create test data with Urgent tag', () => {
      cy.getAdminToken();

      // Create "urgent" tag definition so it appears in QB value dropdowns
      Organizations.createTagViaApi(TAG).then((tagId) => {
        testData.tagId = tagId;
      });

      // Create finance hierarchy: fiscal year → ledger → fund (with tag) → budget
      FiscalYears.createViaApi(FiscalYears.defaultUiFiscalYear).then((fy) => {
        testData.fiscalYear = fy;
        const ledger = { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fy.id };

        Ledgers.createViaApi(ledger).then((ledgerResp) => {
          testData.ledger = ledgerResp;
          const fund = {
            ...Funds.getDefaultFund(),
            ledgerId: ledgerResp.id,
            tags: { tagList: [TAG] },
          };

          Funds.createViaApi(fund).then((fundResp) => {
            testData.fund = fundResp.fund;

            const budget = {
              ...Budgets.getDefaultBudget(),
              fiscalYearId: fy.id,
              fundId: fundResp.fund.id,
              allocated: 1000,
            };
            Budgets.createViaApi(budget).then((budgetResp) => {
              testData.budget = budgetResp;
            });
          });
        });
      });

      // Create organization (vendor) with tag — used for order/invoice/POL
      const taggedOrg = {
        ...NewOrganization.getDefaultOrganization({ isVendor: true }),
        tags: { tagList: [TAG] },
      };

      // Resolve order line prerequisites once — shared by tagged and non-tagged order/orderLine chains below
      let lineCreationDefaults;
      cy.getAcquisitionMethodsApi({ query: 'value=="Purchase"' }).then((acqMethod) => {
        cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
          cy.getLocations({ limit: 1 }).then((location) => {
            lineCreationDefaults = {
              specialLocationId: location.id,
              specialMaterialTypeId: materialType.id,
              acquisitionMethod: acqMethod.body.acquisitionMethods[0].id,
            };
          });
        });
      });

      Organizations.createOrganizationViaApi(taggedOrg).then((orgId) => {
        testData.organization.id = orgId;
        testData.organization.name = taggedOrg.name;

        Orders.createOrderViaApi({
          ...NewOrder.getDefaultOrder({ vendorId: orgId }),
          orderType: 'One-Time',
          tags: { tagList: [TAG] },
        }).then((orderResp) => {
          testData.order = orderResp;
          OrderLines.createOrderLineViaApi({
            ...BasicOrderLine.getDefaultOrderLine(lineCreationDefaults),
            purchaseOrderId: orderResp.id,
            tags: { tagList: [TAG] },
          }).then((olResp) => {
            testData.orderLine = olResp;
          });
        });

        // Create invoice with tag and an invoice line also tagged
        Invoices.createInvoiceViaApi({ vendorId: orgId }).then((invoice) => {
          testData.invoice = invoice;
          Invoices.updateInvoiceViaApi({ ...invoice, tags: { tagList: [TAG] } });

          Invoices.createInvoiceLineViaApi({
            ...Invoices.getDefaultInvoiceLine({
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
            }),
            tags: { tagList: [TAG] },
          }).then((invoiceLine) => {
            testData.taggedInvoiceLine = invoiceLine;
          });
        });

        // Create invoice without tag — ensures Step 5 "NOT IN" query returns at least one result
        Invoices.createInvoiceViaApi({ vendorId: orgId }).then((invoice) => {
          testData.nonTaggedInvoice = invoice;

          // Create invoice line without tag — ensures Step 7 "NOT IN" query returns at least one result
          Invoices.createInvoiceLineViaApi(
            Invoices.getDefaultInvoiceLine({
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
            }),
          ).then((invoiceLine) => {
            testData.nonTaggedInvoiceLine = invoiceLine;
          });
        });
      });

      // Create non-tagged org with order and order line — ensures Step 9 "NOT IN" query returns at least one result
      Organizations.createOrganizationViaApi(
        NewOrganization.getDefaultOrganization({ isVendor: true }),
      ).then((orgId) => {
        testData.nonTaggedOrganization.id = orgId;

        Orders.createOrderViaApi({
          ...NewOrder.getDefaultOrder({ vendorId: orgId }),
          orderType: 'One-Time',
        }).then((orderResp) => {
          testData.nonTaggedOrder = orderResp;
          OrderLines.createOrderLineViaApi({
            ...BasicOrderLine.getDefaultOrderLine(lineCreationDefaults),
            purchaseOrderId: orderResp.id,
          }).then((olResp) => {
            testData.nonTaggedOrderLine = olResp;
          });
        });
      });

      // Create a user with tag
      cy.getFirstUserGroupId().then(({ id: patronGroupId }) => {
        Users.createViaApi({
          active: true,
          personal: {
            firstName: `AT_C1259785_FirstName_${getRandomPostfix()}`,
            lastName: `AT_C1259785_LastName_${getRandomPostfix()}`,
            email: 'test@folio.org',
            preferredContactTypeIds: ['002'],
          },
          patronGroup: patronGroupId,
          type: 'staff',
          username: `at_c1259785_${getRandomPostfix()}`,
          tags: { tagList: [TAG] },
        }).then((userResp) => {
          testData.taggedUser = userResp;
        });
      });

      // Create non-tagged fund + transactions for Step 13 — runs after finance chain completes
      cy.then(() => {
        const nonTaggedFundDef = { ...Funds.getDefaultFund(), ledgerId: testData.ledger.id };
        Funds.createViaApi(nonTaggedFundDef).then((resp) => {
          testData.nonTaggedFund = resp.fund;
          Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            fiscalYearId: testData.fiscalYear.id,
            fundId: resp.fund.id,
            allocated: 100,
          }).then((budgetResp) => {
            testData.nonTaggedBudget = budgetResp;
            // Non-tagged allocation to non-tagged fund — returned by Step 13 query
            Transactions.createAllocationViaApi({
              amount: 100,
              fiscalYearId: testData.fiscalYear.id,
              toFundId: testData.nonTaggedFund.id,
            }).then((txId) => testData.transactionIds.push(txId));
            // Tagged allocation to non-tagged fund — NOT returned because transaction itself has TAG
            Transactions.createAllocationViaApi({
              amount: 50,
              fiscalYearId: testData.fiscalYear.id,
              toFundId: testData.nonTaggedFund.id,
              tags: { tagList: [TAG] },
            }).then((txId) => testData.transactionIds.push(txId));
            // Allocation to tagged fund — NOT returned because toFund has TAG
            Transactions.createAllocationViaApi({
              amount: 50,
              fiscalYearId: testData.fiscalYear.id,
              toFundId: testData.fund.id,
            }).then((txId) => testData.transactionIds.push(txId));
            // Allocation from tagged fund — NOT returned because fromFund has TAG
            Transactions.createAllocationViaApi({
              amount: 25,
              fiscalYearId: testData.fiscalYear.id,
              fromFundId: testData.fund.id,
              toFundId: testData.nonTaggedFund.id,
            }).then((txId) => testData.transactionIds.push(txId));

            // Create second tagged fund so we can have a transfer with TAG on all three fields
            const secondTaggedFundDef = {
              ...Funds.getDefaultFund(),
              ledgerId: testData.ledger.id,
              tags: { tagList: [TAG] },
            };
            Funds.createViaApi(secondTaggedFundDef).then((secondFundResp) => {
              testData.secondTaggedFund = secondFundResp.fund;
              Budgets.createViaApi({
                ...Budgets.getDefaultBudget(),
                fiscalYearId: testData.fiscalYear.id,
                fundId: secondFundResp.fund.id,
                allocated: 200,
              }).then((secondBudgetResp) => {
                testData.secondTaggedBudget = secondBudgetResp;
                // Transfer with TAG on transaction + fromFund + toFund — NOT returned by Step 13 "NOT IN" query
                Transactions.createAllocationViaApi({
                  amount: 30,
                  fiscalYearId: testData.fiscalYear.id,
                  fromFundId: testData.fund.id,
                  toFundId: testData.secondTaggedFund.id,
                  tags: { tagList: [TAG] },
                }).then((txId) => testData.transactionIds.push(txId));
              });
            });
          });
        });
      });

      cy.loginAsAdmin({ path: TopMenu.listsPath, waiter: Lists.waitLoading });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      if (testData.transactionIds.length) {
        Budgets.batchProcessTransactions({ idsOfTransactionsToDelete: testData.transactionIds });
      }
      if (testData.order.id) Orders.deleteOrderViaApi(testData.order.id);
      if (testData.nonTaggedOrder.id) Orders.deleteOrderViaApi(testData.nonTaggedOrder.id);
      if (testData.nonTaggedInvoice.id) Invoices.deleteInvoiceViaApi(testData.nonTaggedInvoice.id);
      if (testData.invoice.id) Invoices.deleteInvoiceViaApi(testData.invoice.id);
      if (testData.nonTaggedBudget.id) Budgets.deleteViaApi(testData.nonTaggedBudget.id);
      if (testData.nonTaggedFund.id) Funds.deleteFundViaApi(testData.nonTaggedFund.id);
      if (testData.secondTaggedBudget.id) Budgets.deleteViaApi(testData.secondTaggedBudget.id);
      if (testData.secondTaggedFund.id) Funds.deleteFundViaApi(testData.secondTaggedFund.id);
      if (testData.budget.id) Budgets.deleteViaApi(testData.budget.id);
      if (testData.fund.id) Funds.deleteFundViaApi(testData.fund.id);
      if (testData.ledger.id) Ledgers.deleteLedgerViaApi(testData.ledger.id);
      if (testData.fiscalYear.id) FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
      if (testData.organization.id) {
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      }
      if (testData.organization.id) {
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      }
      if (testData.nonTaggedOrganization.id) {
        Organizations.deleteOrganizationViaApi(testData.nonTaggedOrganization.id);
      }
      if (testData.taggedUser.id) Users.deleteViaApi(testData.taggedUser.id);
      if (testData.tagId) Organizations.deleteTagByIdViaApi(testData.tagId);
    });

    it(
      "C1259785 It's possible to run query by tags (athena)",
      { tags: ['extendedPath', 'athena', 'C1259785'] },
      () => {
        const currentDate = DateTools.getCurrentDate();

        // Step 1: Start new list for "Fund with ledger" and build first query
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.fundWithLedger);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Build query Fund — Tags in Urgent and test it
        QueryModal.typeInAndSelectField(FUND_WITH_LEDGER_FIELDS.FUND.TAGS);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN);
        QueryModal.fillInValueMultiselect(TAG);
        QueryModal.addNewRow(0);
        QueryModal.typeInAndSelectField(FUND_WITH_LEDGER_FIELDS.LEDGER.CREATED_DATE, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.pickDate(currentDate, 1);
        QueryModal.testQuery();

        // Step 3: Verify preview contains records and Fund — Tags column
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfMatchedRecords(2);
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.fund.name,
          FUND_WITH_LEDGER_FIELDS.FUND.TAGS,
          TAG,
        );

        // Step 4: Close QB and switch to Invoices
        QueryModal.clickCancel();
        QueryModal.verifyClosed();
        Lists.selectRecordType(Lists.recordTypes.invoices);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 5: Build query Invoice — Tags not in Urgent and test it
        QueryModal.typeInAndSelectField(INVOICES_FIELDS.INVOICE.TAGS);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
        QueryModal.fillInValueMultiselect(TAG);
        QueryModal.addNewRow(0);
        QueryModal.typeInAndSelectField(INVOICES_FIELDS.INVOICE.CREATED_DATE, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.pickDate(currentDate, 1);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyResultFound(testData.invoice.vendorInvoiceNo, { isFound: false });

        // Step 6: Close QB and switch to Invoice lines
        QueryModal.clickCancel();
        QueryModal.verifyClosed();
        Lists.selectRecordType(Lists.recordTypes.invoiceLines);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 7: Build query with Invoice lines — Tags and Invoice — Tags not in Urgent
        QueryModal.typeInAndSelectField(INVOICE_LINES_FIELDS.INVOICE_LINES.TAGS);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
        QueryModal.fillInValueMultiselect(TAG);
        QueryModal.addNewRow(0);
        QueryModal.typeInAndSelectField(INVOICES_FIELDS.INVOICE.TAGS, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 1);
        QueryModal.fillInValueMultiselect(TAG, 1);
        QueryModal.addNewRow(1);
        QueryModal.typeInAndSelectField(INVOICES_FIELDS.INVOICE.CREATED_DATE, 2);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
        QueryModal.pickDate(currentDate, 2);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyResultFound(testData.taggedInvoiceLine.description, { isFound: false });

        // Step 8: Close QB and switch to Purchase order lines
        QueryModal.clickCancel();
        QueryModal.verifyClosed();
        Lists.selectRecordType(Lists.recordTypes.purchaseOrderLines);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 9: Build query with POL, PO, and Vendor org Tags not in Urgent
        QueryModal.typeInAndSelectField(PURCHASE_ORDER_LINES_FIELDS.POL.TAGS);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
        QueryModal.fillInValueMultiselect(TAG);
        QueryModal.addNewRow(0);
        QueryModal.typeInAndSelectField(PURCHASE_ORDER_LINES_FIELDS.PO.TAGS, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 1);
        QueryModal.fillInValueMultiselect(TAG, 1);
        QueryModal.addNewRow(1);
        QueryModal.typeInAndSelectField(PURCHASE_ORDER_LINES_FIELDS.VENDOR_ORG.TAGS, 2);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 2);
        QueryModal.fillInValueMultiselect(TAG, 2);
        QueryModal.addNewRow(2);
        QueryModal.typeInAndSelectField(PURCHASE_ORDER_LINES_FIELDS.POL.CREATED_AT, 3);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 3);
        QueryModal.pickDate(currentDate, 3);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyResultFound(testData.orderLine.poLineNumber, { isFound: false });

        // Step 10: Close QB and switch to Users
        QueryModal.clickCancel();
        QueryModal.verifyClosed();
        Lists.selectRecordType(Lists.recordTypes.users);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 11: Build query User — Tags not in Urgent and test it
        QueryModal.typeInAndSelectField(USERS_FIELDS.USER.TAGS);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
        QueryModal.fillInValueMultiselect(TAG);
        QueryModal.addNewRow(0);
        QueryModal.typeInAndSelectField(USERS_FIELDS.USER.USER_CREATED_DATE, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.pickDate(currentDate, 1);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyResultFound(testData.taggedUser.username, { isFound: false });

        // Step 12: Close QB and switch to Transactions
        QueryModal.clickCancel();
        QueryModal.verifyClosed();
        Lists.selectRecordType(Lists.recordTypes.transactions);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 13: Build query with Transaction, To fund, and From fund Tags not in Urgent
        QueryModal.typeInAndSelectField(TRANSACTIONS_FIELDS.TRANSACTION.TAGS);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
        QueryModal.fillInValueMultiselect(TAG);
        QueryModal.addNewRow(0);
        QueryModal.typeInAndSelectField(TRANSACTIONS_FIELDS.TO_FUND.TAGS, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 1);
        QueryModal.fillInValueMultiselect(TAG, 1);
        QueryModal.addNewRow(1);
        QueryModal.typeInAndSelectField(TRANSACTIONS_FIELDS.FROM_FUND.TAGS, 2);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 2);
        QueryModal.fillInValueMultiselect(TAG, 2);
        QueryModal.addNewRow(2);
        QueryModal.typeInAndSelectField(TRANSACTIONS_FIELDS.TRANSACTION.CREATED_DATE, 3);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 3);
        QueryModal.pickDate(currentDate, 3);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyResultFound(testData.fund.name, { isFound: false });

        // Step 14: Close QB and switch to Organizations
        QueryModal.clickCancel();
        QueryModal.verifyClosed();
        Lists.selectRecordType(Lists.recordTypes.organizations);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 15: Build query Organization — Tags not in Urgent and test it
        QueryModal.typeInAndSelectField(ORGANIZATIONS_FIELDS.ORGANIZATION.TAGS);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
        QueryModal.fillInValueMultiselect(TAG);
        QueryModal.addNewRow(0);
        QueryModal.typeInAndSelectField(ORGANIZATIONS_FIELDS.ORGANIZATION.UPDATED_AT, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.pickDate(currentDate, 1);
        QueryModal.testQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyResultFound(testData.organization.name, { isFound: false });
      },
    );
  });
});
