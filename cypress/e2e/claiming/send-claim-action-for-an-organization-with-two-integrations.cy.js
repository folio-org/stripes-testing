import { v4 as uuid } from 'uuid';

import {
  CLAIMING_CALLOUT_MESSAGES,
  CLAIMING_FILTER_LABELS,
  DEFAULT_WAIT_TIME,
  EXPORT_MANAGER_CLAIMING_CSV_JOB_FIELD_LABELS,
  EXPORT_MANAGER_JOBS_INTEGRATION_TYPE_FILTER_OPTION_LABELS,
  EXPORT_MANAGER_JOBS_STATUS_LABELS,
  EXPORT_MANAGER_JOBS_TYPES,
  LOCATION_NAMES,
  NO_VALUE,
  ORDER_STATUSES,
  ORGANIZATION_INTEGRATION_CONFIG,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import Claiming from '../../support/fragments/claiming/claiming';
import ExportDetails from '../../support/fragments/exportManager/exportDetails';
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
import { formatDate, formatIntlDateTime } from '../../support/utils/acquisitions';

const R = {
  ORG: 'org',
  LOCALE: 'locale',
  LOCATION: 'location',
  MATERIAL_TYPE: 'materialType',
  ACQ_METHOD: 'acquisitionMethod',
  ORDER: 'order',
  ORDER_LINE: 'orderLine',
  INTEGRATION_1: 'integration1',
  INTEGRATION_2: 'integration2',
  TAG: 'tag',
  USER: 'user',
  JOB_1: 'job1',
  JOB_2: 'job2',
};

const { EXPORT_TYPES, FILE_FORMATS, INTEGRATION_TYPES, TRANSMISSION_METHODS } =
  ORGANIZATION_INTEGRATION_CONFIG;

const TAG = `AT_C692126_TAG_${getRandomPostfix()}`;
const VENDOR_REF_NUMBER = `VRN_${getRandomPostfix()}`;
const RECEIPT_DATE = DateTools.getFutureWeekDateObj();
const INTEGRATION_NAME_PREFIX = `AT_C692126_ORG_INT_${getRandomPostfix()}`;

const PIECE_DATA = [
  {
    displaySummary: `DS1_${getRandomPostfix()}`,
    enumeration: `EN1_${getRandomPostfix()}`,
    chronology: `CH1_${getRandomPostfix()}`,
  },
  {
    displaySummary: `DS2_${getRandomPostfix()}`,
    enumeration: `EN2_${getRandomPostfix()}`,
    chronology: `CH2_${getRandomPostfix()}`,
  },
];

const getFileName = (flow, fileFormat) => {
  const org = flow.get(R.ORG);

  return {
    [FILE_FORMATS.CSV]: `csv_claims_${org.code}_${flow.get(R.INTEGRATION_1).integrationName}_*.csv`,
    [FILE_FORMATS.EDI]: `edi_claims_${org.code}_${flow.get(R.INTEGRATION_2).integrationName}_*.edi`,
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

  before('Create C692126 preconditions', () => {
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

    flow
      .step(steps.createOrganization)
      .step(steps.fetchReferenceData)
      .step(steps.createClaimingIntegrations)
      .step(steps.createTag)
      .step(steps.createOrderWithLine)
      .step(steps.markPiecesAsLate)
      .step(steps.createAndLoginUser);
  });

  after('Delete C692126 test data', () => {
    cy.getAdminToken();
    flow.cleanup();
    Object.values(FILE_FORMATS).forEach((fileFormat) => {
      FileManager.deleteFilesFromDownloadsByMask(getFileName(flow, fileFormat));
    });
  });

  it(
    'C692126 Send claim action for an organization with two integrations (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C692126'] },
    () => {
      const { locale, orderLine, integration1, integration2, user } = flow.ctx();
      const username = user.username;

      cy.log('<--- STEP 1 --->');
      TopMenu.openClaimingApp();
      Claiming.waitLoading();
      /* Filter by tag to show only test pieces */
      Claiming.filterByMultiSelectOptions(CLAIMING_FILTER_LABELS.TAGS, [TAG]);
      waitForClaimingResultsLoading();
      Claiming.assertClaimingResults([
        [{ column: 'POL number', content: orderLine.poLineNumber }],
        [{ column: 'POL number', content: orderLine.poLineNumber }],
      ]);

      cy.log('<--- STEP 2 --->');
      Claiming.selectResultsRecords([0, 1]);
      Claiming.clickActionsButton();
      Claiming.clickSendClaimOption();

      cy.log('<--- STEP 3 --->');
      Claiming.fillClaimExpiryDate(formatDate(locale, DateTools.getFutureWeekDateObj()));
      Claiming.clickSaveAndCloseInSendClaimModal();
      InteractorsTools.checkCalloutMessage(CLAIMING_CALLOUT_MESSAGES.CLAIMS_PROCESSING);
      Claiming.assertNoResultsFound();
      cy.wait(DEFAULT_WAIT_TIME);

      cy.log('<--- STEP 4 --->');
      TopMenu.openExportManagerApp();
      ExportManagerSearchPane.waitLoading();
      ExportManagerSearchPane.searchByCsvOrders();

      waitForExportManagerResultsLoading();

      /* Narrow results to records created by this test run;
         intercept to map Integration #1 name to its Job ID (All tab has no integration column) */
      Exports.interceptGetExportJobs({ alias: 'captureJobsStep4' });
      ExportManagerSearchPane.searchBySourceUserName(username);
      ExportManagerSearchPane.verifyUserSearchResult(username);
      ExportManagerSearchPane.selectUserAsSourceInSearchResult(username);

      cy.wait('@captureJobsStep4').then(({ response }) => {
        const jobs = response.body.jobRecords || [];
        const int1 = jobs.find(
          (j) => j.exportTypeSpecificParameters?.vendorEdiOrdersExportConfig?.configName ===
            integration1.integrationName,
        );

        return flow.set(R.JOB_1, int1);
      });
      waitForExportManagerResultsLoading();

      flow.step((f) => ExportManagerSearchPane.verifyJobDataInResults([f.get(R.JOB_1).name]));
      flow.step((f) => {
        const job1 = f.get(R.JOB_1);

        /* Open detail pane for Integration #1 job and verify fields */
        ExportManagerSearchPane.openJobDetailView(job1.name);
        ExportDetails.waitLoading();
        ExportManagerSearchPane.verifyJobDataInDetailView({
          jobID: job1.name,
          status: EXPORT_MANAGER_JOBS_STATUS_LABELS.SUCCESSFUL,
          jobType: EXPORT_MANAGER_JOBS_TYPES.CLAIMS,
          description: NO_VALUE,
          outputType: NO_VALUE,
          source: username,
          startDate: formatIntlDateTime(locale, job1.startDate),
          endDate: formatIntlDateTime(locale, job1.endDate),
        });
      });

      cy.log('<--- STEP 5 --->');
      flow.step((f) => {
        ExportManagerSearchPane.exportJob(f.get(R.JOB_1).name);
        cy.wait(DEFAULT_WAIT_TIME);
      });

      cy.log('<--- STEP 6 --->');
      FileManager.convertCsvToJson(getFileName(flow, FILE_FORMATS.CSV)).then((csvFileData) => {
        cy.expect(csvFileData).to.have.lengthOf(2);

        const F = EXPORT_MANAGER_CLAIMING_CSV_JOB_FIELD_LABELS;
        const rows = csvFileData.sort((a, b) => a[F.DISPLAY_SUMMARY].localeCompare(b[F.DISPLAY_SUMMARY]));

        PIECE_DATA.forEach((piece, idx) => {
          const row = rows[idx];

          cy.expect(row[F.POL_NUMBER]).to.equal(orderLine.poLineNumber);
          cy.expect(row[F.VENDOR_ORDER_NUMBER]).to.equal(VENDOR_REF_NUMBER);
          cy.expect(row[F.ACCOUNT_NUMBER]).to.equal(+flow.get(R.ORG).accounts[0].accountNo);
          cy.expect(row[F.EXPECTED_DATE]).to.not.equal('');
          cy.expect(row[F.TITLE_FROM_PIECE]).to.equal(orderLine.titleOrPackage);
          cy.expect(row[F.DISPLAY_SUMMARY]).to.equal(piece.displaySummary);
          cy.expect(row[F.CHRONOLOGY]).to.equal(piece.chronology);
          cy.expect(row[F.ENUMERATION]).to.equal(piece.enumeration);
          cy.expect(row[F.QUANTITY]).to.equal(1);
          cy.expect(row[F.EXTERNAL_NOTE]).to.equal('');
        });
      });

      cy.log('<--- STEP 7 --->');
      ExportDetails.closeJobDetails();
      /* Intercept to map Integration #2 name to its Job ID before adding EDI filter */
      Exports.interceptGetExportJobs({ alias: 'captureJobsStep7' });
      ExportManagerSearchPane.searchByEdifactOrders();

      waitForExportManagerResultsLoading();

      cy.wait('@captureJobsStep7').then(({ response }) => {
        const jobs = response.body.jobRecords || [];
        const int2 = jobs.find(
          (j) => j.exportTypeSpecificParameters?.vendorEdiOrdersExportConfig?.configName ===
            integration2.integrationName,
        );

        return flow.set(R.JOB_2, int2);
      });

      flow.step((f) => {
        [f.get(R.JOB_1).name, f.get(R.JOB_2).name].forEach((jobId) => {
          ExportManagerSearchPane.verifyJobDataInResults([jobId]);
        });
      });

      cy.log('<--- STEP 8 --->');
      flow.step((f) => {
        const job2 = f.get(R.JOB_2);

        /* Open detail pane for Integration #2 job and verify fields */
        ExportManagerSearchPane.openJobDetailView(job2.name);
        ExportDetails.waitLoading();
        ExportManagerSearchPane.verifyThirdPaneExportJobExist();
        ExportManagerSearchPane.verifyJobDataInDetailView({
          jobID: job2.name,
          status: EXPORT_MANAGER_JOBS_STATUS_LABELS.SUCCESSFUL,
          jobType: EXPORT_MANAGER_JOBS_TYPES.CLAIMS,
          description: NO_VALUE,
          outputType: NO_VALUE,
          source: username,
          startDate: formatIntlDateTime(locale, job2.startDate),
          endDate: formatIntlDateTime(locale, job2.endDate),
        });
      });

      cy.log('<--- STEP 9 --->');
      flow.step((f) => {
        ExportManagerSearchPane.exportJob(f.get(R.JOB_2).name);
        ExportDetails.waitLoading();
      });
      cy.wait(DEFAULT_WAIT_TIME);

      cy.log('<--- STEP 10 --->');
      FileManager.findDownloadedFilesByMask(getFileName(flow, FILE_FORMATS.EDI)).then(
        (downloadedFiles) => {
          const downloadedFile = downloadedFiles.sort()[downloadedFiles.length - 1];

          FileManager.readFile(downloadedFile).then((content) => {
            const { segmentsByTag } = parseEdiFile(content);

            cy.expect(segmentsByTag.RFF).to.include(`RFF+LI:${orderLine.poLineNumber}`);

            PIECE_DATA.forEach(({ chronology, displaySummary, enumeration }) => {
              cy.expect(segmentsByTag.IMD).to.include(
                `IMD+L+080+:::${displaySummary}?:${chronology}?:${enumeration}`,
              );
            });
          });
        },
      );

      cy.log('<--- STEP 11 (SKIPPED) --->');
      cy.log('<--- STEP 12 --->');
      ExportManagerSearchPane.selectOrganizationsSearch();
      ExportManagerSearchPane.waitLoading();
      ExportManagerSearchPane.filterByIntegrationTypes([
        EXPORT_MANAGER_JOBS_INTEGRATION_TYPE_FILTER_OPTION_LABELS.CLAIMS,
      ]);

      waitForExportManagerResultsLoading();

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

      cy.log('<--- STEP 13 --->');
      ExportManagerSearchPane.searchBySuccessful();
      waitForExportManagerResultsLoading();

      ExportManagerSearchPane.verifyJobDataInResults(
        [EXPORT_MANAGER_JOBS_STATUS_LABELS.SUCCESSFUL, integration1.integrationName],
        true,
      );
      ExportManagerSearchPane.verifyJobDataInResults(
        [EXPORT_MANAGER_JOBS_STATUS_LABELS.SUCCESSFUL, integration2.integrationName],
        true,
      );
    },
  );
});

function markTwoPiecesAsLate(orderLineId) {
  return Receiving.getPiecesViaApi(orderLineId).then((pieces) => {
    const piecesToMark = (pieces || []).slice(0, 2);
    const pieceUpdates = piecesToMark.map((piece, idx) => {
      return Pieces.updateOrderPieceViaApi({
        ...piece,
        receivingStatus: RECEIVING_PIECE_STATUSES.LATE,
        displaySummary: PIECE_DATA[idx].displaySummary,
        enumeration: PIECE_DATA[idx].enumeration,
        chronology: PIECE_DATA[idx].chronology,
        receiptDate: RECEIPT_DATE.toISOString().split('T')[0],
      });
    });

    return cy.wrap(Promise.all(pieceUpdates));
  });
}

function getPreconditionSteps() {
  // Precondition 1: One organization with at least one active account.
  const createOrganization = (flow) => {
    const org = NewOrganization.getDefaultOrganization({ accounts: 1 });

    Organizations.createOrganizationViaApi(org).then((orgId) => {
      flow.set(R.ORG, { ...org, id: orgId }, () => Organizations.deleteOrganizationViaApi(orgId));
    });
  };

  const fetchReferenceData = (flow) => {
    cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((location) => {
      return flow.set(R.LOCATION, location);
    });
    cy.getDefaultMaterialType().then((materialType) => flow.set(R.MATERIAL_TYPE, materialType));
    cy.getAcquisitionMethodsApi().then(({ body: { acquisitionMethods } }) => {
      flow.set(R.ACQ_METHOD, acquisitionMethods[0]);
    });
  };

  const createTag = (flow) => {
    cy.createTagApi({ label: TAG }).then((tagId) => {
      return flow.toCleanup(R.TAG, () => cy.deleteTagApi(tagId, true));
    });
  };

  // Precondition 2: Two integrations for the organization.
  // Integration #1: CSV format, File download transmission method.
  // Integration #2: EDI format, FTP transmission method (Passive connection mode, port 21).
  const createClaimingIntegrations = (flow) => {
    const commonConfig = {
      acqMethodId: flow.get(R.ACQ_METHOD).id,
      integrationType: INTEGRATION_TYPES.CLAIMING,
      type: EXPORT_TYPES.CLAIMS,
      vendorId: flow.get(R.ORG).id,
    };

    const cleanup = (integrationId) => {
      Integrations.deleteIntegrationViaApi(integrationId, { failOnStatusCode: false });
    };

    const csvFileDownloadIntegration = Integrations.getDefaultIntegration({
      ...commonConfig,
      integrationName: `${INTEGRATION_NAME_PREFIX}_${R.INTEGRATION_1}`,
      fileFormat: FILE_FORMATS.CSV,
      transmissionMethod: TRANSMISSION_METHODS.FILE_DOWNLOAD,
    });

    const ediFtpIntegration = Integrations.getDefaultIntegration({
      ...commonConfig,
      integrationName: `${INTEGRATION_NAME_PREFIX}_${R.INTEGRATION_2}`,
      fileFormat: FILE_FORMATS.EDI,
      accountNoList: flow.get(R.ORG).accounts.map(({ accountNo }) => accountNo),
      ediFtp: {
        ftpConnMode: 'Passive',
        ftpPort: '21',
      },
    });

    Integrations.createIntegrationViaApi(csvFileDownloadIntegration)
      .then(() => Integrations.getIntegrationConfigViaApi(csvFileDownloadIntegration.id))
      .then((integration) => {
        return flow.set(
          R.INTEGRATION_1,
          {
            ...integration,
            integrationName:
              integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName,
          },
          cleanup.bind(null, integration.id),
        );
      });

    Integrations.createIntegrationViaApi(ediFtpIntegration)
      .then(() => Integrations.getIntegrationConfigViaApi(ediFtpIntegration.id))
      .then((integration) => {
        return flow.set(
          R.INTEGRATION_2,
          {
            ...integration,
            integrationName:
              integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName,
          },
          cleanup.bind(null, integration.id),
        );
      });
  };

  // Precondition 3: One order with one POL:
  //   - Claiming active, claiming interval: 1 day
  //   - Vendor reference number set
  //   - Quantity: 3, receiving workflow: Synchronized, create inventory: Instance/Holding/Item
  const createOrderWithLine = (flow) => {
    const vendorId = flow.get(R.ORG).id;
    const accountNo = flow.get(R.ORG).accounts[0].accountNo;

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

    return Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId }))
      .then((order) => {
        flow.set(R.ORDER, order, () => Orders.deleteOrderViaApi(order.id, false));

        const orderLine = {
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
          acquisitionMethod: flow.get(R.ACQ_METHOD).id,
          checkinItems: false,
          cost: {
            listUnitPrice: 10,
            currency: 'USD',
            quantityPhysical: 3,
          },
          locations: [
            {
              locationId: flow.get(R.LOCATION).id,
              quantity: 3,
              quantityPhysical: 3,
            },
          ],
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: flow.get(R.MATERIAL_TYPE).id,
            materialSupplier: vendorId,
            volumes: [],
          },
          vendorDetail: {
            instructions: vendorId,
            vendorAccount: accountNo,
            referenceNumbers: [
              {
                refNumber: VENDOR_REF_NUMBER,
                refNumberType: 'Vendor order reference number',
              },
            ],
          },
          tags: {
            tagList: [TAG],
          },
          claimingActive: true,
          claimingInterval: 1,
          purchaseOrderId: order.id,
          titleOrPackage: `C692126 - ${getRandomPostfix()}`,
        };

        return OrderLines.createOrderLineViaApi(orderLine);
      })
      .then((createdOrderLine) => {
        flow.set(R.ORDER_LINE, createdOrderLine, () => cleanup(createdOrderLine.id));

        return Orders.updateOrderViaApi({
          ...flow.get(R.ORDER),
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      })
      .then(() => Orders.getOrderByIdViaApi(flow.get(R.ORDER).id))
      .then((order) => flow.set(R.ORDER, order));
  };

  // Precondition 4: Two of three pieces are marked as 'Late' with display summary,
  //   enumeration, chronology, and expected receipt date set.
  const markPiecesAsLate = (flow) => {
    markTwoPiecesAsLate(flow.get(R.ORDER_LINE).id);
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
    createOrderWithLine,
    createOrganization,
    createTag,
    fetchReferenceData,
    markPiecesAsLate,
  };
}
