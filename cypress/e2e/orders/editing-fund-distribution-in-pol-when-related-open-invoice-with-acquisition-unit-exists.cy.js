import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';
import { TransactionDetails } from '../../support/fragments/finance';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  INVOICE_STATUSES,
  APPLICATION_NAMES,
} from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    funds: {
      fundA: {},
      fundB: {},
    },
    budgets: {
      fundA: {},
      fundB: {},
    },
    organization: {},
    order: {},
    orderLine: {},
    invoice: {
      invoiceDate: DateTools.getFormattedDate({ date: new Date() }),
      batchGroupName: 'FOLIO',
      vendorInvoiceNo: getRandomPostfix(),
      paymentMethod: 'Cash',
    },
    acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit({
      protectCreate: true,
      protectEdit: true,
      protectDelete: true,
    }),
    user: {},
    location: {},
  };

  const createFundWithBudget = (ledgerId, fiscalYearId) => {
    const fund = {
      ...Funds.getDefaultFund(),
      ledgerId,
    };

    return Funds.createViaApi(fund).then((fundResponse) => {
      const budget = {
        ...Budgets.getDefaultBudget(),
        fiscalYearId,
        fundId: fundResponse.fund.id,
        allocated: 1000,
      };

      return Budgets.createViaApi(budget).then((budgetResponse) => {
        return { fund: fundResponse.fund, budget: budgetResponse };
      });
    });
  };

  const createOrderLine = (purchaseOrderId, locationId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      id: uuid(),
      purchaseOrderId,
      cost: {
        listUnitPrice: 100.0,
        currency: 'USD',
        discountType: 'percentage',
        quantityPhysical: 1,
        poLineEstimatedPrice: 100.0,
      },
      fundDistribution: [
        {
          code: testData.funds.fundA.code,
          fundId: testData.funds.fundA.id,
          distributionType: 'percentage',
          value: 100,
        },
      ],
      locations: [
        {
          locationId,
          quantity: 1,
          quantityPhysical: 1,
        },
      ],
      acquisitionMethod: acquisitionMethodId,
      physical: {
        createInventory: 'Instance, Holding, Item',
        materialType: materialTypeId,
        materialSupplier: testData.organization.id,
        volumes: [],
      },
    };
  };

  const createOrderWithLine = (locationId, materialTypeId, acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: 'One-Time',
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine = createOrderLine(
        orderResponse.id,
        locationId,
        materialTypeId,
        acquisitionMethodId,
      );

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      });
    });
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

        return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id).then((fundAData) => {
          testData.funds.fundA = fundAData.fund;
          testData.budgets.fundA = fundAData.budget;

          return createFundWithBudget(ledgerResponse.id, fiscalYearResponse.id).then(
            (fundBData) => {
              testData.funds.fundB = fundBData.fund;
              testData.budgets.fundB = fundBData.budget;
            },
          );
        });
      });
    });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
      exportToAccounting: false,
    }).then((organizationResponse) => {
      testData.organization = {
        id: organizationResponse,
        erpCode: NewOrganization.defaultUiOrganizations.erpCode,
      };

      return ServicePoints.getViaApi().then((servicePoint) => {
        return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
          (locationResponse) => {
            testData.location = locationResponse;

            return cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
              return cy
                .getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
                })
                .then((acquisitionMethod) => {
                  return createOrderWithLine(
                    locationResponse.id,
                    materialType.id,
                    acquisitionMethod.body.acquisitionMethods[0].id,
                  );
                });
            });
          },
        );
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then(() => {
        cy.getAdminUserDetails().then((adminUser) => {
          testData.adminUserId = adminUser.id;
          AcquisitionUnits.assignUserViaApi(adminUser.id, testData.acqUnit.id).then((id) => {
            testData.membershipAdminId = id;
          });
        });
      });
    });

    return createFinanceData().then(() => {
      return createOrderData().then(() => {
        cy.createTempUser([
          permissions.uiFinanceViewFundAndBudget.gui,
          permissions.assignAcqUnitsToNewInvoice.gui,
          permissions.viewEditCreateInvoiceInvoiceLine.gui,
          permissions.uiInvoicesManageAcquisitionUnits.gui,
          permissions.uiOrdersEdit.gui,
          permissions.uiSettingsAcquisitionUnitsManageAcqUnitUserAssignments.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          AcquisitionUnits.assignUserViaApi(userProperties.userId, testData.acqUnit.id).then(
            (id) => {
              testData.membershipUserId = id;
            },
          );

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      AcquisitionUnits.unAssignUserViaApi(testData.membershipAdminId);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id);
    });
  });

  it(
    'C451625 Editing fund distribution in PO line when related Open invoice (with acquisition unit) exists (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C451625'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.createNewInvoice();
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
        batchGroupName: testData.invoice.batchGroupName,
        vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
        paymentMethod: testData.invoice.paymentMethod,
        acqUnits: [testData.acqUnit.name],
      });
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
      });
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Acquisition units');
      AcquisitionUnits.selectAU(testData.acqUnit.name);
      AcquisitionUnits.unAssignUser(testData.user.username, testData.acqUnit.name);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.openOrderLineEditForm();
      OrderLines.changeFundInPOLWithoutSaveInPercents(0, testData.funds.fundB, '100');
      OrderLines.saveOrderLine();
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.funds.fundB.name,
          expenseClass: '-',
          value: '100%',
          amount: '$100.00',
          initialEncumbrance: '$100.00',
          currentEncumbrance: '$100.00',
        },
      ]);
      OrderLineDetails.openEncumbrancePane(testData.funds.fundB.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$100.00' },
          { key: 'Source', value: testData.orderLine.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.funds.fundB.name} (${testData.funds.fundB.code})` },
          { key: 'Initial encumbrance', value: '$100.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Acquisition units');
      AcquisitionUnits.selectAU(testData.acqUnit.name);
      AcquisitionUnits.assignUser(testData.user.username);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.selectInvoiceLine();
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.funds.fundA.name,
          expenseClass: '-',
          value: '100%',
          amount: '$100.00',
          initialEncumbrance: '-',
          currentEncumbrance: '-',
        },
      ]);
    },
  );
});
