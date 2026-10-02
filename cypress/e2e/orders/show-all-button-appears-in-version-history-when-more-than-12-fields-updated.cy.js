import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_SEARCH_OPTIONS,
  ORDER_VIEW_FIELD_LABELS,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import AcqVersionHistory from '../../support/fragments/acqVersionHistory';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const orderEntityType = 'order';
  const orderLineEntityType = 'order-line';
  const collapsedChangedFieldsCount = 12;
  const showLessLabel = 'Show less';
  const orderNote = `AT_C916261_OrderNote_${getRandomPostfix()}`;
  const orderLineApiEdit = {
    publisher: `AT_C916261_Publisher_${getRandomPostfix()}`,
    edition: `AT_C916261_Edition_${getRandomPostfix()}`,
    publicationDate: '2020',
    receivingNote: `AT_C916261_ReceivingNote_${getRandomPostfix()}`,
    subscriptionInterval: 10,
    selector: `AT_C916261_Selector_${getRandomPostfix()}`,
    requester: `AT_C916261_Requester_${getRandomPostfix()}`,
    rush: true,
    collection: true,
    cancellationRestriction: true,
    cancellationRestrictionNote: `AT_C916261_CancellationNote_${getRandomPostfix()}`,
    instructions: `AT_C916261_Instructions_${getRandomPostfix()}`,
  };
  const orderLineApiEditChangedFields = [
    POLINE_DETAILS_FIELDS.PUBLISHER,
    POLINE_DETAILS_FIELDS.EDITION,
    POLINE_DETAILS_FIELDS.PUBLICATION_DATE,
    POLINE_DETAILS_FIELDS.RECEIVING_NOTE,
    POLINE_DETAILS_FIELDS.SUBSCRIPTION_INTERVAL,
    POLINE_DETAILS_FIELDS.SELECTOR,
    POLINE_DETAILS_FIELDS.REQUESTER,
    POLINE_DETAILS_FIELDS.RUSH,
    POLINE_DETAILS_FIELDS.COLLECTION,
    POLINE_DETAILS_FIELDS.CANCELLATION_RESTRICTION,
    POLINE_DETAILS_FIELDS.CANCELLATION_DESCRIPTION,
    POLINE_DETAILS_FIELDS.INSTRUCTIONS_TO_VENDOR,
  ];
  const orderLineUiEdit = {
    itemDetails: {
      publisher: `AT_C916261_UpdatedPublisher_${getRandomPostfix()}`,
      edition: `AT_C916261_UpdatedEdition_${getRandomPostfix()}`,
      publicationDate: '2021',
      receivingNote: `AT_C916261_UpdatedReceivingNote_${getRandomPostfix()}`,
      subscriptionFrom: '01/01/2026',
      subscriptionTo: '12/31/2026',
      internalNote: `AT_C916261_InternalNote_${getRandomPostfix()}`,
    },
    poLineDetails: {
      acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
      createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE,
      receivingWorkflow: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
    },
    costDetails: {
      physicalUnitPrice: '15',
    },
  };
  const orderLineUiEditChangedFields = [
    POLINE_DETAILS_FIELDS.PUBLISHER,
    POLINE_DETAILS_FIELDS.EDITION,
    POLINE_DETAILS_FIELDS.PUBLICATION_DATE,
    POLINE_DETAILS_FIELDS.RECEIVING_NOTE,
    POLINE_DETAILS_FIELDS.SUBSCRIPTION_FROM,
    POLINE_DETAILS_FIELDS.SUBSCRIPTION_TO,
    POLINE_DETAILS_FIELDS.INTERNAL_NOTE,
    POLINE_DETAILS_FIELDS.SUPPRESS_INSTANCE_FROM_DISCOVERY,
    POLINE_DETAILS_FIELDS.CREATE_INVENTORY,
    POLINE_DETAILS_FIELDS.RECEIVING_WORKFLOW,
    POLINE_DETAILS_FIELDS.ACQUISITION_METHOD,
    POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE,
    POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
    // E-resource fields are saved with default values by the edit form (not displayed for "Other" order format)
    POLINE_DETAILS_FIELDS.ACTIVATION_STATUS,
    POLINE_DETAILS_FIELDS.TRIAL,
  ];
  const orderLineSecondUiEdit = {
    itemDetails: {
      publisher: `AT_C916261_LastPublisher_${getRandomPostfix()}`,
      edition: `AT_C916261_LastEdition_${getRandomPostfix()}`,
    },
  };
  const testData = {};

  before('Create test data', () => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C916261_Organization_${getRandomPostfix()}`,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    // Precondition 1: order in "Pending" status with one PO line
    Organizations.createOrganizationViaApi(testData.organization).then(() => {
      Orders.createOrderWithOrderLineViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        BasicOrderLine.getDefaultOrderLine({ title: `AT_C916261_POLTitle_${getRandomPostfix()}` }),
      ).then((order) => {
        testData.order = order;
      });
    });
    cy.get('@orderLine').then((orderLine) => {
      testData.orderLine = orderLine;
    });

    // Precondition 2: two fields edited in the order
    cy.then(() => Orders.getOrderByIdViaApi(testData.order.id)).then((order) => {
      Orders.updateOrderViaApi({ ...order, reEncumber: true, notes: [orderNote] });
    });

    // Precondition 3: 12 fields edited in the PO line
    cy.then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id)).then((orderLine) => {
      OrderLines.updateOrderLineViaApi({
        ...orderLine,
        publisher: orderLineApiEdit.publisher,
        edition: orderLineApiEdit.edition,
        publicationDate: orderLineApiEdit.publicationDate,
        selector: orderLineApiEdit.selector,
        requester: orderLineApiEdit.requester,
        rush: orderLineApiEdit.rush,
        collection: orderLineApiEdit.collection,
        cancellationRestriction: orderLineApiEdit.cancellationRestriction,
        cancellationRestrictionNote: orderLineApiEdit.cancellationRestrictionNote,
        details: {
          ...orderLine.details,
          receivingNote: orderLineApiEdit.receivingNote,
          subscriptionInterval: orderLineApiEdit.subscriptionInterval,
        },
        vendorDetail: {
          ...orderLine.vendorDetail,
          instructions: orderLineApiEdit.instructions,
        },
      });
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(testData.order.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C916261 "Show all/less" button appears in the "Version history" when more than 12 fields are updated in a single change (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C916261'] },
    () => {
      // Step 1: Click on the Order number - "Purchase order" pane is displayed
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();

      // Step 2: Click "Version history" icon - "Show all" button is NOT displayed in "Current version" card
      Orders.openVersionHistory();
      AcqVersionHistory.assertVersionHistoryCard(orderEntityType, {
        index: 0,
        isCurrent: true,
        changedFields: [ORDER_VIEW_FIELD_LABELS.RE_ENCUMBER, ORDER_VIEW_FIELD_LABELS.NOTE],
      });
      Orders.checkHighlightedFieldsInVersionView([ORDER_VIEW_FIELD_LABELS.RE_ENCUMBER, orderNote]);
      AcqVersionHistory.checkShowAllButtonInCard(orderEntityType, { index: 0, isPresent: false });

      // Step 3: Close "Version history" pane, open PO line and click "Version history" icon
      Orders.closeVersionHistory();
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.openVersionHistory();
      AcqVersionHistory.assertVersionHistoryCard(orderLineEntityType, {
        index: 0,
        isCurrent: true,
        changedFields: orderLineApiEditChangedFields,
      });
      AcqVersionHistory.checkChangedFieldsCountInCard(orderLineEntityType, {
        index: 0,
        count: orderLineApiEditChangedFields.length,
      });
      // values are highlighted for text fields, labels are highlighted for checkboxes
      OrderLineDetails.checkHighlightedFieldsInVersionHistoryView([
        orderLineApiEdit.publisher,
        orderLineApiEdit.edition,
        orderLineApiEdit.publicationDate,
        orderLineApiEdit.receivingNote,
        String(orderLineApiEdit.subscriptionInterval),
        orderLineApiEdit.selector,
        orderLineApiEdit.requester,
        POLINE_DETAILS_FIELDS.RUSH,
        POLINE_DETAILS_FIELDS.COLLECTION,
        POLINE_DETAILS_FIELDS.CANCELLATION_RESTRICTION,
        orderLineApiEdit.cancellationRestrictionNote,
        orderLineApiEdit.instructions,
      ]);
      AcqVersionHistory.checkShowAllButtonInCard(orderLineEntityType, {
        index: 0,
        isPresent: false,
      });

      // Step 4: Close "Version history" pane, edit more than 12 fields in PO line and save
      AcqVersionHistory.closeVersionHistory(orderLineEntityType);
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.fillOrderLineFields(orderLineUiEdit);
      OrderLineEditForm.clickSuppressInstanceFromDiscoveryCheckbox();
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        itemDetails: [
          { key: POLINE_DETAILS_FIELDS.PUBLISHER, value: orderLineUiEdit.itemDetails.publisher },
          { key: POLINE_DETAILS_FIELDS.EDITION, value: orderLineUiEdit.itemDetails.edition },
          {
            key: POLINE_DETAILS_FIELDS.PUBLICATION_DATE,
            value: orderLineUiEdit.itemDetails.publicationDate,
          },
          {
            key: POLINE_DETAILS_FIELDS.RECEIVING_NOTE,
            value: orderLineUiEdit.itemDetails.receivingNote,
          },
          {
            key: POLINE_DETAILS_FIELDS.SUBSCRIPTION_FROM,
            value: orderLineUiEdit.itemDetails.subscriptionFrom,
          },
          {
            key: POLINE_DETAILS_FIELDS.SUBSCRIPTION_TO,
            value: orderLineUiEdit.itemDetails.subscriptionTo,
          },
          {
            key: POLINE_DETAILS_FIELDS.INTERNAL_NOTE,
            value: orderLineUiEdit.itemDetails.internalNote,
          },
          {
            key: POLINE_DETAILS_FIELDS.SUPPRESS_INSTANCE_FROM_DISCOVERY,
            value: { checked: true, disabled: true },
            checkbox: true,
          },
        ],
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.ACQUISITION_METHOD,
            value: orderLineUiEdit.poLineDetails.acquisitionMethod,
          },
          {
            key: POLINE_DETAILS_FIELDS.RECEIVING_WORKFLOW,
            value: orderLineUiEdit.poLineDetails.receivingWorkflow,
          },
        ],
        costDetails: [
          {
            key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE,
            value: `$${orderLineUiEdit.costDetails.physicalUnitPrice}.00`,
          },
          {
            key: POLINE_DETAILS_FIELDS.ESTIMATED_PRICE,
            value: `$${orderLineUiEdit.costDetails.physicalUnitPrice}.00`,
          },
        ],
      });

      OrderLineDetails.checkFieldsConditions([
        {
          label: POLINE_DETAILS_FIELDS.CREATE_INVENTORY,
          conditions: { value: orderLineUiEdit.poLineDetails.createInventory },
        },
      ]);
      // Step 5: Click "Version history" icon - "Show all" button is displayed, 12 changed fields are shown
      OrderLineDetails.openVersionHistory();
      AcqVersionHistory.checkShowAllButtonInCard(orderLineEntityType, { index: 0 });
      AcqVersionHistory.checkChangedFieldsCountInCard(orderLineEntityType, {
        index: 0,
        count: collapsedChangedFieldsCount,
      });
      OrderLineDetails.checkHighlightedFieldsInVersionHistoryView([
        orderLineUiEdit.itemDetails.publisher,
        orderLineUiEdit.itemDetails.edition,
        orderLineUiEdit.itemDetails.publicationDate,
        orderLineUiEdit.itemDetails.receivingNote,
        orderLineUiEdit.itemDetails.subscriptionFrom,
        orderLineUiEdit.itemDetails.subscriptionTo,
        orderLineUiEdit.itemDetails.internalNote,
        POLINE_DETAILS_FIELDS.SUPPRESS_INSTANCE_FROM_DISCOVERY,
        orderLineUiEdit.poLineDetails.createInventory,
        orderLineUiEdit.poLineDetails.receivingWorkflow,
        orderLineUiEdit.poLineDetails.acquisitionMethod,
        `$${orderLineUiEdit.costDetails.physicalUnitPrice}.00`,
      ]);

      // Step 6: Click "Show all" button - all changed fields are shown
      AcqVersionHistory.clickShowAllButtonInCard(orderLineEntityType, { index: 0 });
      AcqVersionHistory.checkShowAllButtonInCard(orderLineEntityType, {
        index: 0,
        label: showLessLabel,
      });
      AcqVersionHistory.assertVersionHistoryCard(orderLineEntityType, {
        index: 0,
        isCurrent: true,
        changedFields: orderLineUiEditChangedFields,
      });
      AcqVersionHistory.checkChangedFieldsCountInCard(orderLineEntityType, {
        index: 0,
        count: orderLineUiEditChangedFields.length,
      });

      // Step 7: Click "Show less" button - 12 changed fields are shown
      AcqVersionHistory.clickShowAllButtonInCard(orderLineEntityType, {
        index: 0,
        label: showLessLabel,
      });
      AcqVersionHistory.checkShowAllButtonInCard(orderLineEntityType, { index: 0 });
      AcqVersionHistory.checkChangedFieldsCountInCard(orderLineEntityType, {
        index: 0,
        count: collapsedChangedFieldsCount,
      });

      // Step 8: Close "Version history" pane, edit two fields in PO line and save
      AcqVersionHistory.closeVersionHistory(orderLineEntityType);
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.fillOrderLineFields(orderLineSecondUiEdit);
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkItemDetailsSection([
        {
          key: POLINE_DETAILS_FIELDS.PUBLISHER,
          value: orderLineSecondUiEdit.itemDetails.publisher,
        },
        { key: POLINE_DETAILS_FIELDS.EDITION, value: orderLineSecondUiEdit.itemDetails.edition },
      ]);

      // Step 9: Click "Version history" icon - "Show all" button is displayed only in the previous card
      OrderLineDetails.openVersionHistory();
      AcqVersionHistory.assertVersionHistoryCard(orderLineEntityType, {
        index: 0,
        isCurrent: true,
        changedFields: [POLINE_DETAILS_FIELDS.PUBLISHER, POLINE_DETAILS_FIELDS.EDITION],
      });
      OrderLineDetails.checkHighlightedFieldsInVersionHistoryView([
        orderLineSecondUiEdit.itemDetails.publisher,
        orderLineSecondUiEdit.itemDetails.edition,
      ]);
      AcqVersionHistory.checkShowAllButtonInCard(orderLineEntityType, {
        index: 0,
        isPresent: false,
      });
      AcqVersionHistory.checkShowAllButtonInCard(orderLineEntityType, { index: 1 });

      // Step 10: Click "Show all" button in the previous card - all changed fields are shown
      AcqVersionHistory.clickShowAllButtonInCard(orderLineEntityType, { index: 1 });
      AcqVersionHistory.checkShowAllButtonInCard(orderLineEntityType, {
        index: 1,
        label: showLessLabel,
      });
      AcqVersionHistory.assertVersionHistoryCard(orderLineEntityType, {
        index: 1,
        changedFields: orderLineUiEditChangedFields,
      });
      AcqVersionHistory.checkChangedFieldsCountInCard(orderLineEntityType, {
        index: 1,
        count: orderLineUiEditChangedFields.length,
      });

      // Step 11: Click "Show less" button - 12 changed fields are shown
      AcqVersionHistory.clickShowAllButtonInCard(orderLineEntityType, {
        index: 1,
        label: showLessLabel,
      });
      AcqVersionHistory.checkShowAllButtonInCard(orderLineEntityType, { index: 1 });
      AcqVersionHistory.checkChangedFieldsCountInCard(orderLineEntityType, {
        index: 1,
        count: collapsedChangedFieldsCount,
      });
    },
  );
});
