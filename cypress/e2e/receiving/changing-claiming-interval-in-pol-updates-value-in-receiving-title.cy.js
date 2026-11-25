import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import { RECEIVING_PIECE_FORM_FIELD_LABELS } from '../../support/constants/receiving/piece';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstances } from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../support/constants';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    organization: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C770417_Organization_${randomPostfix}`,
    },
    orderLineTitle: `AT_C770417_Title_${randomPostfix}`,
    pastReceiptDateForApi: `${DateTools.getFormattedDate({ date: DateTools.addDays(-1) })}T12:00:00.000+00:00`,
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
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
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.orderLineTitle,
            quantity: 2,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
          claimingActive: false,
        }).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.orderLine = openedOrderLine;
          });
          Pieces.getOrderPiecesViaApi({ query: `poLineId==${orderLine.id}` }).then(
            ({ pieces: [piece] }) => {
              Pieces.updateOrderPieceViaApi({
                ...piece,
                receiptDate: testData.pastReceiptDateForApi,
              });
            },
          );
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiOrdersOrdersEdit,
          CapabilitySets.uiReceivingView,
          CapabilitySets.uiInventoryInstanceView,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.updateOrderViaApi(
      { ...testData.order, workflowStatus: ORDER_STATUSES.PENDING },
      true,
      false,
    );
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C770417 Changing the claiming interval in the PO line updates the value in the receiving title (not a package) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C770417'] },
    () => {
      // Step 1: Open Order → click PO line - verify claiming active unchecked, interval blank
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.openPolDetails(testData.orderLineTitle);
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.CLAIMING_ACTIVE,
            checkbox: true,
            value: { checked: false, disabled: true },
          },
          { key: POLINE_DETAILS_FIELDS.CLAIMING_INTERVAL, value: '-' },
        ],
      });

      // Step 2: Edit POL - verify claiming active unchecked, interval disabled and blank
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: false } },
        { label: 'claimingInterval', conditions: { disabled: true, value: '' } },
      ]);

      // Step 3: Check "Claiming active", fill interval = 1
      OrderLineEditForm.fillOrderLineFields({
        poLineDetails: { claimingActive: true, claimingInterval: '1' },
      });
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: true } },
      ]);

      // Step 4: Save & close - verify claiming active checked, interval = 1
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.CLAIMING_ACTIVE,
            checkbox: true,
            value: { checked: true, disabled: true },
          },
          { key: POLINE_DETAILS_FIELDS.CLAIMING_INTERVAL, value: '1' },
        ],
      });

      // Step 5: Actions → Receive → open title - verify claiming active checked, interval = 1; two Expected pieces
      OrderLines.openReceiving();
      Receivings.waitLoading();
      Receivings.selectFromResultsList(testData.orderLineTitle);
      ReceivingDetails.expandTitleInformationAccordion();
      ReceivingDetails.verifyTitleInformationClaimingDetails({
        claimingActive: true,
        claimingInterval: '1',
      });
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.checkExpectedTableContent([
        { status: RECEIVING_PIECE_STATUSES.EXPECTED },
        { status: RECEIVING_PIECE_STATUSES.EXPECTED },
      ]);

      // Step 6: Run pieces claiming batch job
      cy.getAdminToken();
      Pieces.processClaimingViaApi().then((response) => {
        expect(response.status).to.equal(200);
      });
      cy.getUserToken(testData.user.username, testData.user.password);

      // Step 7: Navigate back to the title - verify one Late and one Expected
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.searchByParameter({ value: testData.orderLineTitle });
      Receivings.selectFromResultsList(testData.orderLineTitle);
      ReceivingDetails.checkExpectedTableContent([
        { status: RECEIVING_PIECE_STATUSES.LATE },
        { status: RECEIVING_PIECE_STATUSES.EXPECTED },
      ]);

      // Step 8: Open POL via "POL details" link → Edit - verify claiming active checked, interval = 1
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'claimingActive', conditions: { checked: true } },
        { label: 'claimingInterval', conditions: { value: '1' } },
      ]);

      // Step 9: Change interval to 2, save - verify claiming active checked, interval = 2
      OrderLineEditForm.fillOrderLineFields({ poLineDetails: { claimingInterval: '2' } });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.CLAIMING_ACTIVE,
            checkbox: true,
            value: { checked: true, disabled: true },
          },
          { key: POLINE_DETAILS_FIELDS.CLAIMING_INTERVAL, value: '2' },
        ],
      });

      // Step 10: Actions → Receive → open title - verify interval = 2, still Late + Expected
      OrderLines.openReceiving();
      Receivings.waitLoading();
      Receivings.selectFromResultsList(testData.orderLineTitle);
      ReceivingDetails.expandTitleInformationAccordion();
      ReceivingDetails.verifyTitleInformationClaimingDetails({
        claimingActive: true,
        claimingInterval: '2',
      });
      ReceivingDetails.checkExpectedTableContent([
        { status: RECEIVING_PIECE_STATUSES.LATE },
        { status: RECEIVING_PIECE_STATUSES.EXPECTED },
      ]);

      // Step 11: Open POL via "POL details" link → Edit → uncheck "Claiming active", save
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.openOrderLineEditForm();
      OrderLines.claimingActive();
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.CLAIMING_ACTIVE,
            checkbox: true,
            value: { checked: false, disabled: true },
          },
          { key: POLINE_DETAILS_FIELDS.CLAIMING_INTERVAL, value: '-' },
        ],
      });

      // Step 12: Actions → Receive → open title - verify claiming inactive, interval blank, still Late + Expected
      OrderLines.openReceiving();
      Receivings.waitLoading();
      Receivings.selectFromResultsList(testData.orderLineTitle);
      ReceivingDetails.expandTitleInformationAccordion();
      ReceivingDetails.verifyTitleInformationClaimingDetails({
        claimingActive: false,
        claimingInterval: '-',
      });
      ReceivingDetails.checkExpectedTableContent([
        { status: RECEIVING_PIECE_STATUSES.LATE },
        { status: RECEIVING_PIECE_STATUSES.EXPECTED },
      ]);

      // Step 13: Edit Expected piece - set receipt date to last week, save - still Late + Expected
      ReceivingDetails.openEditPieceModal({ row: 1 });
      EditPieceModal.waitLoading();
      EditPieceModal.fillPieceDetails({
        [RECEIVING_PIECE_FORM_FIELD_LABELS.EXPECTED_RECEIPT_DATE]: DateTools.getFormattedDate({
          date: DateTools.addDays(-7),
        }),
      });
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkExpectedTableContent([
        { status: RECEIVING_PIECE_STATUSES.LATE },
        { status: RECEIVING_PIECE_STATUSES.EXPECTED },
      ]);

      // Step 14: Run pieces claiming batch job
      cy.getAdminToken();
      Pieces.processClaimingViaApi().then((response) => {
        expect(response.status).to.equal(200);
      });
      cy.getUserToken(testData.user.username, testData.user.password);

      // Step 15: Navigate back - claiming inactive; batch job has no effect; still Late + Expected
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.searchByParameter({ value: testData.orderLineTitle });
      Receivings.selectFromResultsList(testData.orderLineTitle);
      ReceivingDetails.expandTitleInformationAccordion();
      ReceivingDetails.verifyTitleInformationClaimingDetails({
        claimingActive: false,
        claimingInterval: '-',
      });
      ReceivingDetails.checkExpectedTableContent([
        { status: RECEIVING_PIECE_STATUSES.LATE },
        { status: RECEIVING_PIECE_STATUSES.EXPECTED },
      ]);
    },
  );
});
