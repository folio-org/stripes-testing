import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  purchaseOrderLinesFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';

const listName = `AT_C451493_List_${getRandomPostfix()}`;
const date = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
const firstBudget = {
  ...Budgets.getDefaultBudget(),
  allocated: 100,
};
const fund = { ...Funds.defaultUiFund };
const ledger = { ...Ledgers.defaultUiLedger };
const testData = {
  title: `AT_C451493_OrderLine_${getRandomPostfix()}`,
  organization: {},
  order: {},
  orderLine: {},
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.getAdminToken();
      FiscalYears.createViaApi(fiscalYear)
        .then((fiscalYearResponse) => {
          fiscalYear.id = fiscalYearResponse.id;
          firstBudget.fiscalYearId = fiscalYearResponse.id;
          ledger.fiscalYearOneId = fiscalYear.id;

          Ledgers.createViaApi(ledger).then((ledgerResponse) => {
            ledger.id = ledgerResponse.id;
            fund.ledgerId = ledger.id;

            Funds.createViaApi(fund).then((fundResponse) => {
              fund.id = fundResponse.fund.id;
              firstBudget.fundId = fundResponse.fund.id;

              Budgets.createViaApi(firstBudget).then((budget) => {
                firstBudget.id = budget.id;
              });
            });
          });
        })
        .then(() => {
          cy.getAcquisitionMethodsApi({ query: 'value="Purchase"' }).then(
            (acquisitionMethodResponse) => {
              testData.acquisitionMethodId =
                acquisitionMethodResponse.body.acquisitionMethods[0].id;

              Organizations.createOrganizationViaApi(NewOrganization.getDefaultOrganization()).then(
                (organizationResponse) => {
                  testData.organization.id = organizationResponse;

                  const order = {
                    ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                    orderType: 'One-Time',
                    approved: false,
                    reEncumber: true,
                  };

                  Orders.createOrderViaApi(order).then((orderResponse) => {
                    testData.order = orderResponse;

                    // Create order line (will have default 'Pending' payment status)
                    const orderLine = BasicOrderLine.getDefaultOrderLine({
                      title: testData.title,
                      purchaseOrderId: orderResponse.id,
                      listUnitPrice: 50.0,
                      acquisitionMethod: testData.acquisitionMethodId,
                      fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
                    });

                    OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                      testData.orderLine = orderLineResponse;
                    });
                  });
                },
              );
            },
          );
        });

      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
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
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.deleteViaApi(firstBudget.id);
      Funds.deleteFundViaApi(fund.id);
      Ledgers.deleteLedgerViaApi(ledger.id);
      FiscalYears.deleteFiscalYearViaApi(fiscalYear.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C451493 [POL] Verify that array type fields are not shown in the Query Builder (corsair)',
      { tags: ['criticalPath', 'corsair', 'C451493'] },
      () => {
        // Step 1: Create new list with Purchase order lines record type and build query
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.purchaseOrderLines);
        Lists.buildQuery();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Click "Select field" dropdown in the "Field" column => search for the field 'Fund distribution type'
        QueryModal.filterFieldSelectionList('Fund distribution type');
        QueryModal.verifyFieldOptionAbsentInTheList();

        // Step 3: Search for the field 'Fund distribution codes'
        QueryModal.filterFieldSelectionList('Fund distribution codes');
        QueryModal.verifyFieldOptionAbsentInTheList();

        // Step 4: Search for the field 'Fund distribution values'
        QueryModal.filterFieldSelectionList('Fund distribution values');
        QueryModal.verifyFieldOptionAbsentInTheList();

        // Step 5: Search for the field 'Fund distribution encumbrances'
        QueryModal.filterFieldSelectionList('Fund distribution encumbrances');
        QueryModal.verifyFieldOptionAbsentInTheList();

        // Step 6: Search for the field 'PO note list'
        QueryModal.filterFieldSelectionList('PO note list');
        QueryModal.verifyFieldOptionAbsentInTheList();

        // Step 7: Search for a field that should return query results, such as 'POL — Created at'
        QueryModal.typeInAndSelectField(purchaseOrderLinesFieldValues.createdAt);
        QueryModal.selectOperator(QUERY_OPERATIONS.LESS_THAN_OR_EQUAL_TO);
        QueryModal.fillInValueTextfield(date);

        QueryModal.addNewRow();
        QueryModal.typeInAndSelectField(purchaseOrderLinesFieldValues.title, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(testData.title, 1);
        QueryModal.testQuery();

        // Step 8: Click on the 'Show columns' button
        QueryModal.clickShowColumnsButton();
        QueryModal.clickCheckboxInShowColumns('POL — Fund distribution');
        QueryModal.verifyPOLFundDistributionEmbeddedTableInQueryModal(testData.orderLine.id, {
          code: fund.code,
          encumbranceUUID: '',
          fund: fund.id,
          expenseClass: '',
          distributionType: 'percentage',
          value: '100',
        });
      },
    );
  });
});
