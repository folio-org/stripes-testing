import {
  DEFAULT_WAIT_TIME,
  EXPENSE_CLASS_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../constants';
import { Permissions } from '../../dictionary';
import { chunk } from '../../utils/acquisitions';
import getRandomPostfix, { getTestEntityValue } from '../../utils/stringTools';
import { Budgets, FiscalYears, Funds, Ledgers } from '../finance';
import { InvoiceLineDetails, Invoices } from '../invoices';
import { NewOrganization, Organizations } from '../organizations';
import { AcquisitionUnits } from '../settings/acquisitionUnits';
import { ExpenseClasses } from '../settings/finance';
import ContributorTypes from '../settings/inventory/instances/contributorTypes';
import IdentifierTypes from '../settings/inventory/instances/resourceIdentifierTypes';
import MaterialTypes from '../settings/inventory/materialTypes';
import { AcquisitionMethods, OrderLinesLimit } from '../settings/orders';
import { Locations, ServicePoints } from '../settings/tenant';
import { Addresses } from '../settings/tenant/general';
import TopMenu from '../topMenu';
import Users from '../users/users';
import SettingsOrganizations from '../settings/organizations/settingsOrganizations';
import BasicOrderLine from './basicOrderLine';
import NewOrder from './newOrder';
import OrderLines from './orderLines';
import Orders from './orders';

const RESOURCE_KEYS = {
  ACQUISITION_METHODS_MAP: 'acquisitionMethodsMap',
  ACQUISITION_UNITS_MAP: 'acquisitionUnitsMap',
  ADDRESSES_MAP: 'addressesMap',
  ADMIN: 'admin',
  BUDGETS_MAP: 'budgetsMap',
  CONTRIBUTOR_TYPES_MAP: 'contributorTypesMap',
  EXPENSE_CLASSES_MAP: 'expenseClassesMap',
  FISCAL_YEAR: 'fiscalYear',
  FUNDS_MAP: 'fundsMap',
  HOLDINGS_MAP: 'holdingsMap',
  IDENTIFIER_TYPES_MAP: 'identifierTypesMap',
  INVOICES_MAP: 'invoicesMap',
  LEDGER: 'ledger',
  LINES_LIMITS: 'linesLimits',
  LOCALE: 'locale',
  LOCATIONS_MAP: 'locationsMap',
  MATERIAL_TYPES_MAP: 'materialTypesMap',
  ORDERS_MAP: 'ordersMap',
  ORDER_LINES_MAP: 'orderLinesMap',
  ORGANIZATION: 'organization',
  ORGANIZATION_TYPES_MAP: 'organizationTypesMap',
  SERVICE_POINT: 'servicePoint',
  USER: 'user',
};

const REFERENCE_ENTITIES_COUNT = 2;
const LINES_LIMIT = 5;
const LINE_ESTIMATED_PRICE = 100;

const isEven = (num) => num % 2 === 0;

const getOrCreateMap = (flow, key) => flow.get(key) || new Map();

const setMapEntry = (flow, key, id, value, cleanup) => {
  const currentMap = getOrCreateMap(flow, key);
  flow.set(key, currentMap.set(id, value), cleanup);
};

const getMapValues = (flow, key) => Array.from(getOrCreateMap(flow, key).values());

const getMapKeys = (flow, key) => Array.from(getOrCreateMap(flow, key).keys());

const repeat = (count, callback) => {
  Array.from({ length: count }).forEach((_, index) => callback(index));
};

const buildFundDistribution = (flow) => {
  const funds = getMapValues(flow, RESOURCE_KEYS.FUNDS_MAP);

  return funds.map((fund, _i) => ({
    code: fund.code,
    fundId: fund.id,
    value: isEven(_i) ? LINE_ESTIMATED_PRICE / funds.length : 100 / funds.length,
    distributionType: isEven(_i)
      ? FUND_DISTRIBUTION_TYPES.AMOUNT
      : FUND_DISTRIBUTION_TYPES.PERCENTAGE,
  }));
};

function getExecutionSteps({
  referencesCount = REFERENCE_ENTITIES_COUNT,
  linesLimit = LINES_LIMIT,
  payInvoices = true,
}) {
  const getAdminUserDetails = (flow) => {
    return cy.getAdminUserDetails().then((adminUserDetails) => {
      flow.set(RESOURCE_KEYS.ADMIN, adminUserDetails);
    });
  };

  const createAcquisitionUnitForIndex = (flow, index) => {
    const cleanup = (membershipId, acquisitionUnitId) => {
      AcquisitionUnits.unAssignUserViaApi(membershipId).then(() => AcquisitionUnits.deleteAcquisitionUnitViaApi(acquisitionUnitId, false));
    };

    return AcquisitionUnits.createAcquisitionUnitViaApi(
      AcquisitionUnits.getDefaultAcquisitionUnit(),
    )
      .then((acqUnit) => setMapEntry(flow, RESOURCE_KEYS.ACQUISITION_UNITS_MAP, acqUnit.id, acqUnit))
      .then(() => {
        const acquisitionUnits = getMapValues(flow, RESOURCE_KEYS.ACQUISITION_UNITS_MAP);

        return AcquisitionUnits.assignUserViaApi(
          flow.get(RESOURCE_KEYS.ADMIN).id,
          acquisitionUnits[index].id,
        ).then((membershipId) => flow.toCleanup(
          'acquisitionUnitMemberships',
          cleanup.bind(null, membershipId, acquisitionUnits[index].id),
        ));
      });
  };

  const createAcquisitionUnits = (flow) => {
    repeat(referencesCount, (index) => createAcquisitionUnitForIndex(flow, index));
  };

  const createExpenseClasses = (flow) => {
    const cleanup = (expenseClassId) => ExpenseClasses.deleteExpenseClassViaApi(expenseClassId, { failOnStatusCode: false });

    repeat(referencesCount, () => {
      ExpenseClasses.createExpenseClassViaApi(ExpenseClasses.getDefaultExpenseClass()).then(
        (expenseClass) => setMapEntry(
          flow,
          RESOURCE_KEYS.EXPENSE_CLASSES_MAP,
          expenseClass.id,
          expenseClass,
          cleanup.bind(null, expenseClass.id),
        ),
      );
    });
  };

  const createBudgetFundLedgerFiscalYear = (flow) => {
    const fiscalYear = { ...FiscalYears.getDefaultFiscalYear() };
    const ledger = {
      ...Ledgers.getDefaultLedger(),
      fiscalYearOneId: fiscalYear.id,
    };

    const statusExpenseClasses = getMapValues(flow, RESOURCE_KEYS.EXPENSE_CLASSES_MAP).map(
      ({ id }) => ({
        status: EXPENSE_CLASS_STATUSES.ACTIVE,
        expenseClassId: id,
      }),
    );

    const cleanupFY = (fyId) => FiscalYears.deleteFiscalYearViaApi(fyId, false);
    const cleanupLedger = (ledgerId) => Ledgers.deleteLedgerViaApi(ledgerId, false);
    const cleanupFund = (fundId) => Funds.deleteFundViaApi(fundId, false);
    const cleanupBudget = (budgetId) => Budgets.deleteViaApi(budgetId, false);

    cy.then(() => {
      FiscalYears.createViaApi(fiscalYear).then(() => flow.set(RESOURCE_KEYS.FISCAL_YEAR, fiscalYear, cleanupFY.bind(null, fiscalYear.id)));

      Ledgers.createViaApi(ledger).then(() => flow.set(RESOURCE_KEYS.LEDGER, ledger, cleanupLedger.bind(null, ledger.id)));
    }).then(() => {
      repeat(referencesCount, (index) => {
        const fund = {
          ...Funds.getDefaultFund(),
          ledgerId: flow.get(RESOURCE_KEYS.LEDGER).id,
        };
        const budget = {
          ...Budgets.getDefaultBudget(),
          fiscalYearId: flow.get(RESOURCE_KEYS.FISCAL_YEAR).id,
          fundId: fund.id,
          allocated: LINE_ESTIMATED_PRICE * linesLimit * 2,
          statusExpenseClasses: isEven(index) ? statusExpenseClasses : [],
        };

        Funds.createViaApi(fund).then(
          setMapEntry.bind(
            null,
            flow,
            RESOURCE_KEYS.FUNDS_MAP,
            fund.id,
            fund,
            cleanupFund.bind(null, fund.id),
          ),
        );

        Budgets.createViaApi(budget).then(
          setMapEntry.bind(
            null,
            flow,
            RESOURCE_KEYS.BUDGETS_MAP,
            budget.id,
            budget,
            cleanupBudget.bind(null, budget.id),
          ),
        );
      });
    });
  };

  const fetchServicesPoint = (flow) => {
    return ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => flow.set(RESOURCE_KEYS.SERVICE_POINT, servicePoints[0]));
  };

  const createLocations = (flow) => {
    const cleanup = ({ locationId, libraryId, campusId, institutionId }) => Locations.deleteViaApi({ id: locationId, libraryId, campusId, institutionId });

    repeat(referencesCount, () => {
      const { location, institution, campus, library } = Locations.getDefaultLocation({
        servicePointId: flow.get(RESOURCE_KEYS.SERVICE_POINT).id,
      });

      Locations.createViaApi(location).then((data) => setMapEntry(
        flow,
        RESOURCE_KEYS.LOCATIONS_MAP,
        data.id,
        data,
        cleanup.bind(null, {
          locationId: data.id,
          libraryId: library.id,
          campusId: campus.id,
          institutionId: institution.id,
        }),
      ));
    });
  };

  const createMaterialTypes = (flow) => {
    const cleanup = (materialTypeId) => MaterialTypes.deleteViaApi(materialTypeId);

    repeat(referencesCount, () => {
      MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
        ({ body }) => setMapEntry(
          flow,
          RESOURCE_KEYS.MATERIAL_TYPES_MAP,
          body.id,
          body,
          cleanup.bind(null, body.id),
        ),
      );
    });
  };

  const createAcquisitionMethods = (flow) => {
    const cleanup = (acquisitionMethodId) => AcquisitionMethods.deleteAcquisitionMethodViaAPI(acquisitionMethodId, {
      failOnStatusCode: false,
    });

    repeat(referencesCount, () => {
      AcquisitionMethods.createNewAcquisitionMethodViaAPI({
        value: `autotest_AM_${getRandomPostfix()}`,
      }).then((acqMethod) => setMapEntry(
        flow,
        RESOURCE_KEYS.ACQUISITION_METHODS_MAP,
        acqMethod.id,
        acqMethod,
        cleanup.bind(null, acqMethod.id),
      ));
    });
  };

  const createOrganizationTypes = (flow) => {
    const cleanup = (organizationTypeId) => SettingsOrganizations.deleteOrganizationTypeViaApi(organizationTypeId, {
      failOnStatusCode: false,
    });

    repeat(referencesCount, () => {
      SettingsOrganizations.createTypesViaApi(
        SettingsOrganizations.getDefaultOrganizationType(),
      ).then((organizationType) => setMapEntry(
        flow,
        RESOURCE_KEYS.ORGANIZATION_TYPES_MAP,
        organizationType.id,
        organizationType,
        cleanup.bind(null, organizationType.id),
      ));
    });
  };

  const createOrganization = (flow) => {
    const organization = {
      ...NewOrganization.getDefaultOrganization(),
      organizationTypes: getMapKeys(flow, RESOURCE_KEYS.ORGANIZATION_TYPES_MAP),
    };

    return Organizations.createOrganizationViaApi(organization).then((organizationId) => flow.set(RESOURCE_KEYS.ORGANIZATION, { ...organization, id: organizationId }, () => Organizations.deleteOrganizationViaApi(organizationId, { failOnStatusCode: false })));
  };

  const setLinesLimitSettings = (flow) => {
    return OrderLinesLimit.getPOLLimit()
      .then((settings) => {
        const value = settings?.[0]?.value || 1;

        return flow.set(RESOURCE_KEYS.LINES_LIMITS, { initial: value, current: linesLimit }, () => OrderLinesLimit.setPOLLimitViaApi(value));
      })
      .then(() => OrderLinesLimit.setPOLLimitViaApi(linesLimit));
  };

  const createTenantAddresses = (flow) => {
    const cleanup = (address) => Addresses.deleteAddressViaApi(address);

    repeat(referencesCount, () => {
      Addresses.createAddressViaApi({
        name: `autotest_address_name_${getRandomPostfix()}`,
        address: `autotest_address_value_${getRandomPostfix()}`,
      }).then((address) => setMapEntry(
        flow,
        RESOURCE_KEYS.ADDRESSES_MAP,
        address.id,
        address,
        cleanup.bind(null, address),
      ));
    });
  };

  const createContributorTypes = (flow) => {
    const cleanup = (contributorTypeId) => ContributorTypes.deleteViaApi(contributorTypeId);

    repeat(referencesCount, () => {
      ContributorTypes.createViaApi({
        name: getTestEntityValue('ordersExportContributorType'),
        code: getTestEntityValue('ordersExportContributorTypeCode'),
        source: 'local',
      }).then(({ body }) => setMapEntry(
        flow,
        RESOURCE_KEYS.CONTRIBUTOR_TYPES_MAP,
        body.id,
        body,
        cleanup.bind(null, body.id),
      ));
    });
  };

  const createIdentifierTypes = (flow) => {
    const cleanup = (identifierTypeId) => IdentifierTypes.deleteViaApi(identifierTypeId, { failOnStatusCode: false });

    repeat(referencesCount, () => {
      IdentifierTypes.createViaApi({
        name: getTestEntityValue('ordersExportIdentifierType'),
        source: 'local',
      }).then(({ body }) => setMapEntry(
        flow,
        RESOURCE_KEYS.IDENTIFIER_TYPES_MAP,
        body.id,
        body,
        cleanup.bind(null, body.id),
      ));
    });
  };

  const createOrders = (flow) => {
    const addresses = getMapValues(flow, RESOURCE_KEYS.ADDRESSES_MAP);
    const acqUnitIds = getMapKeys(flow, RESOURCE_KEYS.ACQUISITION_UNITS_MAP);

    const cleanup = (orderId) => Orders.deleteOrderViaApi(orderId, false);

    repeat(referencesCount, (index) => {
      const refIndex = index % referencesCount;

      const order = {
        ...NewOrder.getDefaultOngoingOrder({ vendorId: flow.get(RESOURCE_KEYS.ORGANIZATION).id }),
        acqUnitIds,
        assignedTo: flow.get(RESOURCE_KEYS.ADMIN).id,
        shipTo: addresses[refIndex].id,
        billTo: addresses[refIndex].id,
        approved: true,
        reEncumber: true,
      };

      Orders.createOrderViaApi(order).then((createdOrder) => setMapEntry(
        flow,
        RESOURCE_KEYS.ORDERS_MAP,
        createdOrder.id,
        createdOrder,
        cleanup.bind(null, createdOrder.id),
      ));
    });
  };

  const createOrderLineForOrder = (flow, order, orderIndex, lineIndex) => {
    const refIndex = lineIndex % referencesCount;
    const isEvenIndex = isEven(lineIndex);
    const locations = getMapValues(flow, RESOURCE_KEYS.LOCATIONS_MAP);
    const acquisitionMethods = getMapValues(flow, RESOURCE_KEYS.ACQUISITION_METHODS_MAP);
    const materialTypes = getMapValues(flow, RESOURCE_KEYS.MATERIAL_TYPES_MAP);

    const PHYSICAL_QUANTITY = 1;
    const ELECTRONIC_QUANTITY = 1;
    const UNIT_PRICE = LINE_ESTIMATED_PRICE / (PHYSICAL_QUANTITY + ELECTRONIC_QUANTITY);

    const cleanup = (orderLineId) => OrderLines.deleteOrderLineViaApi(orderLineId, false);

    return OrderLines.createOrderLineViaApi({
      ...BasicOrderLine.getDefaultOrderLine(),
      fundDistribution: isEvenIndex ? buildFundDistribution(flow) : [],
      locations: [
        {
          locationId: locations[refIndex].id,
          quantity: PHYSICAL_QUANTITY + ELECTRONIC_QUANTITY,
          quantityPhysical: PHYSICAL_QUANTITY,
          quantityElectronic: ELECTRONIC_QUANTITY,
        },
      ],
      acquisitionMethod: acquisitionMethods[refIndex].id,
      purchaseOrderId: order.id,
      rush: isEvenIndex,
      orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
      cost: {
        listUnitPrice: UNIT_PRICE,
        listUnitPriceElectronic: UNIT_PRICE,
        currency: flow.get(RESOURCE_KEYS.LOCALE).currency,
        discountType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
        quantityPhysical: PHYSICAL_QUANTITY,
        quantityElectronic: ELECTRONIC_QUANTITY,
        poLineEstimatedPrice: LINE_ESTIMATED_PRICE,
      },
      eresource: {
        activated: false,
        createInventory: POL_CREATE_INVENTORY_SETTINGS.NONE,
        trial: false,
        accessProvider: null,
      },
      physical: {
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
        materialType: materialTypes[refIndex].id,
        materialSupplier: flow.get(RESOURCE_KEYS.ORGANIZATION).id,
        volumes: [],
      },
      vendorDetail: {
        instructions: 'Export test instructions',
        vendorAccount: 'No1234-1',
      },
    }).then((entity) => setMapEntry(
      flow,
      RESOURCE_KEYS.ORDER_LINES_MAP,
      entity.id,
      entity,
      cleanup.bind(null, entity.id),
    ));
  };

  const createOrderLines = (flow) => {
    getMapValues(flow, RESOURCE_KEYS.ORDERS_MAP).forEach((order, orderIndex) => {
      repeat(linesLimit, (lineIndex) => {
        createOrderLineForOrder(flow, order, orderIndex, lineIndex);
      });
    });
  };

  const openOrders = (flow) => {
    getMapValues(flow, RESOURCE_KEYS.ORDERS_MAP).forEach((order) => {
      Orders.updateOrderViaApi({
        ...order,
        workflowStatus: ORDER_STATUSES.OPEN,
      });
    });
  };

  const createAndPayInvoices = (flow) => {
    const organization = flow.get(RESOURCE_KEYS.ORGANIZATION);
    const fiscalYear = flow.get(RESOURCE_KEYS.FISCAL_YEAR);
    const orderToPay = getMapValues(flow, RESOURCE_KEYS.ORDERS_MAP).find(
      (order) => order.workflowStatus === ORDER_STATUSES.OPEN,
    );

    const cleanup = (invoiceId) => {
      const deleteLine = (line) => InvoiceLineDetails.deleteInvoiceLineViaApi(line.id, { failOnStatusCode: false });

      InvoiceLineDetails.getInvoiceLinesViaApi({ query: `invoiceId==${invoiceId}`, limit: 1000 })
        .then(({ invoiceLines }) => {
          invoiceLines.forEach(deleteLine);
        })
        .then(() => Invoices.deleteInvoiceViaApi(invoiceId, { failOnStatusCode: false }));
    };

    Array.from(getMapValues(flow, RESOURCE_KEYS.ORDER_LINES_MAP))
      .filter((line) => line.fundDistribution.length > 0)
      .forEach((line) => {
        Invoices.createInvoiceWithInvoiceLineViaApi({
          vendorId: organization.id,
          fiscalYearId: fiscalYear.id,
          poLineId: line.id,
          fundDistributions: line.fundDistribution,
          accountingCode: organization.erpCode,
          releaseEncumbrance: true,
          subTotal: line.cost?.poLineEstimatedPrice,
        }).then((invoice) => {
          setMapEntry(
            flow,
            RESOURCE_KEYS.INVOICES_MAP,
            invoice.id,
            invoice,
            cleanup.bind(null, invoice.id),
          );

          if (payInvoices && line.purchaseOrderId === orderToPay.id) {
            Invoices.changeInvoiceStatusViaApi({
              invoice,
              status: INVOICE_STATUSES.PAID,
            });
          }
        });
      });
  };

  const updateOrdersInContext = (flow) => {
    cy.wait(DEFAULT_WAIT_TIME);

    getMapValues(flow, RESOURCE_KEYS.ORDERS_MAP).forEach((order) => {
      Orders.getOrderByIdViaApi(order.id).then((updatedOrder) => setMapEntry(flow, RESOURCE_KEYS.ORDERS_MAP, updatedOrder.id, updatedOrder));
    });

    getMapValues(flow, RESOURCE_KEYS.ORDER_LINES_MAP).forEach((orderLine) => {
      OrderLines.getOrderLineByIdViaApi(orderLine.id).then((updatedOrderLine) => setMapEntry(flow, RESOURCE_KEYS.ORDER_LINES_MAP, updatedOrderLine.id, updatedOrderLine));
    });
  };

  const fetchOrderLinesHoldings = (flow) => {
    const holdingIdsSet = Array.from(getMapValues(flow, RESOURCE_KEYS.ORDER_LINES_MAP))
      .flatMap((line) => line.locations.map(({ holdingId }) => holdingId))
      .filter(Boolean)
      .reduce((set, id) => set.add(id), new Set());

    const holdingIdsChunks = chunk(Array.from(holdingIdsSet), 10);

    const addHoldingToContext = (holding) => setMapEntry(flow, RESOURCE_KEYS.HOLDINGS_MAP, holding.id, holding);

    holdingIdsChunks.forEach((holdingIdsChunk) => {
      cy.getHoldings({ query: `id==(${holdingIdsChunk.join(' or ')})`, limit: 1000 }).then(
        (holdings) => {
          holdings.forEach(addHoldingToContext);
        },
      );
    });
  };

  const createAuthorizedUser = (flow) => {
    return cy
      .createTempUser([Permissions.uiExportOrders.gui, Permissions.uiOrdersView.gui])
      .then((user) => flow.set(RESOURCE_KEYS.USER, user, (entity) => Users.deleteViaApi(entity.userId)));
  };

  const loginAsAuthorizedUser = (flow) => {
    const user = flow.get(RESOURCE_KEYS.USER);

    return cy.login(user.username, user.password, {
      path: TopMenu.orderLinesPath,
      waiter: OrderLines.waitLoading,
    });
  };

  return {
    getAdminUserDetails,
    createAcquisitionUnits,
    createExpenseClasses,
    createBudgetFundLedgerFiscalYear,
    createLocations,
    createMaterialTypes,
    createAcquisitionMethods,
    setLinesLimitSettings,
    createContributorTypes,
    createIdentifierTypes,
    createOrganizationTypes,
    createOrganization,
    createOrders,
    createOrderLines,
    openOrders,
    createAndPayInvoices,
    createAuthorizedUser,
    createTenantAddresses,
    fetchServicesPoint,
    fetchOrderLinesHoldings,
    loginAsAuthorizedUser,
    updateOrdersInContext,
  };
}

export const createOrdersExportDataViaApi = (flowManager, params = {}) => {
  const { referencesCount, linesLimit, payInvoices } = params;

  cy.getAdminToken();
  cy.getTenantLocaleApi().then((locale) => flowManager.set(RESOURCE_KEYS.LOCALE, locale));

  const steps = getExecutionSteps({ linesLimit, referencesCount, payInvoices });

  flowManager
    .step(steps.getAdminUserDetails)
    .step(steps.createTenantAddresses)
    .step(steps.createAcquisitionUnits)
    .step(steps.createExpenseClasses)
    .step(steps.createBudgetFundLedgerFiscalYear)
    .step(steps.fetchServicesPoint)
    .step(steps.createLocations)
    .step(steps.createMaterialTypes)
    .step(steps.createAcquisitionMethods)
    .step(steps.createOrganizationTypes)
    .step(steps.createOrganization)
    .step(steps.setLinesLimitSettings)
    .step(steps.createContributorTypes)
    .step(steps.createIdentifierTypes)
    .step(steps.createOrders)
    .step(steps.createOrderLines)
    .step(steps.openOrders)
    .step(steps.updateOrdersInContext)
    .step(steps.createAndPayInvoices)
    .step(steps.updateOrdersInContext)
    .step(steps.fetchOrderLinesHoldings)
    .step(steps.createAuthorizedUser)
    .step(steps.loginAsAuthorizedUser);
};

export default {
  createOrdersExportDataViaApi,
};
