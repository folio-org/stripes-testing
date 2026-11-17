import { v4 as uuid } from 'uuid';

import {
  EXPECTED_TABLE_COLUMN_HEADERS,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_FORMATS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstances } from '../../support/fragments/inventory';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import {
  ReceivingDetails,
  Receivings,
  ReceivingsListEditForm,
} from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

const polReceiptDateObj = DateTools.getFutureWeekDateObj();
const polReceiptDate = DateTools.getFormattedDate({ date: polReceiptDateObj }, 'MM/DD/YYYY');
const polReceiptDateForApi = `${DateTools.getFormattedDate({ date: polReceiptDateObj })}T12:00:00.000+00:00`;
const editedReceiptDate = DateTools.getTomorrowDayDateForFiscalYear();
const POL_RECEIPT_DATE_DETAILS = [
  { key: EXPECTED_TABLE_COLUMN_HEADERS.EXPECTED_RECEIPT_DATE, value: polReceiptDate },
];

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C805752_Organization_${postfix}`,
      },
      physicalTitle: `AT_C805752_FolioInstance_Physical_${postfix}`,
      peMixTitle: `AT_C805752_FolioInstance_PEMix_${postfix}`,
      otherTitle: `AT_C805752_FolioInstance_Other_${postfix}`,
      orders: [],
      orderLines: [],
    };

    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault().then(([location]) => {
      testData.location = location;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });
    cy.getAcquisitionMethodsApi({ limit: 1 }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    cy.then(() => {
      const physicalDetails = {
        materialType: testData.materialType.id,
        materialSupplier: testData.organization.id,
        expectedReceiptDate: polReceiptDateForApi,
        volumes: [],
      };
      // Order #1 - Physical, Order #2 - P/E mix, Order #3 - Other; all with synchronized workflow
      const orderLinesData = [
        {
          titleOrPackage: testData.physicalTitle,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          locations: [{ locationId: testData.location.id, quantity: 1, quantityPhysical: 1 }],
          cost: { ...BasicOrderLine.defaultOrderLine.cost, quantityPhysical: 1 },
          physical: {
            ...physicalDetails,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
          },
        },
        {
          titleOrPackage: testData.peMixTitle,
          orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
          locations: [
            { locationId: testData.location.id, quantityPhysical: 1, quantityElectronic: 1 },
          ],
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            listUnitPriceElectronic: 10,
            quantityPhysical: 1,
            quantityElectronic: 1,
          },
          physical: {
            ...physicalDetails,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
          },
          eresource: {
            activated: false,
            trial: false,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
            accessProvider: testData.organization.id,
          },
        },
        {
          titleOrPackage: testData.otherTitle,
          orderFormat: ORDER_FORMAT_VALUES.OTHER,
          locations: [{ locationId: testData.location.id, quantity: 1, quantityPhysical: 1 }],
          cost: { ...BasicOrderLine.defaultOrderLine.cost, quantityPhysical: 1 },
          physical: {
            ...physicalDetails,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
          },
        },
      ];

      orderLinesData.forEach((orderLineData, index) => {
        Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        ).then((order) => {
          testData.orders[index] = order;

          OrderLines.createOrderLineViaApi({
            ...BasicOrderLine.defaultOrderLine,
            ...orderLineData,
            id: uuid(),
            purchaseOrderId: order.id,
            checkinItems: false,
            acquisitionMethod: testData.acquisitionMethod.id,
          }).then((orderLine) => {
            Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
            OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
              testData.orderLines[index] = openedOrderLine;
            });
          });
        });
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
          CapabilitySets.uiInventoryInstanceView,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    testData.orders.forEach((order) => Orders.deleteOrderViaApi(order.id));
    testData.orderLines.forEach((orderLine) => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(orderLine.instanceId);
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C805752 "Expected receipt date" on receiving piece inherits value from POL (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C805752'] },
    () => {
      const {
        physicalTitle,
        peMixTitle,
        otherTitle,
        orderLines: [physicalOrderLine, peMixOrderLine, otherOrderLine],
      } = testData;
      const { PHYSICAL, OTHER } = RECEIVING_PIECE_FORMATS;

      // Step 1: Search for the title of Order #1
      Receivings.searchByParameter({ value: physicalTitle });
      Receivings.assertReceivingResultsCells([
        [
          { column: 'Title', content: physicalTitle },
          { column: 'Expected receipt date', content: polReceiptDate },
        ],
      ]);

      // Step 2: Click on the title of Order #1
      Receivings.selectFromResultsList(physicalTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(physicalTitle);
      ReceivingDetails.checkReceivingDetails({ orderLineDetails: POL_RECEIPT_DATE_DETAILS });
      ReceivingDetails.checkExpectedTableContent([
        { format: PHYSICAL, expectedReceiptDate: polReceiptDate },
      ]);

      // Step 3: Click "Actions" in "Expected" accordion and select "Receive"
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: physicalOrderLine.poLineNumber,
        titleName: physicalTitle,
      });
      ReceivingsListEditForm.checkReceivingItemFieldValue({
        fieldName: 'receiptDate',
        fieldValue: polReceiptDate,
      });

      // Step 4: Click "Cancel" and click on the piece in "Expected" accordion
      ReceivingsListEditForm.clickCancelButton();
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.EXPECTED_RECEIPT_DATE,
          conditions: { value: polReceiptDate },
        },
      ]);

      // Step 5: Change "Expected receipt date" and click "Save & close"
      EditPieceModal.fillPieceDetails({
        [RECEIVING_PIECE_FORM_FIELD_LABELS.EXPECTED_RECEIPT_DATE]: editedReceiptDate,
      });
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(physicalTitle);
      ReceivingDetails.checkReceivingDetails({ orderLineDetails: POL_RECEIPT_DATE_DETAILS });
      ReceivingDetails.checkExpectedTableContent([
        { format: PHYSICAL, expectedReceiptDate: editedReceiptDate },
      ]);

      // Step 6: Click "Actions" in "Expected" accordion and select "Receive"
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: physicalOrderLine.poLineNumber,
        titleName: physicalTitle,
      });
      ReceivingsListEditForm.checkReceivingItemFieldValue({
        fieldName: 'receiptDate',
        fieldValue: editedReceiptDate,
      });

      // Step 7: Click "Cancel" and search for the title of Order #2
      ReceivingsListEditForm.clickCancelButton();
      Receivings.searchByParameter({ value: peMixTitle });
      Receivings.assertReceivingResultsCells([
        [
          { column: 'Title', content: peMixTitle },
          { column: 'Expected receipt date', content: polReceiptDate },
        ],
      ]);

      // Step 8: Click on the title of Order #2
      Receivings.selectFromResultsList(peMixTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(peMixTitle);
      ReceivingDetails.checkReceivingDetails({ orderLineDetails: POL_RECEIPT_DATE_DETAILS });
      // Order of Physical and Electronic pieces in "Expected" accordion is not guaranteed
      ReceivingDetails.getExpectedRowIndexByContent(PHYSICAL).then((rowIndex) => {
        ReceivingDetails.checkExpectedTableContent([
          { rowIndex, format: PHYSICAL, expectedReceiptDate: polReceiptDate },
        ]);
      });

      // Step 9: Click "Actions" in "Expected" accordion and select "Receive"
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: peMixOrderLine.poLineNumber,
        titleName: peMixTitle,
      });
      // Order of Physical and Electronic pieces on the "Receive" page is not guaranteed
      ReceivingsListEditForm.getRowIndexByHolding(PHYSICAL).then((rowIndex) => {
        ReceivingsListEditForm.checkReceivingItemFieldValue({
          fieldName: 'receiptDate',
          fieldValue: polReceiptDate,
          rowIndex,
        });
      });

      // Step 10: Click "Cancel" and search for the title of Order #3
      ReceivingsListEditForm.clickCancelButton();
      Receivings.searchByParameter({ value: otherTitle });
      Receivings.assertReceivingResultsCells([
        [
          { column: 'Title', content: otherTitle },
          { column: 'Expected receipt date', content: polReceiptDate },
        ],
      ]);

      // Step 11: Click on the title of Order #3
      Receivings.selectFromResultsList(otherTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(otherTitle);
      ReceivingDetails.checkReceivingDetails({ orderLineDetails: POL_RECEIPT_DATE_DETAILS });
      ReceivingDetails.checkExpectedTableContent([
        { format: OTHER, expectedReceiptDate: polReceiptDate },
      ]);

      // Step 12: Click "Actions" in "Expected" accordion and select "Receive"
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: otherOrderLine.poLineNumber,
        titleName: otherTitle,
      });
      ReceivingsListEditForm.checkReceivingItemFieldValue({
        fieldName: 'receiptDate',
        fieldValue: polReceiptDate,
      });
    },
  );
});
