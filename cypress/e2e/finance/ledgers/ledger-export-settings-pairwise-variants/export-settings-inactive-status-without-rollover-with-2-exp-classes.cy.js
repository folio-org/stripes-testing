import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import { Budgets, Funds, Ledgers } from '../../../../support/fragments/finance';
import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import ExpenseClasses from '../../../../support/fragments/settings/finance/expenseClasses';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';

describe('Finance: Ledgers', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const testData = {
    organization,
    user: {},
    expenseClass: {
      name: 'Electronic',
      code: 'Elec',
      status: 'Active',
      id: '',
    },
  };
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
    reEncumber: true,
    vendorId: testData.organization.id,
  };

  before('Setup test data', () => {
    cy.getAdminToken();
    ExpenseClasses.getExpenseClassesViaApi({
      query: `name=="${testData.expenseClass.name}"`,
      limit: 1,
    }).then((response) => {
      testData.expenseClass.id = response?.[0]?.id;

      const { fiscalYear, ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        ledger: { restrictEncumbrance: true, restrictExpenditures: true },
        budget: {
          allocated: 100,
          statusExpenseClasses: [
            {
              status: testData.expenseClass.status,
              expenseClassId: testData.expenseClass.id,
            },
          ],
        },
      });
      testData.fiscalYear = fiscalYear;
      testData.ledger = ledger;
      testData.fund = fund;
      testData.budget = budget;

      Organizations.createOrganizationViaApi(organization).then((orgResp) => {
        organization.id = orgResp;
        order.vendor = orgResp;

        cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((locationResp) => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
          }).then((amResp) => {
            cy.getBookMaterialType().then((mtypeResp) => {
              const orderLine = {
                ...BasicOrderLine.defaultOrderLine,
                cost: {
                  listUnitPrice: 25.0,
                  currency: 'USD',
                  discountType: 'percentage',
                  quantityPhysical: 1,
                  poLineEstimatedPrice: 25.0,
                },
                fundDistribution: [
                  {
                    code: testData.fund.code,
                    fundId: testData.fund.id,
                    expenseClassId: testData.expenseClass.id,
                    value: 100,
                  },
                ],
                locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
                acquisitionMethod: amResp.body.acquisitionMethods[0].id,
                physical: {
                  createInventory: 'Instance, Holding, Item',
                  materialType: mtypeResp.id,
                  materialSupplier: orgResp.id,
                  volumes: [],
                },
              };

              // Create first open order
              Orders.createOrderViaApi(order).then((orderResp) => {
                order.id = orderResp.id;
                orderLine.purchaseOrderId = orderResp.id;

                OrderLines.createOrderLineViaApi(orderLine);
                Orders.updateOrderViaApi({
                  ...orderResp,
                  workflowStatus: ORDER_STATUSES.OPEN,
                });
              });
            });
          });
        });
      });
      testData.fileName = `Export-${testData.ledger.code}-${fiscalYear.code}`;

      cy.loginAsAdmin();
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(testData.fund.name);
      Funds.selectFund(testData.fund.name);
      Funds.selectBudgetDetails();
      Funds.editBudget();
      Funds.changeStatusOfExpClassByName(testData.expenseClass.name, 'Inactive');
    });

    cy.createTempUser([
      Permissions.uiFinanceExportFinanceRecords.gui,
      Permissions.uiFinanceViewLedger.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitForLedgerDetailsLoading,
      });
    });
  });

  after('Clean up test data', () => {
    FileManager.deleteFile(`cypress/downloads/${testData.fileName}.csv`);
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C350978 Ledger export settings: current year Fund with budget, Economic (Inactive) Class, Export settings-Inactive status (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C350978'] },
    () => {
      FinanceHelp.searchByName(testData.ledger.name);
      Ledgers.selectLedger(testData.ledger.name);
      Ledgers.exportBudgetInformation();
      Ledgers.prepareExportSettings(testData.fiscalYear.code, 'Inactive', testData.ledger);
      Ledgers.checkColumnNamesInDownloadedLedgerExportFileWithExpClasses(
        `${testData.fileName}.csv`,
      );
      Ledgers.checkColumnContentInDownloadedLedgerExportFileWithExpClasses(
        `${testData.fileName}.csv`,
        testData.expenseClass.name,
        testData.fund,
        testData.budget.name,
        '100',
        '100',
        '100',
        '0',
        '0',
        '100',
        '0',
        '100',
        '25',
        '0',
        '0',
        '25',
        '0',
        '0',
        '100',
        '75',
        testData.expenseClass.code,
        'Inactive',
        '25',
        '0',
        '0',
      );
      Ledgers.deleteDownloadedFile(`${testData.fileName}.csv`);
    },
  );
});
