import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  EXPORT_MANAGER_EDI_JOB_FIELD_LABELS,
  EXPORT_MANAGER_JOB_ERROR_DETAILS,
  EXPORT_MANAGER_JOBS_INTEGRATION_TYPE_FILTER_OPTION_LABELS,
  EXPORT_MANAGER_JOBS_STATUS_LABELS,
  ORDER_STATUSES,
  ORGANIZATION_INTEGRATION_CONFIG,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { ExportDetails, ExportManagerSearchPane } from '../../support/fragments/exportManager';
import {
  BasicOrderLine,
  NewOrder,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import {
  Integrations,
  NewOrganization,
  Organizations,
} from '../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import SendClaimModal from '../../support/fragments/receiving/modals/sendClaimModal';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

const { EXPORT_TYPES, FILE_FORMATS, INTEGRATION_TYPES, TRANSMISSION_METHODS } =
  ORGANIZATION_INTEGRATION_CONFIG;
const {
  DESCRIPTION,
  ERROR_DETAILS,
  EXPORT_METHOD,
  FILE_NAME,
  ORGANIZATION,
  SENT_TO,
  SOURCE,
  STATUS,
} = EXPORT_MANAGER_EDI_JOB_FIELD_LABELS;

const JOB_RERUN_MESSAGE = 'was successfully rerun.';
const EMPTY_VALUE = '-';
const SENT_TO_DOWNLOAD = 'Download';

describe('Receiving', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    organization1: {
      ...NewOrganization.getDefaultOrganization({ accounts: 1 }),
      name: `AT_C692110_Organization1_${randomPostfix}`,
    },
    organization2: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C692110_Organization2_${randomPostfix}`,
    },
    integrationName: `AT_C692110_Integration_${randomPostfix}`,
    orderLine1Title: `AT_C692110_Title1_${randomPostfix}`,
    orderLine2Title: `AT_C692110_Title2_${randomPostfix}`,
    expectedPieceSummary: `AT_C692110_Pcs1_${randomPostfix}`,
    latePieceSummary: `AT_C692110_Pcs2_${randomPostfix}`,
    noIntegrationPieceSummary: `AT_C692110_Pcs3_${randomPostfix}`,
    internalNote: `AT_C692110_internal_note_${randomPostfix}`,
    externalNote: `AT_C692110_external_note_${randomPostfix}`,
    claimExpiryDate: DateTools.getFormattedDate(
      { date: DateTools.getFutureWeekDateObj() },
      'MM/DD/YYYY',
    ),
    location: {},
    materialType: {},
    acquisitionMethod: {},
    integration: {},
    order1: {},
    order2: {},
    orderLine1: {},
    orderLine2: {},
    user: {},
  };

  const createOrderWithOrderLine = ({ organization, title, quantity, vendorAccount }) => {
    return Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: organization.id })).then(
      (order) => {
        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title,
            quantity,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
          vendorDetail: { instructions: '', vendorAccount, referenceNumbers: [] },
          claimingActive: true,
          claimingInterval: 1,
        }).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });

          return cy.wrap({ order, orderLine });
        });
      },
    );
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization1).then((organizationId) => {
      testData.organization1.id = organizationId;
    });
    Organizations.createOrganizationViaApi(testData.organization2).then((organizationId) => {
      testData.organization2.id = organizationId;
    });
    Locations.getViaApiAnyDefault().then((locations) => {
      [testData.location] = locations;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });
    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
    }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    cy.then(() => {
      // Organization #1 has a claiming integration (CSV, file download), Organization #2 has none
      const integration = Integrations.getDefaultIntegration({
        integrationName: testData.integrationName,
        vendorId: testData.organization1.id,
        acqMethodId: testData.acquisitionMethod.id,
        integrationType: INTEGRATION_TYPES.CLAIMING,
        type: EXPORT_TYPES.CLAIMS,
        fileFormat: FILE_FORMATS.CSV,
        transmissionMethod: TRANSMISSION_METHODS.FILE_DOWNLOAD,
      });

      Integrations.createIntegrationViaApi(integration).then((createdIntegration) => {
        testData.integration = createdIntegration;
      });

      // Order #1: quantity 2, one piece is "Late"
      createOrderWithOrderLine({
        organization: testData.organization1,
        title: testData.orderLine1Title,
        quantity: 2,
        vendorAccount: testData.organization1.accounts[0].accountNo,
      }).then(({ order, orderLine }) => {
        testData.order1 = order;

        OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
          testData.orderLine1 = openedOrderLine;
        });

        Pieces.getOrderPiecesViaApi({ query: `poLineId==${orderLine.id}` }).then(
          ({ pieces: [expectedPiece, latePiece] }) => {
            Pieces.updateOrderPieceViaApi({
              ...expectedPiece,
              displaySummary: testData.expectedPieceSummary,
            });
            Pieces.updateOrderPieceViaApi({
              ...latePiece,
              displaySummary: testData.latePieceSummary,
              receivingStatus: RECEIVING_PIECE_STATUSES.LATE,
            });
          },
        );
      });

      // Order #2: quantity 1
      createOrderWithOrderLine({
        organization: testData.organization2,
        title: testData.orderLine2Title,
        quantity: 1,
      }).then(({ order, orderLine }) => {
        testData.order2 = order;

        OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
          testData.orderLine2 = openedOrderLine;
        });

        Pieces.getOrderPiecesViaApi({ query: `poLineId==${orderLine.id}` }).then(
          ({ pieces: [piece] }) => {
            Pieces.updateOrderPieceViaApi({
              ...piece,
              displaySummary: testData.noIntegrationPieceSummary,
            });
          },
        );
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiReceivingEdit,
          CapabilitySets.uiExportManagerExportManagerManage,
          CapabilitySets.uiOrganizationsView,
          CapabilitySets.uiExportManagerJobsDownloadAndResendExecute,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
      });
      Receivings.searchByParameter({ value: testData.orderLine1Title });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    [testData.order1, testData.order2].forEach((order) => {
      Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.PENDING }, true, false);
      Orders.deleteOrderViaApi(order.id, false);
    });
    [testData.orderLine1, testData.orderLine2].forEach((orderLine) => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(orderLine.instanceId);
    });
    Integrations.deleteIntegrationViaApi(testData.integration.id);
    Organizations.deleteOrganizationViaApi(testData.organization1.id);
    Organizations.deleteOrganizationViaApi(testData.organization2.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C692110 Send claim action in Receiving app (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C692110'] },
    () => {
      // Step 1: Click on Title record related to PO line from Order #1
      Receivings.selectFromResultsList(testData.orderLine1Title);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine1Title);
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.expectedPieceSummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        testData.latePieceSummary,
        RECEIVING_PIECE_STATUSES.LATE,
      );

      // Step 2: Open the "Expected" piece, select "Send claim" option
      ReceivingDetails.openEditPieceModal({ displaySummary: testData.expectedPieceSummary });
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSendClaimButton();
      SendClaimModal.verifyModalView({ hasIntegration: true });

      // Step 3: Select a future date, click "Save & close"
      SendClaimModal.fillClaimExpiryDate(testData.claimExpiryDate);
      SendClaimModal.clickSaveAndCloseButton();
      InteractorsTools.checkCalloutErrorMessage(ReceivingStates.pieceMustBeLate);
      InteractorsTools.closeCalloutMessage();

      // Step 4: Close "Edit piece" form
      EditPieceModal.clickCancelButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine1Title);
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.expectedPieceSummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        testData.latePieceSummary,
        RECEIVING_PIECE_STATUSES.LATE,
      );

      // Step 5: Open the "Late" piece, send claim with a future date and notes
      ReceivingDetails.openEditPieceModal({ displaySummary: testData.latePieceSummary });
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSendClaimButton();
      SendClaimModal.fillClaimExpiryDate(testData.claimExpiryDate);
      SendClaimModal.fillInternalNote(testData.internalNote);
      SendClaimModal.fillExternalNote(testData.externalNote);
      SendClaimModal.clickSaveAndCloseButton();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      InteractorsTools.closeCalloutMessage();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine1Title);
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.expectedPieceSummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        testData.latePieceSummary,
        RECEIVING_PIECE_STATUSES.CLAIM_SENT,
      );

      // Step 6: Open the "Claim sent" piece, the notes are populated
      ReceivingDetails.openEditPieceModal({ displaySummary: testData.latePieceSummary });
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.INTERNAL_NOTE,
          conditions: { value: testData.internalNote },
        },
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.EXTERNAL_NOTE,
          conditions: { value: testData.externalNote },
        },
      ]);

      // Step 7: Go to "Export manager", filter organization jobs by "Claims" integration type
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
      ExportManagerSearchPane.selectOrganizationsSearch();
      ExportManagerSearchPane.waitLoading();
      ExportManagerSearchPane.filterByIntegrationTypes([
        EXPORT_MANAGER_JOBS_INTEGRATION_TYPE_FILTER_OPTION_LABELS.CLAIMS,
      ]);
      ExportManagerSearchPane.selectExportMethod(testData.integrationName);
      ExportManagerSearchPane.verifyJobDataInResults(
        [EXPORT_MANAGER_JOBS_STATUS_LABELS.SUCCESSFUL, testData.integrationName],
        true,
      );
      cy.wait(5000);
      ExportManagerSearchPane.verifyJobsCountInResults(1);

      // Step 8: Open the claiming job
      ExportManagerSearchPane.selectJobByIntegrationInList(testData.integrationName);
      ExportDetails.verifyJobLabels();
      ExportDetails.checkExportJobDetails({
        exportInformation: [
          { key: STATUS, value: EXPORT_MANAGER_JOBS_STATUS_LABELS.SUCCESSFUL },
          { key: SOURCE, value: testData.user.username },
          { key: ORGANIZATION, value: testData.organization1.name },
          { key: EXPORT_METHOD, value: testData.integrationName },
          { key: SENT_TO, value: SENT_TO_DOWNLOAD },
          {
            key: FILE_NAME,
            value: `csv_claims_${testData.organization1.code}_${testData.integrationName}_`,
          },
          { key: FILE_NAME, value: '.csv' },
          { key: DESCRIPTION, value: EMPTY_VALUE },
          { key: ERROR_DETAILS, value: EMPTY_VALUE },
        ],
      });

      // Step 9: Click "Actions" -> "Rerun"
      ExportManagerSearchPane.rerunJob({ waitMs: 1_000 });
      InteractorsTools.checkCalloutContainsMessage(JOB_RERUN_MESSAGE);
      InteractorsTools.closeCalloutMessage();
      ExportManagerSearchPane.verifyJobsCountInResults(2);
      ExportManagerSearchPane.checkColumnInResultsTable({
        status: EXPORT_MANAGER_JOBS_STATUS_LABELS.SUCCESSFUL,
      });

      // Step 10: Click "Actions" -> "Resend", refresh the page
      ExportManagerSearchPane.resendJob({});
      cy.reload();
      ExportDetails.waitLoading();
      ExportDetails.checkExportJobDetails({
        exportInformation: [
          { key: STATUS, value: EXPORT_MANAGER_JOBS_STATUS_LABELS.FAILED },
          {
            key: ERROR_DETAILS,
            value: EXPORT_MANAGER_JOB_ERROR_DETAILS.RESEND_TRANSMISSION_METHOD_NOT_FTP,
          },
        ],
      });

      // Step 11: Go back to "Receiving" app, open the Title related to PO line #2
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.searchByParameter({ value: testData.orderLine2Title });
      Receivings.selectFromResultsList(testData.orderLine2Title);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine2Title);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.noIntegrationPieceSummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );

      // Step 12: Open the "Expected" piece, select "Send claim" option
      ReceivingDetails.openEditPieceModal({ displaySummary: testData.noIntegrationPieceSummary });
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSendClaimButton();
      SendClaimModal.verifyModalView({ hasIntegration: false });

      // Step 13: Select a future date, click "Save & close"
      SendClaimModal.fillClaimExpiryDate(testData.claimExpiryDate);
      SendClaimModal.clickSaveAndCloseButton();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      InteractorsTools.closeCalloutMessage();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine2Title);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.noIntegrationPieceSummary,
        RECEIVING_PIECE_STATUSES.CLAIM_SENT,
      );
    },
  );
});
