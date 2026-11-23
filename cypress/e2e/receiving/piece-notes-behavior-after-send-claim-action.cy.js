import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  EXPORT_MANAGER_CLAIMING_CSV_JOB_FIELD_LABELS,
  EXPORT_MANAGER_JOBS_INTEGRATION_TYPE_FILTER_OPTION_LABELS,
  EXPORT_MANAGER_JOBS_STATUS_LABELS,
  EXPORT_MANAGER_JOBS_TYPES,
  ORDER_STATUSES,
  ORGANIZATION_INTEGRATION_CONFIG,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { ExportManagerSearchPane, Exports } from '../../support/fragments/exportManager';
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
import FileManager from '../../support/utils/fileManager';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

const { EXPORT_TYPES, FILE_FORMATS, INTEGRATION_TYPES, TRANSMISSION_METHODS } =
  ORGANIZATION_INTEGRATION_CONFIG;
const { INTERNAL_NOTE, EXTERNAL_NOTE } = RECEIVING_PIECE_FORM_FIELD_LABELS;

describe('Receiving', () => {
  const randomPostfix = getRandomPostfix();
  const buildPiece = (key, { withNotes = true } = {}) => ({
    displaySummary: `AT_C1602438_piece${key}_${randomPostfix}`,
    internalNote: withNotes ? `Internal note ${key}` : undefined,
    externalNote: withNotes ? `External note ${key}` : undefined,
  });
  const testData = {
    organizationWithIntegration: {
      ...NewOrganization.getDefaultOrganization({ accounts: 1 }),
      name: `AT_C1602438_OrganizationA_${randomPostfix}`,
    },
    organizationWithoutIntegration: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C1602438_OrganizationB_${randomPostfix}`,
    },
    integrationName: `AT_C1602438_Integration_${randomPostfix}`,
    orderLine1Title: `AT_C1602438_TitleA_${randomPostfix}`,
    orderLine2Title: `AT_C1602438_TitleB_${randomPostfix}`,
    piecesA: ['A1', 'A2', 'A3', 'A4'].map((key) => buildPiece(key)),
    piecesB: ['B1', 'B2', 'B3', 'B4', 'B5'].map((key) =>
      buildPiece(key, { withNotes: key !== 'B4' }),
    ),
    newNotes: {
      internalA2: 'New internal note A2',
      externalA2: 'New external note A2',
      editedInternalA4: 'Edited internal note A4',
      internalB2: 'New internal note B2',
      externalB2: 'New external note B2',
      internalB4: 'New internal note B4',
      externalB4: 'New external note B4',
    },
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
    exportJobs: [],
    user: {},
  };
  const [pieceA1, pieceA2, pieceA3, pieceA4] = testData.piecesA;
  const [pieceB1, pieceB2, pieceB3, pieceB4, pieceB5] = testData.piecesB;
  const csvFileMask = `csv_claims_${testData.organizationWithIntegration.code}_${testData.integrationName}_*.csv`;
  const getClaimJobsQuery = (vendorId) => ({
    query: `(type=="${EXPORT_MANAGER_JOBS_TYPES.CLAIMS}" and jsonb.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.vendorId=="${vendorId}")`,
    limit: 10,
  });

  const createOrderWithLatePieces = ({ organization, title, pieces, vendorAccount }) => {
    return Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: organization.id })).then(
      (order) => {
        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title,
            quantity: pieces.length,
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

          Pieces.getOrderPiecesViaApi({ query: `poLineId==${orderLine.id}` }).then(
            ({ pieces: orderPieces }) => {
              orderPieces.forEach((orderPiece, index) => {
                Pieces.updateOrderPieceViaApi({
                  ...orderPiece,
                  ...pieces[index],
                  receivingStatus: RECEIVING_PIECE_STATUSES.LATE,
                });
              });
            },
          );

          return OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            return cy.wrap({ order, orderLine: openedOrderLine });
          });
        });
      },
    );
  };

  const openPiece = (piece) => {
    ReceivingDetails.openEditPieceModal({ displaySummary: piece.displaySummary });
    EditPieceModal.waitLoading();
  };

  const openSendClaimModal = () => {
    EditPieceModal.openActionsMenu();
    EditPieceModal.clickSendClaimButton();
  };

  const saveClaimAndCheckStatus = (piece) => {
    SendClaimModal.fillClaimExpiryDate(testData.claimExpiryDate);
    SendClaimModal.clickSaveAndCloseButton();
    InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
    InteractorsTools.closeCalloutMessage();
    ReceivingDetails.checkExpectedPieceStatus(
      piece.displaySummary,
      RECEIVING_PIECE_STATUSES.CLAIM_SENT,
    );
  };

  const checkPieceNotes = ({ internalNote = '', externalNote = '' }) => {
    EditPieceModal.checkFieldsConditions([
      { label: INTERNAL_NOTE, conditions: { value: internalNote } },
      { label: EXTERNAL_NOTE, conditions: { value: externalNote } },
    ]);
  };

  const openTitleAndCheckLatePieces = (title, pieces) => {
    Receivings.searchByParameter({ value: title });
    Receivings.selectFromResultsList(title);
    ReceivingDetails.checkTitlePaneIsDisplayed(title);
    ReceivingDetails.verifyExpectedRecordsCount(pieces.length);
    pieces.forEach(({ displaySummary }) => {
      ReceivingDetails.checkExpectedPieceStatus(displaySummary, RECEIVING_PIECE_STATUSES.LATE);
    });
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    cy.getAdminToken();
    FileManager.deleteFilesFromDownloadsByMask(csvFileMask);
    Organizations.createOrganizationViaApi(testData.organizationWithIntegration).then(
      (organizationId) => {
        testData.organizationWithIntegration.id = organizationId;
      },
    );
    Organizations.createOrganizationViaApi(testData.organizationWithoutIntegration).then(
      (organizationId) => {
        testData.organizationWithoutIntegration.id = organizationId;
      },
    );
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
      // Organization A has a claiming integration (CSV, file download), Organization B has none
      Integrations.createIntegrationViaApi(
        Integrations.getDefaultIntegration({
          integrationName: testData.integrationName,
          vendorId: testData.organizationWithIntegration.id,
          acqMethodId: testData.acquisitionMethod.id,
          integrationType: INTEGRATION_TYPES.CLAIMING,
          type: EXPORT_TYPES.CLAIMS,
          fileFormat: FILE_FORMATS.CSV,
          transmissionMethod: TRANSMISSION_METHODS.FILE_DOWNLOAD,
        }),
      ).then((createdIntegration) => {
        testData.integration = createdIntegration;
      });

      // Order #1: quantity 4, all pieces are "Late"
      createOrderWithLatePieces({
        organization: testData.organizationWithIntegration,
        title: testData.orderLine1Title,
        pieces: testData.piecesA,
        vendorAccount: testData.organizationWithIntegration.accounts[0].accountNo,
      }).then(({ order, orderLine }) => {
        testData.order1 = order;
        testData.orderLine1 = orderLine;
      });

      // Order #2: quantity 5, all pieces are "Late"
      createOrderWithLatePieces({
        organization: testData.organizationWithoutIntegration,
        title: testData.orderLine2Title,
        pieces: testData.piecesB,
      }).then(({ order, orderLine }) => {
        testData.order2 = order;
        testData.orderLine2 = orderLine;
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingEdit,
          CapabilitySets.uiExportManagerExportManagerManage,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
      });
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
    Organizations.deleteOrganizationViaApi(testData.organizationWithIntegration.id);
    Organizations.deleteOrganizationViaApi(testData.organizationWithoutIntegration.id);
    Users.deleteViaApi(testData.user.userId);
    FileManager.deleteFilesFromDownloadsByMask(csvFileMask);
  });

  it(
    'C1602438 Piece notes behavior after Send claim action in Receiving app for organizations with and without claiming integration (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1602438'] },
    () => {
      // Step 1: Search for the title of Order #1 and click on it
      openTitleAndCheckLatePieces(testData.orderLine1Title, testData.piecesA);

      // Step 2: Open pieceA1, select "Send claim" option
      openPiece(pieceA1);
      openSendClaimModal();
      SendClaimModal.verifyModalView({
        hasIntegration: true,
        internalNote: pieceA1.internalNote,
        externalNote: pieceA1.externalNote,
      });

      // Step 3: Select a future date, do not change notes, click "Save & close"
      saveClaimAndCheckStatus(pieceA1);

      // Step 4: Open pieceA1, notes are kept
      openPiece(pieceA1);
      checkPieceNotes(pieceA1);

      // Step 5: Send claim for pieceA2 with replaced notes
      EditPieceModal.clickCancelButton();
      openPiece(pieceA2);
      openSendClaimModal();
      SendClaimModal.fillInternalNote(testData.newNotes.internalA2);
      SendClaimModal.fillExternalNote(testData.newNotes.externalA2);
      saveClaimAndCheckStatus(pieceA2);

      // Step 6: Open pieceA2, notes are replaced
      openPiece(pieceA2);
      checkPieceNotes({
        internalNote: testData.newNotes.internalA2,
        externalNote: testData.newNotes.externalA2,
      });

      // Step 7: Send claim for pieceA3 with cleared notes
      EditPieceModal.clickCancelButton();
      openPiece(pieceA3);
      openSendClaimModal();
      SendClaimModal.fillInternalNote('');
      SendClaimModal.fillExternalNote('');
      saveClaimAndCheckStatus(pieceA3);

      // Step 8: Open pieceA3, notes are empty
      openPiece(pieceA3);
      checkPieceNotes({});

      // Step 9: Replace "Internal note" of pieceA4 in "Edit piece" form, select "Send claim" option
      EditPieceModal.clickCancelButton();
      openPiece(pieceA4);
      EditPieceModal.fillPieceDetails({ [INTERNAL_NOTE]: testData.newNotes.editedInternalA4 });
      openSendClaimModal();
      SendClaimModal.verifyModalView({
        hasIntegration: true,
        internalNote: testData.newNotes.editedInternalA4,
        externalNote: pieceA4.externalNote,
      });

      // Step 10: Select a future date, clear "External note", click "Save & close"
      SendClaimModal.fillExternalNote('');
      saveClaimAndCheckStatus(pieceA4);

      // Step 11: Open pieceA4, edited internal note is kept, external note is empty
      openPiece(pieceA4);
      checkPieceNotes({ internalNote: testData.newNotes.editedInternalA4 });

      // Step 12: Search for the title of Order #2 and click on it
      EditPieceModal.clickCancelButton();
      openTitleAndCheckLatePieces(testData.orderLine2Title, testData.piecesB);

      // Step 13: Open pieceB1, select "Send claim" option
      openPiece(pieceB1);
      openSendClaimModal();
      SendClaimModal.verifyModalView({
        hasIntegration: false,
        internalNote: pieceB1.internalNote,
        externalNote: pieceB1.externalNote,
      });

      // Step 14: Select a future date, do not change notes, click "Save & close"
      saveClaimAndCheckStatus(pieceB1);

      // Step 15: Open pieceB1, notes are kept
      openPiece(pieceB1);
      checkPieceNotes(pieceB1);

      // Step 16: Send claim for pieceB2 with replaced notes
      EditPieceModal.clickCancelButton();
      openPiece(pieceB2);
      openSendClaimModal();
      SendClaimModal.fillInternalNote(testData.newNotes.internalB2);
      SendClaimModal.fillExternalNote(testData.newNotes.externalB2);
      saveClaimAndCheckStatus(pieceB2);

      // Step 17: Open pieceB2, notes are replaced
      openPiece(pieceB2);
      checkPieceNotes({
        internalNote: testData.newNotes.internalB2,
        externalNote: testData.newNotes.externalB2,
      });

      // Step 18: Send claim for pieceB3 with cleared notes
      EditPieceModal.clickCancelButton();
      openPiece(pieceB3);
      openSendClaimModal();
      SendClaimModal.fillInternalNote('');
      SendClaimModal.fillExternalNote('');
      saveClaimAndCheckStatus(pieceB3);

      // Step 19: Open pieceB3, notes are empty
      openPiece(pieceB3);
      checkPieceNotes({});

      // Step 20: Open pieceB4 (no notes), select "Send claim" option
      EditPieceModal.clickCancelButton();
      openPiece(pieceB4);
      openSendClaimModal();
      SendClaimModal.verifyModalView({ hasIntegration: false, internalNote: '', externalNote: '' });

      // Step 21: Select a future date, fill in notes, click "Save & close"
      SendClaimModal.fillInternalNote(testData.newNotes.internalB4);
      SendClaimModal.fillExternalNote(testData.newNotes.externalB4);
      saveClaimAndCheckStatus(pieceB4);

      // Step 22: Open pieceB4, notes are populated
      openPiece(pieceB4);
      checkPieceNotes({
        internalNote: testData.newNotes.internalB4,
        externalNote: testData.newNotes.externalB4,
      });

      // Step 23: Send claim for pieceB5 with cleared "External note" only
      EditPieceModal.clickCancelButton();
      openPiece(pieceB5);
      openSendClaimModal();
      SendClaimModal.fillExternalNote('');
      saveClaimAndCheckStatus(pieceB5);

      // Step 24: Open pieceB5, internal note is kept, external note is empty
      openPiece(pieceB5);
      checkPieceNotes({ internalNote: pieceB5.internalNote });

      // Step 25: Go to "Export manager", filter organization jobs by "Claims" integration type
      EditPieceModal.clickCancelButton();
      Exports.getExportJobsViaApi(getClaimJobsQuery(testData.organizationWithIntegration.id)).then(
        ({ jobRecords }) => {
          expect(jobRecords).to.have.lengthOf(testData.piecesA.length);
          testData.exportJobs = jobRecords;
          jobRecords.forEach(({ id }) => Exports.getFinishedExportJobViaApi(id));
        },
      );
      Exports.getExportJobsViaApi(
        getClaimJobsQuery(testData.organizationWithoutIntegration.id),
      ).then(({ jobRecords }) => {
        expect(jobRecords).to.have.lengthOf(0);
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
      ExportManagerSearchPane.selectOrganizationsSearch();
      ExportManagerSearchPane.waitLoading();
      ExportManagerSearchPane.filterByIntegrationTypes([
        EXPORT_MANAGER_JOBS_INTEGRATION_TYPE_FILTER_OPTION_LABELS.CLAIMS,
      ]);
      ExportManagerSearchPane.selectExportMethod(testData.integrationName);
      cy.then(() => {
        testData.exportJobs.forEach(({ name }) => {
          ExportManagerSearchPane.verifyJobDataInResults(
            [name, EXPORT_MANAGER_JOBS_STATUS_LABELS.SUCCESSFUL, testData.integrationName],
            true,
          );
        });
      });
      ExportManagerSearchPane.verifyJobsCountInResults(testData.piecesA.length);

      // Step 26: Click "Job ID" link of each claiming job, open the downloaded CSV files
      const exportedExternalNotes = {};
      cy.then(() => {
        testData.exportJobs.forEach(({ name }) => {
          ExportManagerSearchPane.clickJobLinkByIntegrationInList(name, { isEdiJobsList: true });
          FileManager.convertCsvToJson(csvFileMask).then(([row]) => {
            exportedExternalNotes[
              row[EXPORT_MANAGER_CLAIMING_CSV_JOB_FIELD_LABELS.DISPLAY_SUMMARY]
            ] = row[EXPORT_MANAGER_CLAIMING_CSV_JOB_FIELD_LABELS.EXTERNAL_NOTE];
          });
          FileManager.deleteFilesFromDownloadsByMask(csvFileMask);
        });
      });
      cy.then(() => {
        expect(exportedExternalNotes).to.deep.equal({
          [pieceA1.displaySummary]: pieceA1.externalNote,
          [pieceA2.displaySummary]: testData.newNotes.externalA2,
          [pieceA3.displaySummary]: '',
          [pieceA4.displaySummary]: '',
        });
      });
    },
  );
});
