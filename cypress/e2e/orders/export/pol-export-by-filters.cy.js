import moment from 'moment';

import {
  COMMON_BUTTON_LABELS,
  DEFAULT_WAIT_TIME,
  INVOICE_STATUSES,
  ORDER_EXPORT_CSV_FIELDS,
  ORDER_LINE_EXPORT_CSV_FIELDS,
  ORDER_LINE_RESULTS_ACTIONS_LABELS,
  ORDER_LINE_RESULTS_LIST_COLUMNS,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { Budgets } from '../../../support/fragments/finance';
import { Invoices } from '../../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderHelper,
  OrderLines,
  Orders,
} from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import { AcquisitionMethods, OrderLinesLimit } from '../../../support/fragments/settings/orders';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../support/utils';
import {
  getOrderLineExportFundDistributionFieldValue,
  getOrderLineExportLocationFieldValue,
} from '../../../support/utils/acquisitions';
import FileManager from '../../../support/utils/fileManager';

const R = {
  ACQUISITION_METHOD: 'acquisitionMethod',
  BUDGET: 'budget',
  FISCAL_YEAR: 'fiscalYear',
  FUND: 'fund',
  INVOICE: 'invoice',
  LEDGER: 'ledger',
  LINES_LIMITS: 'linesLimits',
  LOCALE: 'locale',
  LOCATION: 'location',
  MATERIAL_TYPE: 'materialType',
  ORDER: 'order',
  ORDER_LINE_MAP: 'orderLineMap',
  ORGANIZATION: 'organization',
  SERVICE_POINT: 'servicePoint',
  USER: 'user',
};

const LINES_LIMIT = 5;

describe('Orders', () => {
  describe('Export', () => {
    const flow = new ExecutionFlowManager();
    const fileName = `order-export-${moment().format('YYYY-MM-DD')}-*.csv`;

    before('Create C196751 preconditions', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));
      const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

      flow
        .step(steps.createBudgetFundLedgerFiscalYear)
        .step(steps.fetchServicesPoint)
        .step(steps.createLocation)
        .step(steps.createMaterialType)
        .step(steps.createAcquisitionMethod)
        .step(steps.createOrganization)
        .step(steps.setLinesLimitSettings)
        .step(steps.createOrder)
        .step(steps.createOrderLines)
        .step(steps.openOrder)
        .step(steps.createAndPayInvoice)
        .step(steps.createAuthorizedUser)
        .step(steps.loginAsAuthorizedUser);
    });

    after('Delete C196751 data (what can be deleted)', () => {
      cy.getAdminToken();
      FileManager.deleteFilesFromDownloadsByMask(fileName);
      flow.cleanup();
    });

    it(
      'C196751 Export orders based on orders lines search (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C196751'] },
      () => {
        const { acquisitionMethod, fund, location, organization, order, orderLineMap } = flow.ctx();

        const { EXPORT_CSV } = ORDER_LINE_RESULTS_ACTIONS_LABELS;

        const orderLines = Array.from(orderLineMap.values());

        OrderHelper.interceptGetOrderLines();

        const locationMap = new Map([[location.id, location]]);
        const holdingMap = new Map(
          orderLines.flatMap((line) => line.locations.filter((l) => l.holdingId).map((loc) => [loc.holdingId, loc])),
        );

        const waitForOrderLinesLoading = () => {
          OrderHelper.waitForOrderLinesQueryCompleted();
          OrderLines.waitResultsListLoading();
        };

        const performExportAndCheckFile = (filterFn, expectedOrderLines) => {
          filterFn();
          waitForOrderLinesLoading();
          OrderLines.assertResultsCount(expectedOrderLines.length);
          cy.wait(DEFAULT_WAIT_TIME);
          Orders.exportResultsToCsv();

          const content = expectedOrderLines.map((line) => ({
            [ORDER_EXPORT_CSV_FIELDS.PO_NUMBER]: Number(order.poNumber),
            [ORDER_EXPORT_CSV_FIELDS.VENDOR]: organization.code,
            [ORDER_EXPORT_CSV_FIELDS.APPROVED]: order.approved,
            [ORDER_LINE_EXPORT_CSV_FIELDS.TITLE_OR_PACKAGE]: line.titleOrPackage,
            [ORDER_LINE_EXPORT_CSV_FIELDS.PO_LINE_NUMBER]: line.poLineNumber,
            [ORDER_LINE_EXPORT_CSV_FIELDS.ACQUISITION_METHOD]: acquisitionMethod.value,
            [ORDER_LINE_EXPORT_CSV_FIELDS.FUND_DISTRIBUTION]:
              getOrderLineExportFundDistributionFieldValue(line),
            [ORDER_LINE_EXPORT_CSV_FIELDS.LOCATION]: getOrderLineExportLocationFieldValue(
              line,
              locationMap,
              holdingMap,
            ),
            [ORDER_LINE_EXPORT_CSV_FIELDS.RUSH]: line.rush,
          }));

          OrderLines.checkDownloadedFile({ content });
        };

        OrderLines.resetFiltersIfActive();
        OrderLines.verifyNoResultsMessage();
        OrderLines.assertResultsActionIsDisabled(EXPORT_CSV);

        // Filter by location and check that export contains only order lines with that location
        performExportAndCheckFile(() => {
          OrderLines.selectLocationInFilters(location.name);
          waitForOrderLinesLoading();
          OrderLines.assertResultsActionIsDisabled(EXPORT_CSV, false);
          OrderLines.sortOrderLinesBy(ORDER_LINE_RESULTS_LIST_COLUMNS.PO_LINE_NUMBER);
        }, orderLines);

        // Filter by fund code and check that export contains only order lines with that fund code
        performExportAndCheckFile(
          () => OrderLines.filterByFundCodes([fund.code]),
          [orderLines[0], orderLines[2], orderLines[4]],
        );

        // Filter by rush and check that export contains only order lines with that rush value
        performExportAndCheckFile(
          () => OrderLines.filterByRush([COMMON_BUTTON_LABELS.YES]),
          [orderLines[4]],
        );
      },
    );
  });
});

function getPreconditionSteps() {
  const createBudgetFundLedgerFiscalYear = (flow) => {
    const { fiscalYear, ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi();

    flow.set(R.FISCAL_YEAR, fiscalYear);
    flow.set(R.LEDGER, ledger);
    flow.set(R.FUND, fund);
    flow.set(R.BUDGET, budget);
  };

  const fetchServicesPoint = (flow) => {
    return ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => flow.set(R.SERVICE_POINT, servicePoints[0]));
  };

  const createLocation = (flow) => {
    const { location } = Locations.getDefaultLocation({
      servicePointId: flow.get(R.SERVICE_POINT).id,
    });

    return Locations.createViaApi(location).then((data) => flow.set(R.LOCATION, data));
  };

  const createMaterialType = (flow) => {
    return MaterialTypes.createMaterialTypeViaApi({
      name: `autotest_material_type_${Date.now()}`,
    }).then(({ body }) => flow.set(R.MATERIAL_TYPE, body));
  };

  const createAcquisitionMethod = (flow) => {
    return AcquisitionMethods.createNewAcquisitionMethodViaAPI({
      value: AcquisitionMethods.defaultAcquisitionMethod.value,
    }).then((acqMethod) => flow.set(R.ACQUISITION_METHOD, acqMethod));
  };

  const createOrganization = (flow) => {
    const organization = { ...NewOrganization.getDefaultOrganization() };

    return Organizations.createOrganizationViaApi(organization).then((organizationId) => flow.set(R.ORGANIZATION, { ...organization, id: organizationId }, () => Organizations.deleteOrganizationViaApi(organizationId)));
  };

  const setLinesLimitSettings = (flow) => {
    return OrderLinesLimit.getPOLLimit()
      .then((settings) => {
        const value = settings?.[0]?.value || 1;

        return flow.set(R.LINES_LIMITS, { initial: value, current: LINES_LIMIT }, () => OrderLinesLimit.setPOLLimitViaApi(value));
      })
      .then(() => OrderLinesLimit.setPOLLimitViaApi(LINES_LIMIT));
  };

  const createOrder = (flow) => {
    const order = {
      ...NewOrder.getDefaultOngoingOrder({ vendorId: flow.get(R.ORGANIZATION).id }),
      approved: true,
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((entity) => flow.set(R.ORDER, entity));
  };

  const createOrderLines = (flow) => {
    Array.from({ length: LINES_LIMIT }).forEach((_, i) => {
      OrderLines.createOrderLineViaApi({
        ...BasicOrderLine.getDefaultOrderLine(),
        fundDistribution:
          i % 2 === 0
            ? [{ code: flow.get(R.FUND).code, fundId: flow.get(R.FUND).id, value: 100 }]
            : [],
        locations: [{ locationId: flow.get(R.LOCATION).id, quantity: 1, quantityPhysical: 1 }],
        acquisitionMethod: flow.get(R.ACQUISITION_METHOD).id,
        purchaseOrderId: flow.get(R.ORDER).id,
        rush: i === LINES_LIMIT - 1,
        physical: {
          createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
          materialType: flow.get(R.MATERIAL_TYPE).id,
          materialSupplier: flow.get(R.ORGANIZATION).id,
          volumes: [],
        },
      }).then((entity) => flow.set(
        R.ORDER_LINE_MAP,
        (flow.get(R.ORDER_LINE_MAP) || new Map()).set(entity.id, entity),
      ));
    });
  };

  const openOrder = (flow) => {
    return Orders.updateOrderViaApi({
      ...flow.get(R.ORDER),
      workflowStatus: ORDER_STATUSES.OPEN,
    });
  };

  const createAndPayInvoice = (flow) => {
    const organization = flow.get(R.ORGANIZATION);
    const orderLine = Array.from(flow.get(R.ORDER_LINE_MAP).values())[0];
    const fiscalYear = flow.get(R.FISCAL_YEAR);

    return Invoices.createInvoiceWithInvoiceLineViaApi({
      vendorId: organization.id,
      fiscalYearId: fiscalYear.id,
      poLineId: orderLine.id,
      fundDistributions: orderLine.fundDistribution,
      accountingCode: organization.erpCode,
      releaseEncumbrance: true,
      subTotal: 40,
    }).then((invoice) => {
      flow.set(R.INVOICE, invoice);

      return Invoices.changeInvoiceStatusViaApi({
        invoice,
        status: INVOICE_STATUSES.PAID,
      });
    });
  };

  const createAuthorizedUser = (flow) => {
    return cy
      .createTempUser([Permissions.uiExportOrders.gui, Permissions.uiOrdersView.gui])
      .then((user) => flow.set(R.USER, user, (entity) => Users.deleteViaApi(entity.userId)));
  };

  const loginAsAuthorizedUser = (flow) => {
    const user = flow.get(R.USER);

    return cy.login(user.username, user.password, {
      path: TopMenu.orderLinesPath,
      waiter: OrderLines.waitLoading,
    });
  };

  return {
    createBudgetFundLedgerFiscalYear,
    createLocation,
    createMaterialType,
    createAcquisitionMethod,
    setLinesLimitSettings,
    createOrganization,
    createOrder,
    createOrderLines,
    openOrder,
    createAndPayInvoice,
    createAuthorizedUser,
    fetchServicesPoint,
    loginAsAuthorizedUser,
  };
}
