import { v4 as uuid } from 'uuid';

import { Pane, Section } from '../../../interactors';
import {
  CLAIMING_CALLOUT_MESSAGES,
  CLAIMING_FILTER_LABELS,
  CLAIMING_RESULTS_LIST_COLUMNS,
  DEFAULT_WAIT_TIME,
  EXPORT_MANAGER_CLAIMING_CSV_JOB_FIELD_LABELS,
  EXPORT_MANAGER_JOBS_INTEGRATION_TYPE_FILTER_OPTION_LABELS,
  EXPORT_MANAGER_JOBS_STATUS_LABELS,
  FTP_PROTOCOLS,
  LOCATION_NAMES,
  ORDER_STATUSES,
  ORGANIZATION_INTEGRATION_CONFIG,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import Claiming from '../../support/fragments/claiming/claiming';
import { ExportManagerSearchPane, Exports } from '../../support/fragments/exportManager';
import { BasicOrderLine, NewOrder, Orders, Pieces } from '../../support/fragments/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import {
  Integrations,
  NewOrganization,
  Organizations,
} from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { DateTools, ExecutionFlowManager, parseEdiFile } from '../../support/utils';
import FileManager from '../../support/utils/fileManager';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import { formatDate } from '../../support/utils/acquisitions';

const R = {
  ORG_1: 'org1',
  ORG_2: 'org2',
  LOCALE: 'locale',
  LOCATION: 'location',
  MATERIAL_TYPE: 'materialType',
  ACQ_METHOD: 'acquisitionMethod',
  INSTANCE: 'instance',
  ORDER_1: 'order1',
  ORDER_2: 'order2',
  ORDER_LINE_1: 'orderLine1',
  ORDER_LINE_2: 'orderLine2',
  ORDER_LINE_3: 'orderLine3',
  INTEGRATION_1: 'integration1',
  INTEGRATION_2: 'integration2',
  USER: 'user',
};

const {
  DEFAULT_FTP_SERVER_ADDRESS,
  DEFAULT_ORDERS_DIRECTORY,
  EXPORT_TYPES,
  FILE_FORMATS,
  INTEGRATION_TYPES,
  TRANSMISSION_METHODS,
} = ORGANIZATION_INTEGRATION_CONFIG;

const filtersPane = Pane({ id: 'claiming-filters-pane' });
const POL_CLAIM_ACTIVE_FILTER_LEGACY = 'POL claim active';
const TAG = `AT_C1322902_TAG_${getRandomPostfix()}`;

const buildClaimingExpectedResult = (flow, lines) => {
  const orders = [flow.get(R.ORDER_1), flow.get(R.ORDER_2)];
  const organizations = [flow.get(R.ORG_1), flow.get(R.ORG_2)];

  return lines.map((line) => {
    const targetOrder = orders.find((order) => order.id === line.purchaseOrderId);
    const targetOrganization = organizations.find((org) => org.id === targetOrder.vendor);

    return [
      { column: CLAIMING_RESULTS_LIST_COLUMNS.ORGANIZATION_CODE, content: targetOrganization.code },
      { column: CLAIMING_RESULTS_LIST_COLUMNS.ORGANIZATION_NAME, content: targetOrganization.name },
      { column: CLAIMING_RESULTS_LIST_COLUMNS.STATUS, content: RECEIVING_PIECE_STATUSES.LATE },
      { column: CLAIMING_RESULTS_LIST_COLUMNS.TITLE, content: line.titleOrPackage },
      { column: CLAIMING_RESULTS_LIST_COLUMNS.POL_NUMBER, content: line.poLineNumber },
    ];
  });
};

const getFileName = (flow, fileFormat) => {
  return {
    [FILE_FORMATS.CSV]: `csv_claims_${flow.get(R.ORG_1).code}_${flow.get(R.INTEGRATION_1).integrationName}_*.csv`,
    [FILE_FORMATS.EDI]: `edi_claims_${flow.get(R.ORG_2).code}_${flow.get(R.INTEGRATION_2).integrationName}_*.edi`,
  }[fileFormat];
};

const waitForClaimingResultsLoading = () => {
  Claiming.waitForGetClaimingPiecesQueryCompleted();
  Organizations.waitForOrganizationsQueryCompleted();
};

const waitForExportManagerResultsLoading = () => {
  ExportManagerSearchPane.waitForJobs();
  Exports.waitForGetExportJobsQueryCompleted();
  cy.wait(DEFAULT_WAIT_TIME);
};

describe('Claiming', () => {
  const flow = new ExecutionFlowManager();

  before('Create С1322902 preconditions', () => {
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

    flow
      .step(steps.createOrganizations)
      .step(steps.fetchReferenceData)
      .step(steps.createClaimingIntegrations)
      .step(steps.createTag)
      .step(steps.createOrdersWithLines)
      .step(steps.markPiecesAsLate)
      .step(steps.createAndLoginUser);
  });

  after('Delete C1322902 test data', () => {
    cy.getAdminToken();
    flow.cleanup();
    Object.values(FILE_FORMATS).forEach((fileFormat) => FileManager.deleteFilesFromDownloadsByMask(getFileName(flow, fileFormat)));
  });

  it(
    'C1322902 Send claim action for two organizations with one integration for each organization (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1322902'] },
    () => {
      const { locale, order2, orderLine2, orderLine3, integration1, integration2, user } =
        flow.ctx();

      const username = user.username;

      cy.log('<--- STEP 1 --->');
      TopMenu.openClaimingApp();
      Claiming.waitLoading();
      Claiming.assertCheckboxFilterValues(CLAIMING_FILTER_LABELS.RECEIVING_STATUS, [
        RECEIVING_PIECE_STATUSES.LATE,
      ]);
      cy.expect(filtersPane.find(Section(POL_CLAIM_ACTIVE_FILTER_LEGACY)).absent());

      /* Filter test records by tag to ensure they are in the results list */
      const lines = [orderLine2, orderLine2, orderLine3, orderLine3];
      Claiming.filterByMultiSelectOptions(CLAIMING_FILTER_LABELS.TAGS, [TAG]);
      waitForClaimingResultsLoading();
      Claiming.sortResultsBy(CLAIMING_RESULTS_LIST_COLUMNS.TITLE);
      waitForClaimingResultsLoading();
      Claiming.assertClaimingResults(buildClaimingExpectedResult(flow, lines));

      cy.log('<--- STEP 2 --->');
      Claiming.selectResultsRecords(Object.keys(lines));
      Claiming.clickActionsButton();
      Claiming.clickSendClaimOption();
      Claiming.assertSendClaimModalElements({ count: lines.length });

      cy.log('<--- STEP 3 --->');
      Claiming.fillClaimExpiryDate(formatDate(locale, DateTools.getFutureWeekDateObj()));
      Claiming.clickSaveAndCloseInSendClaimModal();
      InteractorsTools.checkCalloutMessage(CLAIMING_CALLOUT_MESSAGES.CLAIMS_PROCESSING);
      Claiming.assertNoResultsFound(); // all pieces are in 'Late' status, so they should disappear from the list after claim is sent
      cy.wait(DEFAULT_WAIT_TIME);

      cy.log('<--- STEP 4 --->');
      TopMenu.openExportManagerApp();
      ExportManagerSearchPane.selectOrganizationsSearch();
      ExportManagerSearchPane.waitLoading();
      ExportManagerSearchPane.filterByIntegrationTypes([
        EXPORT_MANAGER_JOBS_INTEGRATION_TYPE_FILTER_OPTION_LABELS.CLAIMS,
      ]);
      waitForExportManagerResultsLoading();

      /* To ensure that we have only relevant records in the results list */
      ExportManagerSearchPane.searchBySourceUserName(username);
      ExportManagerSearchPane.verifyUserSearchResult(username);
      ExportManagerSearchPane.selectUserAsSourceInSearchResult(username);
      waitForExportManagerResultsLoading();

      ExportManagerSearchPane.verifyJobDataInResults(
        [EXPORT_MANAGER_JOBS_STATUS_LABELS.SUCCESSFUL, integration1.integrationName],
        true,
      );
      ExportManagerSearchPane.verifyJobDataInResults(
        [EXPORT_MANAGER_JOBS_STATUS_LABELS.SUCCESSFUL, integration2.integrationName],
        true,
      );

      cy.log('<--- STEP 5 --->');
      ExportManagerSearchPane.clickJobLinkByIntegrationInList(integration1.integrationName, {
        isEdiJobsList: true,
      });

      cy.log('<--- STEP 6 --->');
      cy.wait(DEFAULT_WAIT_TIME);
      FileManager.convertCsvToJson(getFileName(flow, FILE_FORMATS.CSV)).then((csvFileData) => {
        cy.expect(csvFileData).to.have.lengthOf(1);

        const F = EXPORT_MANAGER_CLAIMING_CSV_JOB_FIELD_LABELS;

        const expectedData = {
          [F.ACCOUNT_NUMBER]: +flow.get(R.ORG_1).accounts[0].accountNo,
          [F.CHRONOLOGY]: '',
          [F.DISPLAY_SUMMARY]: '',
          [F.ENUMERATION]: '',
          [F.EXPECTED_DATE]: '',
          [F.EXTERNAL_NOTE]: '',
          [F.POL_NUMBER]: orderLine2.poLineNumber,
          [F.QUANTITY]: 2,
          [F.TITLE_FROM_PIECE]: `${orderLine2.titleOrPackage}`,
          [F.VENDOR_ORDER_NUMBER]: '',
        };

        cy.expect(csvFileData[0]).to.deep.equal(expectedData);
      });

      cy.log('<--- STEP 7 (SKIPPED) --->');
      cy.log('<--- STEP 8 --->');
      ExportManagerSearchPane.selectExportMethod(integration2.integrationName);
      waitForExportManagerResultsLoading();
      ExportManagerSearchPane.verifyJobDataInResults(
        [EXPORT_MANAGER_JOBS_STATUS_LABELS.SUCCESSFUL, integration2.integrationName],
        true,
      );
      ExportManagerSearchPane.verifyJobsCountInResults(1);

      cy.log('<--- STEP 9 --->');
      ExportManagerSearchPane.clickJobLinkByIntegrationInList(integration2.integrationName, {
        isEdiJobsList: true,
      });
      cy.wait(DEFAULT_WAIT_TIME);

      cy.log('<--- STEP 10 --->');
      FileManager.findDownloadedFilesByMask(getFileName(flow, FILE_FORMATS.EDI)).then(
        (downloadedFiles) => {
          const downloadedFile = downloadedFiles.sort()[downloadedFiles.length - 1];

          FileManager.readFile(downloadedFile).then((content) => {
            const { segmentsByTag } = parseEdiFile(content);

            cy.expect(segmentsByTag.RFF).to.include(`RFF+LI:${orderLine3.poLineNumber}`);
            cy.expect(segmentsByTag.RFF).to.include(`RFF+SNA:${order2.poNumber}`);
            cy.expect(segmentsByTag.IMD).to.not.include('IMD+L+080+:::');
          });
        },
      );
    },
  );
});

function markOrderLinePiecesLate(orderLineId) {
  return Receiving.getPiecesViaApi(orderLineId).then((pieces) => {
    const pieceUpdates = (pieces || []).map((piece) => {
      return Pieces.updateOrderPieceViaApi({
        ...piece,
        receivingStatus: RECEIVING_PIECE_STATUSES.LATE,
      });
    });

    return cy.wrap(Promise.all(pieceUpdates));
  });
}

function createOrderViaApi(flow, orderKey, vendorId) {
  return Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId })).then((order) => flow.set(orderKey, order, () => Orders.deleteOrderViaApi(order.id, false)));
}

function createOrderLineViaApi(flow, options) {
  const cleanup = (orderLineId) => {
    Pieces.getOrderPiecesViaApi({ query: `poLineId=="${orderLineId}"` })
      .then(({ pieces }) => {
        pieces.forEach((piece) => {
          Pieces.deleteOrderPieceViaApi(piece.id, false);
        });
      })
      .then(() => {
        OrderLines.deleteOrderLineViaApi(orderLineId, false);
      });
  };

  const {
    orderKey,
    orderLineKey,
    claimingActive,
    claimingInterval,
    vendorAccount,
    vendorId,
    ...rest
  } = options;

  const baseOrderLine = {
    ...BasicOrderLine.defaultOrderLine,
    id: uuid(),
    vendorDetail: {
      instructions: vendorId,
      vendorAccount,
      referenceNumbers: [],
    },
    ...rest,
    purchaseOrderId: flow.get(orderKey).id,
    titleOrPackage: `${orderKey} - ${orderLineKey} - ${getRandomPostfix()}`,
    claimingActive,
    claimingInterval,
  };

  return OrderLines.createOrderLineViaApi(baseOrderLine).then((orderLine) => flow.set(orderLineKey, orderLine, () => cleanup(orderLine.id)));
}

function openOrderViaApi(flow, orderKey) {
  return Orders.updateOrderViaApi({ ...flow.get(orderKey), workflowStatus: ORDER_STATUSES.OPEN })
    .then(() => Orders.getOrderByIdViaApi(flow.get(orderKey).id))
    .then((order) => flow.set(orderKey, order));
}

function getPreconditionSteps() {
  const createOrganizations = (flow) => {
    const cleanup = (orgId) => {
      Organizations.deleteOrganizationViaApi(orgId);
    };

    [R.ORG_1, R.ORG_2].forEach((orgKey) => {
      const org = NewOrganization.getDefaultOrganization({ accounts: 1 });

      Organizations.createOrganizationViaApi(org).then((orgId) => flow.set(orgKey, { ...org, id: orgId }, cleanup.bind(null, orgId)));
    });
  };

  const fetchReferenceData = (flow) => {
    cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((location) => flow.set(R.LOCATION, location));

    cy.getDefaultMaterialType().then((materialType) => flow.set(R.MATERIAL_TYPE, materialType));

    cy.getAcquisitionMethodsApi().then(({ body: { acquisitionMethods } }) => {
      flow.set(R.ACQ_METHOD, acquisitionMethods[0]);
    });
  };

  const createTag = (flow) => {
    cy.createTagApi({ label: TAG }).then((tagId) => flow.toCleanup(R.TAG, () => cy.deleteTagApi(tagId, true)));
  };

  const createClaimingIntegrations = (flow) => {
    const commonConfig = {
      acqMethodId: flow.get(R.ACQ_METHOD).id,
      integrationType: INTEGRATION_TYPES.CLAIMING,
      type: EXPORT_TYPES.CLAIMS,
    };

    const cleanup = (integrationId) => {
      Integrations.deleteIntegrationViaApi(integrationId, { failOnStatusCode: false });
    };

    const csvIntegration = Integrations.getDefaultIntegration({
      ...commonConfig,
      vendorId: flow.get(R.ORG_1).id,
      fileFormat: FILE_FORMATS.CSV,
      ediFtp: {
        ftpFormat: FTP_PROTOCOLS.SFTP,
        serverAddress: DEFAULT_FTP_SERVER_ADDRESS,
        orderDirectory: DEFAULT_ORDERS_DIRECTORY,
      },
    });

    const ediIntegration = Integrations.getDefaultIntegration({
      ...commonConfig,
      vendorId: flow.get(R.ORG_2).id,
      fileFormat: FILE_FORMATS.EDI,
      transmissionMethod: TRANSMISSION_METHODS.FILE_DOWNLOAD,
      accountNoList: flow.get(R.ORG_2).accounts.map(({ accountNo }) => accountNo),
    });

    Integrations.createIntegrationViaApi(csvIntegration)
      .then(() => Integrations.getIntegrationConfigViaApi(csvIntegration.id))
      .then((integration) => flow.set(
        R.INTEGRATION_1,
        {
          ...integration,
          integrationName:
              integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName,
        },
        cleanup.bind(null, integration.id),
      ));

    Integrations.createIntegrationViaApi(ediIntegration)
      .then(() => Integrations.getIntegrationConfigViaApi(ediIntegration.id))
      .then((integration) => flow.set(
        R.INTEGRATION_2,
        {
          ...integration,
          integrationName:
              integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName,
        },
        cleanup.bind(null, integration.id),
      ));
  };

  const createOrdersWithLines = (flow) => {
    const commonLineData = {
      acquisitionMethod: flow.get(R.ACQ_METHOD).id,
      checkinItems: false,
      cost: {
        listUnitPrice: 10,
        currency: 'USD',
        quantityPhysical: 2,
      },
      locations: [
        {
          locationId: flow.get(R.LOCATION).id,
          quantity: 2,
          quantityPhysical: 2,
        },
      ],
      physical: {
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
        materialType: flow.get(R.MATERIAL_TYPE).id,
        materialSupplier: flow.get(R.ORG_1).id,
        volumes: [],
      },
      tags: {
        tagList: [TAG],
      },
    };

    createOrderViaApi(flow, R.ORDER_1, flow.get(R.ORG_1).id)
      .then(() => {
        return createOrderLineViaApi(flow, {
          orderKey: R.ORDER_1,
          orderLineKey: R.ORDER_LINE_1,
          claimingActive: false,
          claimingInterval: undefined,
          vendorId: flow.get(R.ORG_1).id,
          vendorAccount: flow.get(R.ORG_1).accounts[0].accountNo,
          ...commonLineData,
        });
      })
      .then(() => {
        return createOrderLineViaApi(flow, {
          orderKey: R.ORDER_1,
          orderLineKey: R.ORDER_LINE_2,
          claimingActive: true,
          claimingInterval: 1,
          vendorId: flow.get(R.ORG_1).id,
          vendorAccount: flow.get(R.ORG_1).accounts[0].accountNo,
          ...commonLineData,
        });
      })
      .then(() => openOrderViaApi(flow, R.ORDER_1));

    createOrderViaApi(flow, R.ORDER_2, flow.get(R.ORG_2).id)
      .then(() => {
        return createOrderLineViaApi(flow, {
          orderKey: R.ORDER_2,
          orderLineKey: R.ORDER_LINE_3,
          claimingActive: true,
          claimingInterval: 1,
          vendorId: flow.get(R.ORG_2).id,
          vendorAccount: flow.get(R.ORG_2).accounts[0].accountNo,
          ...commonLineData,
        });
      })
      .then(() => openOrderViaApi(flow, R.ORDER_2));
  };

  const markPiecesAsLate = (flow) => {
    [R.ORDER_LINE_1, R.ORDER_LINE_2, R.ORDER_LINE_3].forEach((orderLineKey) => {
      markOrderLinePiecesLate(flow.get(orderLineKey).id);
    });
  };

  const createAndLoginUser = (flow) => {
    cy.clearLocalStorage();

    Claiming.interceptGetClaimingPieces();
    Organizations.interceptGetOrganizations();
    Exports.interceptGetExportJobs();
    Exports.interceptGetExportConfigs();

    return cy
      .createTempUser([
        Permissions.uiClaimingView.gui,
        Permissions.exportManagerAll.gui,
        Permissions.uiReceivingViewEdit.gui,
      ])
      .then((user) => {
        flow.set(R.USER, user, () => Users.deleteViaApi(user.userId));

        cy.login(user.username, user.password);
      });
  };

  return {
    createAndLoginUser,
    createClaimingIntegrations,
    createOrdersWithLines,
    createOrganizations,
    createTag,
    fetchReferenceData,
    markPiecesAsLate,
  };
}
