import uuid from 'uuid';
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
  const organization = { ...NewOrganization.defaultUiOrganizations, isVendor: true };
  const testData = {
    organization,
    user: {},
    expenseClass1: {
      name: 'Electronic',
      code: 'Elec',
      status: 'Active',
      id: '',
    },
    expenseClass2: {
      name: 'Print',
      code: 'Prn',
      status: 'Active',
      id: '',
    },
  };
  const firstOrder = {
    ...NewOrder.defaultOneTimeOrder,
    id: uuid(),
    approved: true,
    reEncumber: true,
    vendorId: testData.organization.id,
  };
  const secondOrder = {
    ...NewOrder.defaultOneTimeOrder,
    id: uuid(),
    approved: true,
    reEncumber: true,
    vendorId: testData.organization.id,
  };

  before('Setup test data', () => {
    cy.getAdminToken();
    ExpenseClasses.getExpenseClassesViaApi({
      query: `name=="${testData.expenseClass1.name}"`,
      limit: 1,
    }).then((resp1) => {
      testData.expenseClass1.id = resp1?.[0]?.id;

      ExpenseClasses.getExpenseClassesViaApi({
        query: `name=="${testData.expenseClass2.name}"`,
        limit: 1,
      }).then((resp2) => {
        testData.expenseClass2.id = resp2?.[0]?.id;

        const { fiscalYear, ledger, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
          ledger: { restrictEncumbrance: true, restrictExpenditures: true },
          budget: {
            allocated: 100,
            statusExpenseClasses: [
              {
                status: testData.expenseClass1.status,
                expenseClassId: testData.expenseClass1.id,
              },
              {
                status: testData.expenseClass2.status,
                expenseClassId: testData.expenseClass2.id,
              },
            ],
          },
        });
        testData.fiscalYear = fiscalYear;
        testData.ledger = ledger;
        testData.fund = fund;

        Organizations.createOrganizationViaApi(organization).then((orgResp) => {
          organization.id = orgResp;
          firstOrder.vendor = orgResp;
          secondOrder.vendor = orgResp;

          cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((locationResp) => {
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((amResp) => {
              cy.getBookMaterialType().then((mtypeResp) => {
                const firstOrderLine = {
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
                      expenseClassId: testData.expenseClass1.id,
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
                Orders.createOrderViaApi(firstOrder).then((orderResp) => {
                  firstOrder.id = orderResp.id;
                  firstOrder.poNumber = orderResp.poNumber;
                  firstOrderLine.purchaseOrderId = orderResp.id;

                  OrderLines.createOrderLineViaApi(firstOrderLine);
                  Orders.updateOrderViaApi({
                    ...orderResp,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  });
                });

                const secondOrderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  id: uuid(),
                  cost: {
                    listUnitPrice: 20.0,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                    poLineEstimatedPrice: 20.0,
                  },
                  fundDistribution: [
                    {
                      code: testData.fund.code,
                      fundId: testData.fund.id,
                      expenseClassId: testData.expenseClass2.id,
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
                // Create second open order
                Orders.createOrderViaApi(secondOrder).then((orderResp) => {
                  secondOrder.id = orderResp.id;
                  secondOrder.poNumber = orderResp.poNumber;
                  secondOrderLine.purchaseOrderId = orderResp.id;

                  OrderLines.createOrderLineViaApi(secondOrderLine);
                  Orders.updateOrderViaApi({
                    ...orderResp,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  });
                });
              });
            });
          });
        });
        cy.loginAsAdmin();
        cy.visit(TopMenu.fundPath);
        FinanceHelp.searchByName(testData.fund.name);
        Funds.selectFund(testData.fund.name);
        Funds.selectBudgetDetails();
        Funds.editBudget();
        Funds.changeStatusOfExpClassByName(testData.expenseClass2.name, 'Inactive');
      });
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
    'C353211 Ledger export settings: current year Fund with budget, Print (Active) and Economic (Inactive) Classes, Export settings: No fiscal year, Each class status (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C353211'] },
    () => {
      FinanceHelp.searchByName(testData.ledger.name);
      Ledgers.selectLedger(testData.ledger.name);
      Ledgers.exportBudgetInformation();
      Ledgers.checkPreparationExportSettings();
    },
  );
});
