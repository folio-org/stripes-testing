import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import { Budgets } from '../../../support/fragments/finance';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../../support/fragments/invoices/invoices';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import QueryModal, {
  transactionFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const recordType = 'Transactions';
const listName = `AT_C740220_List_${getRandomPostfix()}`;
const testData = {
  queryValue: '100',
  fiscalYear: {},
  ledger: {},
  fund: {},
  budget: {},
  organization: {},
  firstOrder: {},
  firstOrderLine: {},
  secondOrder: {},
  secondOrderLine: {},
  invoice: {},
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test user and login', () => {
      cy.getAdminToken();

      // Create finance structure: fiscal year, ledger, fund, budget
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

      // Create organization
      Organizations.createOrganizationViaApi({
        ...NewOrganization.defaultUiOrganizations,
        isVendor: true,
      }).then((organizationResponse) => {
        testData.organization = {
          id: organizationResponse,
          ...NewOrganization.defaultUiOrganizations,
        };

        // Create first order - this will create transaction WITHOUT encumbrance amount credited
        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
        }).then((acquisitionMethod) => {
          cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
            cy.getLocations({ limit: 1 }).then((location) => {
              const firstOrder = {
                ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                orderType: 'One-Time',
                reEncumber: true,
              };

              const firstOrderLine = BasicOrderLine.getDefaultOrderLine({
                listUnitPrice: 50,
                poLineEstimatedPrice: 50,
                fundDistribution: [
                  {
                    code: testData.fund.code,
                    fundId: testData.fund.id,
                    distributionType: 'percentage',
                    value: 100,
                  },
                ],
                specialLocationId: location.id,
                specialMaterialTypeId: materialType.id,
                acquisitionMethod: acquisitionMethod.body.acquisitionMethods[0].id,
              });

              Orders.createOrderViaApi(firstOrder).then((orderResponse) => {
                testData.firstOrder = orderResponse;
                firstOrderLine.purchaseOrderId = orderResponse.id;

                OrderLines.createOrderLineViaApi(firstOrderLine).then((orderLineResponse) => {
                  testData.firstOrderLine = orderLineResponse;

                  // Open first order to create encumbrance transaction without amount credited
                  Orders.updateOrderViaApi({
                    ...orderResponse,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  });
                });
              });

              // Create second order and invoice - this will create transaction WITH encumbrance amount credited
              const secondOrder = {
                ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                orderType: 'One-Time',
                reEncumber: true,
              };

              const secondOrderLine = BasicOrderLine.getDefaultOrderLine({
                listUnitPrice: testData.queryValue,
                poLineEstimatedPrice: testData.queryValue,
                fundDistribution: [
                  {
                    code: testData.fund.code,
                    fundId: testData.fund.id,
                    distributionType: 'percentage',
                    value: 100,
                  },
                ],
                specialLocationId: location.id,
                specialMaterialTypeId: materialType.id,
                acquisitionMethod: acquisitionMethod.body.acquisitionMethods[0].id,
              });

              Orders.createOrderViaApi(secondOrder).then((orderResponse) => {
                testData.secondOrder = orderResponse;
                secondOrderLine.purchaseOrderId = orderResponse.id;

                OrderLines.createOrderLineViaApi(secondOrderLine).then((orderLineResponse) => {
                  testData.secondOrderLine = orderLineResponse;

                  // Open second order
                  Orders.updateOrderViaApi({
                    ...orderResponse,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  }).then(() => {
                    // Create and approve invoice to credit the encumbrance
                    Invoices.createInvoiceWithInvoiceLineViaApi({
                      vendorId: testData.organization.id,
                      fiscalYearId: testData.fiscalYear.id,
                      poLineId: testData.secondOrderLine.id,
                      fundDistributions: testData.secondOrderLine.fundDistribution,
                      accountingCode: testData.organization.erpCode,
                      releaseEncumbrance: true,
                      subTotal: testData.queryValue,
                    }).then((invoiceResponse) => {
                      testData.invoice = invoiceResponse;

                      // Approve invoice to create encumbrance amount credited
                      Invoices.changeInvoiceStatusViaApi({
                        invoice: invoiceResponse,
                        status: INVOICE_STATUSES.APPROVED,
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });

      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(testData.firstOrder.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      "C740220 Null/Empty values are returned with the 'not equal to' operator for the integer types (corsair)",
      { tags: ['extendedPath', 'corsair', 'C740220'] },
      () => {
        // Step 1: Create new list and open query builder
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(recordType);
        Lists.buildQuery();
        QueryModal.verify();

        // Step 2: Configure query with "not equal to" operator for Transaction — Encumbrance amount credited
        QueryModal.selectField(transactionFieldValues.encumbranceAmountCredited);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
        QueryModal.fillInValueTextfield(testData.queryValue);

        // Add filter to isolate only test transactions by fund name
        QueryModal.addNewRow();
        QueryModal.selectField(transactionFieldValues.fromFundName, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(testData.fund.name, 1);
        QueryModal.testQuery();

        // Verify test query executes and completes
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(false);

        // Step 3: Verify "Transaction — Encumbrance amount credited" column is displayed in preview
        QueryModal.verifyColumnDisplayed(transactionFieldValues.encumbranceAmountCredited);
        QueryModal.verifyMatchedRecordsIncludesByIdentifier(
          'Pending payment',
          transactionFieldValues.encumbranceAmountCredited,
          '',
        );
      },
    );
  });
});
