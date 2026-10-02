import {
  ENCUMBRANCE_STATUSES,
  NO_VALUE,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  ORDER_VIEW_FIELD_LABELS,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_FORMATS,
  RECEIVING_PIECE_STATUSES,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  Budgets,
  FiscalYears,
  Funds,
  Ledgers,
  TransactionDetails,
} from '../../support/fragments/finance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../support/fragments/orders/basicOrderLine';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {};

  const checkEncumbranceDetails = (amount) => {
    TransactionDetails.checkTransactionDetails({
      information: [
        { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
        { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: `(${amount})` },
        { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: `${testData.order.poNumber}-1` },
        { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
        { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
        { key: TRANSACTION_DETAIL_FIELDS.TO, value: NO_VALUE },
        { key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS, value: NO_VALUE },
        { key: TRANSACTION_DETAIL_FIELDS.TAGS, value: NO_VALUE },
        { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: amount },
        { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
        { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
        { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
        { key: TRANSACTION_DETAIL_FIELDS.DESCRIPTION, value: NO_VALUE },
      ],
    });
  };

  before('Create test data', () => {
    testData.title = `AT_C1307971_Title_${getRandomPostfix()}`;
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C1307971_Organization_${getRandomPostfix()}`,
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C1307971_Ledger_${getRandomPostfix()}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C1307971_Fund_${getRandomPostfix()}`,
      ledgerId: testData.ledger.id,
    };
    testData.budget = {
      ...Budgets.getDefaultBudget(),
      fundId: testData.fund.id,
      allocated: 1000,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      testData.fiscalYear = fiscalYear;

      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      Funds.createViaApi(testData.fund);
      Budgets.createViaApi({ ...testData.budget, fiscalYearId: fiscalYear.id });
    });
    MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
      testData.materialType = mtypes[0];
    });
    cy.getAcquisitionMethodsApi().then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });
    Locations.getViaApiAnyDefault().then((locations) => {
      testData.location = locations[0];
    });
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.title,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED],
            fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
          }),
          orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
          cost: {
            currency: 'USD',
            discountType: 'percentage',
            listUnitPrice: 10,
            listUnitPriceElectronic: 20,
            quantityPhysical: 1,
            quantityElectronic: 2,
          },
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
          },
          eresource: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
            materialType: testData.materialType.id,
            accessProvider: testData.organization.id,
          },
          locations: [
            { locationId: testData.location.id, quantityPhysical: 1, quantityElectronic: 2 },
          ],
        }).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          Receivings.getPiecesViaApi(orderLine.id).then((pieces) => {
            const electronicPiece = pieces.find(
              ({ format }) => format === RECEIVING_PIECE_FORMATS.ELECTRONIC,
            );

            Pieces.updateOrderPiecesStatusesBatchViaApi({
              pieceIds: [electronicPiece.id],
              receivingStatus: RECEIVING_PIECE_STATUSES.UNRECEIVABLE,
            });
          });
        });
      });
    });
    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiReceivingViewEdit.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
      });
      Receivings.searchByParameter({ value: testData.title });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.title);
    Budgets.deleteViaApi(testData.budget.id);
    Funds.deleteFundViaApi(testData.fund.id);
    Ledgers.deleteLedgerViaApi(testData.ledger.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C1307971 Encumbrance amount is updated after changing a piece format (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1307971'] },
    () => {
      // Step 1: Click on the Title name in the search result
      Receivings.selectFromResultsList(testData.title);
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);

      // Step 2: Click on the Physical piece in the "Expected" accordion
      ReceivingDetails.openEditPieceModalByFormat(RECEIVING_PIECE_FORMATS.PHYSICAL);
      EditPieceModal.checkFieldsConditions([
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.PIECE_FORMAT,
          conditions: { value: RECEIVING_PIECE_FORMATS.PHYSICAL },
        },
      ]);

      // Step 3: Select "Electronic" in the "Piece format" dropdown, click "Save & close"
      EditPieceModal.selectPieceFormat(RECEIVING_PIECE_FORMATS.ELECTRONIC);
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);

      // Step 4: Click on the PO line number link in the "POL details" accordion
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkCostDetailsSection([
        { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: '$10.00' },
        { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '0' },
        { key: POLINE_DETAILS_FIELDS.ELECTRONIC_UNIT_PRICE, value: '$20.00' },
        { key: POLINE_DETAILS_FIELDS.QUANTITY_ELECTRONIC, value: '3' },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: '$60.00',
          initialEncumbrance: '$60.00',
          currentEncumbrance: '$60.00',
        },
      ]);

      // Step 5: Click on the "Current encumbrance" hyperlink
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      checkEncumbranceDetails('$60.00');

      // Step 6: Click on the PO line link in the "Source" field, "Actions" -> "View PO"
      TransactionDetails.openSourceInTransactionDetails(`${testData.order.poNumber}-1`);
      OrderLines.viewPO();
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$60.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$60.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
        ],
      });

      // Step 7: "Actions" -> "Receive", click on the Title name in the search result
      OrderDetails.openReceivingsPage();
      Receivings.selectFromResultsList(testData.title);
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);

      // Step 8: Click on the piece in the "Unreceivable" accordion
      Receivings.selectRecordInUnreceivableList();
      EditPieceModal.checkFieldsConditions([
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.PIECE_FORMAT,
          conditions: { value: RECEIVING_PIECE_FORMATS.ELECTRONIC },
        },
      ]);

      // Step 9: Select "Physical" in the "Piece format" dropdown, click "Save & close"
      EditPieceModal.selectPieceFormat(RECEIVING_PIECE_FORMATS.PHYSICAL);
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);

      // Step 10: Click on the PO line number link in the "POL details" accordion
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkCostDetailsSection([
        { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: '$10.00' },
        { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
        { key: POLINE_DETAILS_FIELDS.ELECTRONIC_UNIT_PRICE, value: '$20.00' },
        { key: POLINE_DETAILS_FIELDS.QUANTITY_ELECTRONIC, value: '2' },
      ]);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: '$50.00',
          initialEncumbrance: '$50.00',
          currentEncumbrance: '$50.00',
        },
      ]);

      // Step 11: Click on the "Current encumbrance" hyperlink
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      checkEncumbranceDetails('$50.00');
    },
  );
});
