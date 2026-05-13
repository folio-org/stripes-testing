import moment from 'moment';

import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FTP_PROTOCOLS,
  FUND_DISTRIBUTION_TYPES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  ORGANIZATION_INTEGRATION_CONFIG,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportDetails from '../../../support/fragments/exportManager/exportDetails';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import {
  Integrations,
  NewOrganization,
  Organizations,
} from '../../../support/fragments/organizations';
import { Addresses } from '../../../support/fragments/settings/tenant/general';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { ExecutionFlowManager, parseEdiFile } from '../../../support/utils';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

const R = {
  ACQ_METHOD: 'acquisitionMethod',
  CURRENCIES: 'currencies',
  EXPORT_INTEGRATION: 'exportIntegration',
  LOCATION: 'location',
  MATERIAL_TYPE: 'materialType',
  ORDER: 'order',
  ORDER_LINES: 'orderLines',
  ORGANIZATION: 'organization',
  SHIP_TO: 'shipToAddress',
  USER: 'user',
};

const PRICE = {
  POL1_TOTAL: 11.11,
  POL1_UNIT: 11.11,
  POL2_ADDITIONAL_COST: 3,
  POL2_QUANTITY: 2,
  POL2_TOTAL: 13,
  POL2_UNIT: 5,
};

const EXPORT_WAIT_TIME_MS = 10_000;

const FOREIGN_CURRENCIES = ['AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'PLN'];

const toEdiAmount = (value) => Number(value)
  .toFixed(2)
  .replace(/\.0+$/, '')
  .replace(/(\.\d*[1-9])0+$/, '$1');

const createOrderLinesCleanup = (orderLines) => () => {
  orderLines.forEach((orderLine) => {
    OrderLines.deleteOrderLineViaApi(orderLine.id, false);
  });
};

const assertSegmentExists = (segments, expectedPrefix) => {
  expect(segments.some((segment) => segment.startsWith(expectedPrefix))).to.equal(true);
};

const assertCurrencySegments = (segments, currencies) => {
  const hasAnyOrderCurrency = [currencies.pol1Currency, currencies.pol2Currency].some(
    (currency) => {
      return segments.some((segment) => segment.startsWith(`CUX+2:${currency}:`));
    },
  );

  expect(hasAnyOrderCurrency).to.equal(true);
  assertSegmentExists(segments, `CUX+2:${currencies.pol1Currency}:`);
  assertSegmentExists(segments, `CUX+2:${currencies.pol2Currency}:`);
};

const assertAddressSegments = (segments, shipToAddress) => {
  assertSegmentExists(segments, 'NAD+BY+');
  expect(segments.join("'")).to.include(shipToAddress.address);
};

const assertPriceSegments = (segments) => {
  assertSegmentExists(segments, `PRI+AAF:${toEdiAmount(PRICE.POL1_TOTAL)}`);
  assertSegmentExists(segments, `PRI+AAB:${toEdiAmount(PRICE.POL1_TOTAL)}`);
  assertSegmentExists(segments, `PRI+AAF:${toEdiAmount(PRICE.POL2_TOTAL)}`);
  assertSegmentExists(segments, `PRI+AAB:${toEdiAmount(PRICE.POL2_UNIT * PRICE.POL2_QUANTITY)}`);
};

const createOrderLine = ({
  accountNo,
  acquisitionMethod,
  currency,
  locationId,
  materialTypeId,
  orderId,
  poLineEstimatedPrice,
  quantity,
  title,
  unitPrice,
  additionalCost,
}) => {
  return {
    ...BasicOrderLine.getDefaultOrderLine({
      acquisitionMethod,
      automaticExport: true,
      checkinItems: true,
      listUnitPrice: unitPrice,
      purchaseOrderId: orderId,
      quantity,
      title,
      vendorAccount: accountNo,
    }),
    cost: {
      additionalCost,
      currency,
      discountType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
      listUnitPrice: unitPrice,
      poLineEstimatedPrice,
      quantityPhysical: quantity,
    },
    locations: [
      {
        locationId,
        quantity,
        quantityPhysical: quantity,
      },
    ],
    orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
    physical: {
      createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
      materialSupplier: null,
      materialType: materialTypeId,
      volumes: [],
    },
    vendorDetail: {
      instructions: '',
      vendorAccount: accountNo,
    },
  };
};

const getPreconditionSteps = () => {
  const createCurrencies = (flow) => {
    const pickForeignCurrencies = (defaultCurrency) => {
      const nonDefaultCurrencies = FOREIGN_CURRENCIES.filter(
        (currency) => currency !== defaultCurrency,
      );

      return {
        pol1Currency: nonDefaultCurrencies[0],
        pol2Currency: nonDefaultCurrencies[1],
      };
    };
    return cy
      .getTenantLocaleApi()
      .then((locale) => flow.set(R.CURRENCIES, pickForeignCurrencies(locale.currency)));
  };

  const createOrganization = (flow) => {
    const organization = NewOrganization.getDefaultOrganization({ accounts: 1 });

    return Organizations.createOrganizationViaApi(organization).then((organizationId) => flow.set(R.ORGANIZATION, { ...organization, id: organizationId }, () => Organizations.deleteOrganizationViaApi(organizationId)));
  };

  const createShipToAddress = (flow) => {
    const shipToAddress = Addresses.generateAddressConfig({
      address: `autotest_ship_to_${getRandomPostfix()}`,
    });

    return Addresses.createAddressViaApi(shipToAddress).then((createdAddress) => flow.set(R.SHIP_TO, createdAddress, (entity) => Addresses.deleteAddressViaApi(entity)));
  };

  const fetchLocation = (flow) => {
    return cy.getLocations({ limit: 1 }).then((location) => flow.set(R.LOCATION, location));
  };

  const fetchMaterialType = (flow) => {
    return cy.getBookMaterialType().then((materialType) => flow.set(R.MATERIAL_TYPE, materialType));
  };

  const fetchAcquisitionMethod = (flow) => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
      })
      .then(({ body: { acquisitionMethods } }) => flow.set(R.ACQ_METHOD, acquisitionMethods[0]));
  };

  const createExportIntegration = (flow) => {
    const integration = Integrations.getDefaultIntegration({
      accountNoList: [flow.get(R.ORGANIZATION).accounts[0].accountNo],
      acqMethodId: flow.get(R.ACQ_METHOD).id,
      ediFtp: {
        ftpFormat: FTP_PROTOCOLS.SFTP,
        ftpMode: ORGANIZATION_INTEGRATION_CONFIG.FTP_MODES.ASCII,
        ftpConnMode: ORGANIZATION_INTEGRATION_CONFIG.FTP_CONNECTION_MODES.ACTIVE,
        serverAddress: ORGANIZATION_INTEGRATION_CONFIG.DEFAULT_FTP_SERVER_ADDRESS,
        ftpPort: ORGANIZATION_INTEGRATION_CONFIG.DEFAULT_FTP_PORT,
        orderDirectory: ORGANIZATION_INTEGRATION_CONFIG.DEFAULT_ORDERS_DIRECTORY,
      },
      ediSchedule: {
        enableScheduledExport: true,
        scheduleParameters: {
          schedulePeriod: ORGANIZATION_INTEGRATION_CONFIG.SCHEDULE_PERIODS.HOUR,
          scheduleFrequency: 1,
          scheduleTime: moment().add(EXPORT_WAIT_TIME_MS, 'milliseconds').utc().format('HH:mm:ss'),
        },
      },
      isDefaultConfig: true,
      vendorId: flow.get(R.ORGANIZATION).id,
    });

    return Integrations.createIntegrationViaApi(integration)
      .then(() => Integrations.getIntegrationConfigViaApi(integration.id))
      .then((data) => flow.set(
        R.EXPORT_INTEGRATION,
        {
          ...data,
          integrationName:
              integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName,
        },
        (entity) => Integrations.deleteIntegrationViaApi(entity.id),
      ));
  };

  const createOrder = (flow) => {
    return Orders.createOrderViaApi({
      ...NewOrder.getDefaultOrder({
        manualPo: false,
        vendorId: flow.get(R.ORGANIZATION).id,
      }),
      billTo: flow.get(R.SHIP_TO).id,
      shipTo: flow.get(R.SHIP_TO).id,
    }).then((createdOrder) => flow.set(R.ORDER, createdOrder, (entity) => Orders.deleteOrderViaApi(entity.id, false)));
  };

  const createOrderLines = (flow) => {
    const { pol1Currency, pol2Currency } = flow.get(R.CURRENCIES);
    const locationId = flow.get(R.LOCATION).id;
    const materialTypeId = flow.get(R.MATERIAL_TYPE).id;
    const accountNo = flow.get(R.ORGANIZATION).accounts[0].accountNo;

    const pol1 = createOrderLine({
      accountNo,
      acquisitionMethod: flow.get(R.ACQ_METHOD).id,
      currency: pol1Currency,
      locationId,
      materialTypeId,
      orderId: flow.get(R.ORDER).id,
      poLineEstimatedPrice: PRICE.POL1_TOTAL,
      quantity: 1,
      title: `autotest_pol1_${getRandomPostfix()}`,
      unitPrice: PRICE.POL1_UNIT,
    });

    const pol2 = createOrderLine({
      accountNo,
      acquisitionMethod: flow.get(R.ACQ_METHOD).id,
      additionalCost: PRICE.POL2_ADDITIONAL_COST,
      currency: pol2Currency,
      locationId,
      materialTypeId,
      orderId: flow.get(R.ORDER).id,
      poLineEstimatedPrice: PRICE.POL2_TOTAL,
      quantity: PRICE.POL2_QUANTITY,
      title: `autotest_pol2_${getRandomPostfix()}`,
      unitPrice: PRICE.POL2_UNIT,
    });

    let createdPol1;

    return OrderLines.createOrderLineViaApi(pol1)
      .then((line) => {
        createdPol1 = line;
        return OrderLines.createOrderLineViaApi(pol2);
      })
      .then((createdPol2) => {
        const createdOrderLines = [createdPol1, createdPol2];

        flow.set(R.ORDER_LINES, createdOrderLines, createOrderLinesCleanup(createdOrderLines));
      });
  };

  const openOrder = (flow) => {
    return Orders.updateOrderViaApi({
      ...flow.get(R.ORDER),
      workflowStatus: ORDER_STATUSES.OPEN,
    });
  };

  const createExportManagerUser = (flow) => {
    return cy
      .createTempUser([
        Permissions.exportManagerAll.gui,
        Permissions.exportManagerDownloadAndResendFiles.gui,
      ])
      .then((user) => flow.set(R.USER, user, (entity) => Users.deleteViaApi(entity.userId)));
  };

  const loginAsExportManagerUser = (flow) => {
    const user = flow.get(R.USER);

    cy.wait(EXPORT_WAIT_TIME_MS); // Wait for export job to be created and displayed in UI after order lines creation

    return cy.login(user.username, user.password, {
      path: TopMenu.exportManagerOrganizationsPath,
      waiter: ExportManagerSearchPane.waitLoading,
    });
  };

  return {
    createCurrencies,
    createOrganization,
    createShipToAddress,
    fetchLocation,
    fetchMaterialType,
    fetchAcquisitionMethod,
    createExportIntegration,
    createOrder,
    createOrderLines,
    openOrder,
    createExportManagerUser,
    loginAsExportManagerUser,
  };
};

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format: Orders Export to a Vendor', () => {
    const flow = new ExecutionFlowManager();

    before('Create C523775 preconditions', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();

      const steps = getPreconditionSteps();

      flow
        .step(steps.createCurrencies)
        .step(steps.createOrganization)
        .step(steps.createShipToAddress)
        .step(steps.fetchLocation)
        .step(steps.fetchMaterialType)
        .step(steps.fetchAcquisitionMethod)
        .step(steps.createExportIntegration)
        .step(steps.createOrder)
        .step(steps.createOrderLines)
        .step(steps.openOrder)
        .step(steps.createExportManagerUser)
        .step(steps.loginAsExportManagerUser);
    });

    after('Delete C523775 data (what can be deleted)', () => {
      cy.getAdminToken();
      FileManager.deleteFilesFromDownloadsByMask(
        `*${flow.get(R.EXPORT_INTEGRATION)?.integrationName || ''}*.edi`,
      );
      flow.cleanup();
    });

    it(
      'C523775 Export order with currency different from default (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C523775'] },
      () => {
        const { exportIntegration } = flow.ctx();

        cy.log('< --- STEP 1: Filter jobs by integration name --- >');
        ExportManagerSearchPane.selectOrganizationsSearch();
        ExportManagerSearchPane.selectExportMethod(exportIntegration.integrationName);
        ExportManagerSearchPane.verifyResult('Successful');

        cy.log('< --- STEP 2: Open successful export job --- >');
        ExportManagerSearchPane.selectJob('Successful');
        ExportDetails.checkExportJobDetails({
          exportInformation: [{ key: 'File name', value: '.edi' }],
        });

        cy.log('< --- STEP 3: Download exported EDI file --- >');
        ExportDetails.downloadExportFile();
        cy.wait(EXPORT_WAIT_TIME_MS); // Wait for file to be downloaded

        cy.log('< --- STEP 4: Open downloaded EDI file and verify it contains export data --- >');
        const fileMask = `*${exportIntegration.integrationName}*.edi`;

        FileManager.findDownloadedFilesByMask(fileMask).then((downloadedFiles) => {
          const downloadedFile = downloadedFiles.sort()[downloadedFiles.length - 1];

          FileManager.readFile(downloadedFile).then((content) => {
            const { segments } = parseEdiFile(content);
            const { currencies, shipToAddress } = flow.ctx();

            expect(segments.length).to.be.greaterThan(0);
            assertSegmentExists(segments, 'UNH+');

            cy.log('< --- STEP 5: Check currency displaying --- >');
            assertCurrencySegments(segments, currencies);

            cy.log('< --- STEP 6: Check address displaying --- >');
            assertAddressSegments(segments, shipToAddress);

            cy.log('< --- STEP 7: Check calculation price --- >');
            assertPriceSegments(segments);
          });
        });
      },
    );
  });
});
