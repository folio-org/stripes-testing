import {
  Accordion,
  Button,
  Card,
  Checkbox,
  HTML,
  including,
  KeyValue,
  Link,
  matching,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  PaneContent,
  PaneHeader,
  SearchField,
  Section,
  Select,
  SelectionOption,
  TextArea,
  TextField,
} from '../../../../interactors';
import {
  ACQUISITION_METHOD_NAMES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_PAYMENT_STATUS,
  RECEIPT_STATUS_SELECTED,
  RECEIVING_WORKFLOW_NAMES,
} from '../../constants';
import FileManager from '../../utils/fileManager';
import InteractorsTools from '../../utils/interactorsTools';
import getRandomPostfix from '../../utils/stringTools';
import SearchHelper from '../finance/financeHelper';
import SelectInstanceModal from './modals/selectInstanceModal';
import SelectLocationModal from './modals/selectLocationModal';
import OrderLineDetails from './orderLineDetails';

const addRoutingListButton = Section({ id: 'routing-list-menu-actions' }).find(
  Button('Add routing list'),
);
const routingListSection = Section({ id: 'routing-list' });
const filtersPane = PaneContent({ id: 'order-lines-filters-pane-content' });
const receivedtitleDetails = PaneContent({ id: 'receiving-results-pane-content' });
const resetButton = Button('Reset all');
const saveAndCloseButton = Button('Save & close');
const cancelButton = Button('Cancel');
const actionsButton = Button('Actions');
const searchButton = Button('Search');
const saveButton = Button('Save and close');
const searchField = SearchField({ id: 'input-record-search' });
const buttonLocationFilter = Button({ id: 'accordion-toggle-button-pol-location-filter' });
const buttonFundCodeFilter = Button({ id: 'accordion-toggle-button-fundCode' });
const buttonOrderFormatFilter = Button({ id: 'accordion-toggle-button-orderFormat' });
const buttonFVendorFilter = Button({ id: 'accordion-toggle-button-purchaseOrder.vendor' });
const buttonRushFilter = Button({ id: 'accordion-toggle-button-rush' });
const buttonSubscriptionFromFilter = Button({ id: 'accordion-toggle-button-subscriptionFrom' });
const physicalUnitPrice = '10';
const quantityPhysical = '5';
const electronicUnitPrice = '10';
const quantityElectronic = '5';
const physicalUnitPriceTextField = TextField({ name: 'cost.listUnitPrice' });
const orderLineButton = Button('Order lines');
const quantityPhysicalTextField = TextField({ name: 'cost.quantityPhysical' });
const electronicUnitPriceTextField = TextField({ name: 'cost.listUnitPriceElectronic' });
const quantityElectronicTextField = TextField({ name: 'cost.quantityElectronic' });
const searchForm = SearchField({ id: 'input-record-search' });
const contibutor = 'Autotest,Contributor_name';
const orderLineTitle = `Autotest Title_${getRandomPostfix()}`;
const orderLineTitleField = TextField({ name: 'titleOrPackage' });
const orderFormatSelect = Select({ name: 'orderFormat' });
const acquisitionMethodButton = Button({ id: 'acquisition-method' });
const receivingWorkflowSelect = Select({ name: 'checkinItems' });
const materialTypeSelect = Select({ name: 'physical.materialType' });
const addLocationButton = Button({ text: 'Add location' });
const locationSelect = Button({ id: 'field-locations[0].locationId' });
const holdingSelect = Button({ id: 'field-locations[0].holdingId' });
const onlineLocationOption = SelectionOption('Online (E)');
const quantityPhysicalLocationField = TextField({ name: 'locations[0].quantityPhysical' });
const addFundDistributionButton = Button({ id: 'fundDistribution-add-button' });
const fundDistributionSelect = Button({ id: 'fundDistribution[0].fundId' });
const fundDistributionExpenseClass = Button({ id: 'fundDistribution[0].expenseClassId' });
const fundDistributionField = TextField({ name: 'fundDistribution[0].value' });
const secondFundDistributionSelect = Button({ id: 'fundDistribution[1].fundId' });
const secondFundDistributionExpenseClass = Button({ id: 'fundDistribution[1].expenseClassId' });
const secondFundDistributionField = TextField({ name: 'fundDistribution[1].value' });
const itemDetailsSection = Section({ id: 'ItemDetails' });
const poLineInfoSection = Section({ id: 'poLine' });
const fundDistributionSection = Section({ id: 'FundDistribution' });
const locationSection = Section({ id: 'location' });
const selectInstanceModal = Modal('Select instance');
const createNewLocationButton = Button('Create new holdings for location');
const paneHeaderOrderLinesDetailes = PaneHeader({ id: 'paneHeaderorder-lines-details' });
const orderLineDetailsPane = Pane({ id: 'order-lines-details' });
const physicalResourceDetailsAccordion = Accordion('Physical resource details');
const eResourcesDetails = Accordion('E-resources details');
const fundDistributionAccordion = Accordion({ id: 'FundDistribution' });
const polListingAccordion = Section({ id: 'POListing' });
const quantityElectronicField = TextField({ name: 'locations[0].quantityElectronic' });
const noteTitle = `Autotest Title_${getRandomPostfix()}`;
const orderHistorySection = Section({ id: 'versions-history-pane-order-line' });
const agreementLinesSection = Section({ id: 'relatedAgreementLines' });
const invoiceLinesSection = Section({ id: 'relatedInvoiceLines' });
const notesSection = Section({ id: 'notes' });
const trashButton = Button({ icon: 'trash' });
const note = 'Edited by AQA team';
const currencyButton = Button({ id: 'currency' });
const orderLineList = MultiColumnList({ id: 'order-line-list' });
const addDonorsModal = Modal('Add donors');
// Results pane
const searchResultsPane = Pane({ id: 'order-lines-results-pane' });

// Edit form
// PO Line details section
const lineDetails = Section({ id: 'lineDetails' });
const poLineDetails = {
  receiptStatus: lineDetails.find(Select('Receipt status')),
};
const selectLocationsModal = Modal('Select locations');
const findUserButton = Button({ id: 'clickable-plugin-find-user' });
const userSearchModal = Modal('Select User');
const searchTextField = TextField({ type: 'search' });
const firstSearchResult = MultiColumnListCell({ row: 0, columnIndex: 0 });
const checkboxAll = Checkbox();
const submitOrderLine = () => {
  cy.wait(4000);
  const submitButton = Button('Submit');
  cy.get('body').then(($body) => {
    if ($body.find('[id=line-is-not-unique-confirmation]').length) {
      cy.wait(4000);
      cy.do([
        Modal({ id: 'line-is-not-unique-confirmation' }).find(submitButton).focus(),
        Modal({ id: 'line-is-not-unique-confirmation' }).find(submitButton).click(),
      ]);
    } else {
      // do nothing if modal is not displayed
    }
  });
};
const checkQuantityPhysical = (quantity) => {
  cy.expect(Accordion('Cost details').find(KeyValue('Quantity physical')).has({ value: quantity }));
};
const checkQuantityElectronic = (quantity) => {
  cy.expect(
    Accordion('Cost details').find(KeyValue('Quantity electronic')).has({ value: quantity }),
  );
};
const expandActionsDropdownInPOL = () => {
  cy.do(
    orderLineDetailsPane
      .find(PaneHeader({ id: 'paneHeaderorder-lines-details' }).find(actionsButton))
      .click(),
  );
};
const save = () => {
  cy.do(saveAndCloseButton.click());
  cy.wait(2000);
};
const fillTitleInPOLine = (title) => {
  cy.do(orderLineTitleField.fillIn(title));
};

export default {
  save,
  fillTitleInPOLine,
  checkExistingPOLInOrderLinesList: (POL) => {
    cy.wait(4000);
    cy.expect(searchResultsPane.find(MultiColumnListCell(POL)).exists());
  },
  submitOrderLine,
  checkQuantityPhysical,
  checkQuantityElectronic,
  checkTitle(title) {
    cy.expect(Link(title).exists());
  },
  searchByParameter: (parameter, value) => {
    cy.do([searchForm.selectIndex(parameter), searchForm.fillIn(value), searchButton.click()]);
  },

  receiveOrderLinesViaActions: () => {
    expandActionsDropdownInPOL();
    cy.do([Button('Receive').click()]);
  },

  clickOnOrderLines: () => {
    cy.do([orderLineButton.click()]);
  },
  waitLoading(ms = 6000) {
    cy.wait(ms);
    cy.expect([
      Pane({ id: 'order-lines-filters-pane' }).exists(),
      Pane({ id: 'order-lines-results-pane' }).exists(),
    ]);
    cy.wait(4000);
  },

  selectFund: (fundName) => {
    cy.wait(4000);
    cy.get('#FundDistribution').find('a').contains(fundName).invoke('removeAttr', 'target')
      .click();
  },

  resetFilters: () => {
    cy.wait(4000);
    cy.do(filtersPane.find(Button('Reset all')).click());
  },

  resetFiltersIfActive: () => {
    cy.do(
      resetButton.has({ disabled: false }).then((enabled) => {
        if (enabled) {
          cy.do([resetButton.click(), cy.expect(resetButton.is({ disabled: true }))]);
        }
      }),
    );
  },

  checkOrderlineSearchResults: ({ poLineNumber, title } = {}) => {
    if (poLineNumber) {
      cy.expect(
        orderLineList
          .find(MultiColumnListRow({ index: 0 }))
          .find(MultiColumnListCell({ columnIndex: 0 }))
          .has({ content: poLineNumber }),
      );
    }

    if (title) {
      cy.expect(
        orderLineList
          .find(MultiColumnListRow({ index: 0 }))
          .find(MultiColumnListCell({ columnIndex: 2 }))
          .has({ content: title }),
      );
    }
  },

  checkCreatedPOLineResource: (orderLineTitleName, recourceName, fund) => {
    cy.expect([
      orderLineDetailsPane.exists(),
      itemDetailsSection.find(KeyValue({ value: orderLineTitleName })).exists(),
      poLineInfoSection.find(KeyValue({ value: recourceName })).exists(),
      fundDistributionSection
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: `${fund.name}(${fund.code})` }),
    ]);
  },
  checkPOLReceiptStatus(receiptStatus) {
    cy.expect([
      orderLineDetailsPane.exists(),
      poLineInfoSection.find(KeyValue({ value: receiptStatus })).exists(),
    ]);
  },
  checkPOLReceivingWorkflow(receivingWorkflow) {
    cy.expect([
      orderLineDetailsPane.exists(),
      poLineInfoSection.find(KeyValue({ value: receivingWorkflow })).exists(),
    ]);
  },
  checkCreatedPOLineOtherResource(orderLineTitleName, fund) {
    this.checkCreatedPOLineResource(orderLineTitleName, ORDER_FORMAT_NAMES.OTHER, fund);
  },
  checkCreatedPOLinePhysicalResource(orderLineTitleName, fund) {
    this.checkCreatedPOLineResource(
      orderLineTitleName,
      ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE_Check,
      fund,
    );
    cy.expect(locationSection.find(KeyValue({ value: quantityPhysical })).exists());
  },
  checkCreatedPOLineElectronicResource(orderLineTitleName, fund) {
    this.checkCreatedPOLineResource(
      orderLineTitleName,
      ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE_Check,
      fund,
    );
    cy.expect(locationSection.find(KeyValue({ value: quantityElectronic })).exists());
  },

  closeThirdPane: () => {
    cy.do(
      PaneHeader({ id: 'paneHeaderorder-details' })
        .find(Button({ icon: 'times' }))
        .click(),
    );
  },

  closeRoutingListDetails: () => {
    cy.do(
      PaneHeader({ id: 'paneHeaderrouting-list-pane' })
        .find(Button({ icon: 'times' }))
        .click(),
    );
  },

  closePOLEditForm: () => {
    cy.do(Button({ icon: 'clickable-close-new-line-dialog' }).click());
  },

  getSearchParamsMap(orderNumber, currentDate) {
    const searchParamsMap = new Map();
    // 'date opened' parameter verified separately due to different condition
    searchParamsMap
      .set('PO number', orderNumber)
      .set('Keyword', orderNumber)
      .set('Date created', currentDate);
    return searchParamsMap;
  },
  checkPoSearch(searchParamsMap, orderNumber) {
    for (const [key, value] of searchParamsMap.entries()) {
      cy.do([searchField.selectIndex(key), searchField.fillIn(value), searchButton.click()]);
      // verify that first row in the result list contains related order line title
      this.checkSearchResults(orderNumber);
      this.resetFilters();
      // TODO: remove waiter - currenty it's a workaround for incorrect selection from search list
      cy.wait(1000);
    }
  },

  addPOLine: () => {
    cy.wait(1000);
    cy.do([
      polListingAccordion.find(actionsButton).focus(),
      polListingAccordion.find(actionsButton).click(),
      Button('Add PO line').click(),
    ]);
    cy.wait(2000);
  },

  expandPackageTitles: () => {
    cy.do(Button({ id: 'accordion-toggle-button-linkedInstances' }).click());
  },

  addPackageTitle: () => {
    cy.do(Button({ id: 'find-instance-trigger' }).click());
  },

  varifyAddingInstanceTPackageTitle: (instanceTitle, polNumber) => {
    InteractorsTools.checkCalloutMessage(
      `The title ${instanceTitle} has been successfully added for PO line ${polNumber}-1`,
    );
    cy.expect(Section({ id: 'linkedInstances' }).find(Link(instanceTitle)).exists());
  },

  verifyPackageTitleExists: (instanceTitle) => {
    cy.expect(Section({ id: 'linkedInstances' }).find(Link(instanceTitle)).exists());
  },

  backToEditingOrder: () => {
    cy.wait(4000);
    cy.do(Button({ id: 'clickable-backToPO' }).click());
    cy.wait(4000);
  },

  openVersionHistory() {
    cy.do(orderLineDetailsPane.find(Button({ icon: 'clock' })).click());
    cy.wait(2000);
    cy.expect([
      agreementLinesSection.absent(),
      invoiceLinesSection.absent(),
      notesSection.absent(),
      orderHistorySection.exists(),
    ]);
  },

  checkVersionHistoryCard(date, textInformation) {
    cy.expect([
      orderHistorySection.find(Card({ headerStart: date })).has({ text: textInformation }),
    ]);
  },

  selectVersionHistoryCard(date) {
    cy.do([
      orderHistorySection
        .find(Card({ headerStart: date }))
        .find(Button({ icon: 'clock' }))
        .click(),
    ]);
  },

  closeVersionHistory: () => {
    cy.do(orderHistorySection.find(Button({ icon: 'times' })).click());
    cy.wait(2000);
    cy.expect([
      agreementLinesSection.exists(),
      invoiceLinesSection.exists(),
      notesSection.exists(),
      orderHistorySection.absent(),
    ]);
  },

  deleteOrderLine: () => {
    cy.do([
      paneHeaderOrderLinesDetailes.find(actionsButton).click(),
      Button('Delete').click(),
      Button({ id: 'clickable-delete-line-confirmation-confirm' }).click(),
    ]);
  },

  POLineInfodorPhysicalMaterial: (orderLineTitleName) => {
    cy.wait(4000);
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityPhysicalLocationField.fillIn(quantityPhysical),
      saveAndCloseButton.click(),
    ]);
    cy.wait(4000);
  },

  POLineInfodorPhysicalMaterialForRecieve: (orderLineTitleName) => {
    cy.wait(4000);
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn('1'),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityPhysicalLocationField.fillIn('1'),
      saveAndCloseButton.click(),
    ]);
  },
  POLineInfodorPhysicalMaterialWithLocation: (orderLineTitleName, institutionId) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      Button('Location look-up').click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantityPhysical), saveAndCloseButton.click()]);
  },

  POLineInfoWithReceiptNotRequiredStatus(institutionId) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      Select({ name: 'receiptStatus' }).choose(RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED),
    ]);
    cy.expect(receivingWorkflowSelect.disabled());
    cy.do([
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
    ]);
    cy.wait(4000);
    cy.do(createNewLocationButton.click());
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([
      quantityPhysicalLocationField.fillIn(quantityPhysical),
      Select('Create inventory*').choose('Instance, holdings, item'),
      saveAndCloseButton.click(),
    ]);
    submitOrderLine();
  },

  POLineInfoWithReceiptNotRequiredStatuswithSelectLocation: (institutionId) => {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      Select({ name: 'receiptStatus' }).choose(RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED),
    ]);
    cy.expect(receivingWorkflowSelect.disabled());
    cy.do([
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
    ]);
    cy.wait(4000);
    cy.do(Button('Location look-up').click());
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([
      quantityPhysicalLocationField.fillIn(quantityPhysical),
      Select('Create inventory*').choose('Instance, holdings, item'),
      saveAndCloseButton.click(),
    ]);
  },

  POLineInfoEditWithReceiptNotRequiredStatus() {
    cy.do(Select({ name: 'receiptStatus' }).choose(RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED));
    cy.expect(receivingWorkflowSelect.disabled());
    save();
    submitOrderLine();
  },

  POLineInfoEditWithPendingReceiptStatus() {
    cy.do([
      Select({ name: 'receiptStatus' }).choose(RECEIPT_STATUS_SELECTED.PENDING),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      save(),
    ]);
    submitOrderLine();
  },

  viewPO: () => {
    cy.wait(6000);
    cy.do([
      orderLineDetailsPane.find(paneHeaderOrderLinesDetailes.find(actionsButton)).click(),
      Button('View PO').click(),
    ]);
  },

  checkCalloutMessageInEditedPOL: (orderNumber, numberOfPOL) => {
    InteractorsTools.checkCalloutMessage(
      `The purchase order line ${orderNumber}-${numberOfPOL} was successfully updated`,
    );
  },

  POLineInfodorPhysicalMaterialWithFund: (orderLineTitleName, fund) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      fundDistributionField.fillIn('100'),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityPhysicalLocationField.fillIn(quantityPhysical),
      saveAndCloseButton.click(),
    ]);
  },

  POLineInfodorOtherMaterialWithFund: (orderLineTitleName, fund) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.OTHER),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      fundDistributionField.fillIn('100'),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityPhysicalLocationField.fillIn(quantityPhysical),
      saveAndCloseButton.click(),
    ]);
  },

  rolloverPOLineInfoforPhysicalMaterialWithFund(fund, unitPrice, quantity, value, institutionId) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations')
        .find(MultiColumnListCell({ content: institutionId, row: 0, columnIndex: 0 }))
        .click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.wait(4000);
    submitOrderLine();
    cy.wait(4000);
  },

  binderyActivePhysicalPOLineInfo(fund, resource, unitPrice, quantity, value, institutionId) {
    cy.do([orderFormatSelect.choose(resource), acquisitionMethodButton.click()]);
    cy.wait(2000);
    cy.do([
      Checkbox({ name: 'details.isBinderyActive' }).click(),
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.wait(4000);
    submitOrderLine();
  },

  binderyIsNotActiveForElectronicPOLineInfo(
    fund,
    resource,
    unitPrice,
    quantity,
    value,
    institutionId,
  ) {
    cy.do(orderFormatSelect.choose(resource));
    cy.wait(2000);
    cy.get('label:contains("Bindery active")').within(() => {
      cy.get('input[type="checkbox"]').should('be.disabled');
    });
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      Checkbox({ name: 'details.isBinderyActive' }).click(),
    ]);
    cy.get('select[name="orderFormat"]')
      .find('option')
      .then((options) => {
        const actualOptions = [...options].map((option) => option.text.trim());
        const expectedOptions = ['Physical resource', 'P/E mix'];
        const unexpectedOptions = ['Other', 'Electronic'];

        expectedOptions.forEach((option) => {
          expect(actualOptions).to.include(option);
        });

        unexpectedOptions.forEach((option) => {
          expect(actualOptions).not.to.include(option);
        });
      });
    cy.do([
      acquisitionMethodButton.click(),
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.wait(4000);
    submitOrderLine();
  },

  binderyActivePEMixPOLineInfo(fund, resource, unitPrice, quantity, value, institutionId) {
    cy.do([orderFormatSelect.choose(resource), acquisitionMethodButton.click()]);
    cy.wait(2000);
    cy.do([
      Checkbox({ name: 'details.isBinderyActive' }).click(),
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      physicalUnitPriceTextField.fillIn(unitPrice),
      electronicUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      quantityElectronicTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([
      quantityPhysicalLocationField.fillIn(quantity),
      quantityElectronicField.fillIn(quantity),
      saveAndCloseButton.click(),
    ]);
    cy.wait(4000);
    submitOrderLine();
  },

  rolloverPOLineInfoforPhysicalMaterialWithFundInPercents(
    fund,
    unitPrice,
    quantity,
    value,
    institutionId,
  ) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('%')).click(),
      fundDistributionField.fillIn(value),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.wait(4000);
    submitOrderLine();
  },

  rolloverPOLineInfoForPhysicalMaterialWithFundAndExpClass(
    fund,
    expClass,
    unitPrice,
    quantity,
    value,
    institutionId,
  ) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Button({ id: 'fundDistribution[0].expenseClassId' }).click(),
      SelectionOption(`${expClass}`).click(),
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations')
        .find(MultiColumnListCell({ content: institutionId, row: 0, columnIndex: 0 }))
        .click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.wait(4000);
    submitOrderLine();
  },

  fillInPOLineInfoforPEMIXWithFund(fund, unitPrice, quantity, value, institutionId) {
    cy.do([orderFormatSelect.choose(ORDER_FORMAT_NAMES.PE_MIX), acquisitionMethodButton.click()]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      electronicUnitPriceTextField.fillIn(unitPrice),
      quantityElectronicTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations')
        .find(MultiColumnListCell({ content: institutionId, row: 0, columnIndex: 0 }))
        .click(),
    ]);
    cy.do([
      quantityPhysicalLocationField.fillIn(quantity),
      quantityElectronicField.fillIn(quantity),
      saveAndCloseButton.click(),
    ]);
    cy.wait(4000);
    submitOrderLine();
  },

  fillInPOLineInfoforOtherWithFund(fund, unitPrice, quantity, value, location) {
    cy.do([orderFormatSelect.choose(ORDER_FORMAT_NAMES.OTHER), acquisitionMethodButton.click()]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      Button('Location look-up').click(),
      TextField({ id: 'input-record-search' }).fillIn(location),
      Button('Search').click(),
      Modal('Select locations')
        .find(MultiColumnListCell({ content: location, row: 0, columnIndex: 0 }))
        .click(),
      quantityPhysicalLocationField.fillIn(quantity),
      saveAndCloseButton.click(),
    ]);
    cy.wait(4000);
    submitOrderLine();
  },

  fillInPOLineInfoForElectronicWithFund(fund, unitPrice, quantity, value, locationName) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      electronicUnitPriceTextField.fillIn(unitPrice),
      quantityElectronicTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      Select({ name: 'eresource.materialType' }).choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      Button({ id: 'location-lookup-locations[0].locationId' }).click(),
    ]);
    SelectLocationModal.waitLoading();
    SelectLocationModal.selectLocation(locationName);
  },

  fillInPOLineInfoForElectronicWithThreeFunds(fund, unitPrice, quantity, value, institutionId) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      electronicUnitPriceTextField.fillIn(unitPrice),
      quantityElectronicTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      Select({ name: 'eresource.materialType' }).choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([quantityElectronicField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.wait(4000);
    submitOrderLine();
  },

  addReveivingNoteToItemDetailsAndSave() {
    cy.do([TextArea('Receiving note').fillIn(note), saveAndCloseButton.click()]);
    submitOrderLine();
  },

  rolloverPOLineInfoforPhysicalMaterialWith2Funds(
    firstFund,
    unitPrice,
    quantity,
    firstFundValue,
    secondFund,
    secondFundValueInPercentage,
    institutionId,
  ) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${firstFund.name} (${firstFund.code})`).click(),
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(firstFundValue),
      addFundDistributionButton.click(),
      Button({ id: 'fundDistribution[1].fundId' }).click(),
      SelectionOption(`${secondFund.name} (${secondFund.code})`).click(),
    ]);
    cy.wait(4000);
    cy.do([
      TextField({ name: 'fundDistribution[1].value' }).fillIn(secondFundValueInPercentage),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations')
        .find(MultiColumnListCell({ content: institutionId, row: 0, columnIndex: 0 }))
        .click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.wait(4000);
    submitOrderLine();
  },

  rolloverPOLineInfoforPhysicalMaterialWith2FundsInPercents(
    firstFund,
    unitPrice,
    quantity,
    firstFundValue,
    secondFund,
    secondFundValueInPercentage,
    institutionId,
  ) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${firstFund.name} (${firstFund.code})`).click(),
    ]);
    cy.wait(4000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('%')).click(),
      fundDistributionField.fillIn(firstFundValue),
      addFundDistributionButton.click(),
      Button({ id: 'fundDistribution[1].fundId' }).click(),
      SelectionOption(`${secondFund.name} (${secondFund.code})`).click(),
    ]);
    cy.wait(4000);
    cy.do([
      TextField({ name: 'fundDistribution[1].value' }).fillIn(secondFundValueInPercentage),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.wait(4000);
    submitOrderLine();
  },

  add2NewFundsToPol(firstFund, firstFundValue, secondFund, secondFundValueInPercentage) {
    cy.do([
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${firstFund.name} (${firstFund.code})`).click(),
    ]);
    cy.wait(4000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('%')).click(),
      fundDistributionField.fillIn(firstFundValue),
      addFundDistributionButton.click(),
      Button({ id: 'fundDistribution[1].fundId' }).click(),
      SelectionOption(`${secondFund.name} (${secondFund.code})`).click(),
    ]);
    cy.wait(4000);
    cy.do(TextField({ name: 'fundDistribution[1].value' }).fillIn(secondFundValueInPercentage));
    cy.wait(4000);
    save();
    submitOrderLine();
  },

  addFundToPolInPercentsWithoutSave(fund, fundValue) {
    cy.do([
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('%')).click(),
      fundDistributionField.fillIn(fundValue),
    ]);
  },

  changePercentsValueInFundDistribution(value) {
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('%')).click(),
      fundDistributionField.fillIn(value),
    ]);
  },

  fillInPOLineInfoforPhysicalMaterialWithFundAndEC(
    fund,
    unitPrice,
    quantity,
    expenseClass,
    value,
    institutionId,
  ) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Button({ id: 'fundDistribution[0].expenseClassId' }).click(),
      SelectionOption(`${expenseClass}`).click(),
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations')
        .find(MultiColumnListCell({ content: institutionId, row: 0, columnIndex: 0 }))
        .click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.wait(4000);
    submitOrderLine();
  },

  fillInPOLineInfoforPhysicalMaterialWithFundWithoutECAndCheckRequiredField(
    fund,
    unitPrice,
    quantity,
    value,
    institutionId,
  ) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Button({ id: 'fundDistribution[0].expenseClassId' }).click(),
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.expect(Section({ id: 'fundDistributionAccordion' }).has({ error: 'Required!' }));
  },

  editFundInPOL(fund, unitPrice, value) {
    cy.wait(4000);
    cy.do([
      physicalUnitPriceTextField.fillIn(unitPrice),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(4000);
    cy.do(fundDistributionField.fillIn(value));
    cy.wait(4000);
    save();
    cy.wait(2000);
    submitOrderLine();
  },

  changeFundInPOLWithoutSaveInPercents(indexOfPreviusFund, fund, value) {
    cy.do([
      Button({ id: `fundDistribution[${indexOfPreviusFund}].fundId` }).click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(4000);
    cy.do([TextField({ name: `fundDistribution[${indexOfPreviusFund}].value` }).fillIn(value)]);
  },

  selectOrderline: (POlinenumber) => {
    cy.do(searchResultsPane.find(Link(POlinenumber)).click());
  },

  varifyOrderlineInResultsList: (POlinenumber) => {
    cy.expect(searchResultsPane.find(Link(POlinenumber)).exists());
  },

  selectOrderLineByIndex(rowIndex = 0) {
    cy.do(
      searchResultsPane
        .find(MultiColumnListCell({ row: rowIndex, columnIndex: 0 }))
        .find(Link())
        .click(),
    );

    return OrderLineDetails;
  },
  selectOrderLineByPolNumber(poLineNumber) {
    this.searchByParameter('Keyword', poLineNumber);
    cy.wait(4000);
    this.selectOrderline(poLineNumber);

    return OrderLineDetails;
  },
  selectreceivedTitleName: (title) => {
    cy.do(receivedtitleDetails.find(Link(title)).click());
  },

  openInstanceInPOL: (instanceTitle) => {
    cy.do(itemDetailsSection.find(Link(instanceTitle)).click());
  },

  selectInstanceInPackageTitles: (instanceTitle) => {
    cy.do(Section({ id: 'linkedInstances' }).find(Link(instanceTitle)).click());
  },

  addFundToPOL(fund, value) {
    cy.do([
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      saveAndCloseButton.click(),
    ]);
    cy.wait(6000);
    submitOrderLine();
  },

  addSecondFundToPOLWithPersentrageValue(fund, value) {
    cy.do([
      addFundDistributionButton.click(),
      secondFundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      TextField({ name: 'fundDistribution[1].value' }).perform((el) => {
        const li = el.closest('li');
        li?.querySelector('[data-test-fund-distr-type-percent="true"]')?.click();
      }),
      secondFundDistributionField.fillIn(value),
      saveAndCloseButton.click(),
    ]);
    cy.wait(6000);
    submitOrderLine();
  },

  addFundToPOLWithoutSave(indexOfPreviusFund, fund, value, amountType = false) {
    cy.do([
      addFundDistributionButton.click(),
      Button({ id: `fundDistribution[${indexOfPreviusFund}].fundId` }).click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(4000);
    if (amountType) {
      cy.do([Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click()]);
    }
    cy.do([TextField({ name: `fundDistribution[${indexOfPreviusFund}].value` }).fillIn(value)]);
  },

  addTwoFundsToPOLinPercent(
    fund,
    firstPercentValue,
    firstExpenseClass,
    secondExpenseClass,
    secondPercentValue,
  ) {
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(trashButton).click(),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      cy.wait(2000),
      fundDistributionExpenseClass.click(),
      SelectionOption(`${firstExpenseClass}`).click(),
      fundDistributionField.fillIn(firstPercentValue),
    ]);
    cy.wait(2000);
    cy.do([
      addFundDistributionButton.click(),
      secondFundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      cy.wait(2000),
      secondFundDistributionExpenseClass.click(),
      SelectionOption(`${secondExpenseClass}`).click(),
      secondFundDistributionField.fillIn(secondPercentValue),
    ]);
    cy.wait(2000);
    cy.do([saveAndCloseButton.click()]);
    cy.wait(6000);
    submitOrderLine();
  },

  rolloverPOLineInfoforElectronicResourceWithFund: (
    orderLineTitleName,
    fund,
    unitPrice,
    quantity,
    value,
  ) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.OTHER).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      electronicUnitPriceTextField.fillIn(unitPrice),
      quantityElectronicTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityElectronicField.fillIn(quantity),
      saveAndCloseButton.click(),
    ]);
  },

  POLineInfoforElectronicResource: (orderLineTitleName, fund) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.OTHER).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      electronicUnitPriceTextField.fillIn(electronicUnitPrice),
      quantityElectronicTextField.fillIn(quantityElectronic),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      fundDistributionField.fillIn('100'),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityElectronicField.fillIn(quantityElectronic),
      saveAndCloseButton.click(),
    ]);
  },

  fillInPOLineInfoWithFund: (fund) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitle),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn('2'),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      locationSelect.click(),
      SelectionOption('Main Library (KU/CC/DI/M)').click(),
      quantityPhysicalLocationField.fillIn('2'),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([fundDistributionField.fillIn('100'), saveAndCloseButton.click()]);
  },

  fillPolWithEuroCurrency(fund, unitPrice, quantity, institutionId) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      currencyButton.click(),
      SelectionOption('Euro (EUR)').click(),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      fundDistributionField.fillIn('100'),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.wait(4000);
    submitOrderLine();
  },

  fillPolWithPLNCurrency(fund, unitPrice, quantity, institutionId) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      currencyButton.click(),
      SelectionOption('Polish Zloty (PLN)').click(),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      fundDistributionField.fillIn('100'),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.wait(4000);
    submitOrderLine();
  },

  fillInPOLineInfoViaUi: () => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitle),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PE_MIX),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      electronicUnitPriceTextField.fillIn(electronicUnitPrice),
      quantityElectronicTextField.fillIn(quantityElectronic),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityPhysicalLocationField.fillIn(quantityPhysical),
      quantityElectronicField.fillIn(quantityElectronic),
    ]);
    cy.expect([
      physicalUnitPriceTextField.has({ value: physicalUnitPrice }),
      quantityPhysicalTextField.has({ value: quantityPhysical }),
      electronicUnitPriceTextField.has({ value: electronicUnitPrice }),
      quantityElectronicTextField.has({ value: quantityElectronic }),
    ]);
    save();
  },

  fillInPOLineInfoForExport(AUMethod) {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitle),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PE_MIX),
    ]);
    cy.wait(2000);
    cy.do([acquisitionMethodButton.click()]);
    cy.wait(2000);
    cy.do([SelectionOption(AUMethod).click()]);
    cy.wait(2000);
    cy.do([
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      ),
    ]);
    cy.do([
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      electronicUnitPriceTextField.fillIn(electronicUnitPrice),
      quantityElectronicTextField.fillIn(quantityElectronic),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityPhysicalLocationField.fillIn(quantityPhysical),
      quantityElectronicField.fillIn(quantityElectronic),
    ]);
    cy.expect([
      physicalUnitPriceTextField.has({ value: physicalUnitPrice }),
      quantityPhysicalTextField.has({ value: quantityPhysical }),
      electronicUnitPriceTextField.has({ value: electronicUnitPrice }),
      quantityElectronicTextField.has({ value: quantityElectronic }),
    ]);
    save();
  },

  fillInPOLineInfoForExportWithLocation(AUMethod, institutionId) {
    cy.wait(4000);
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([SelectionOption(AUMethod).click()]);
    cy.do([
      electronicUnitPriceTextField.fillIn(electronicUnitPrice),
      quantityElectronicTextField.fillIn(quantityElectronic),
      Select({ name: 'eresource.materialType' }).choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      selectLocationsModal.find(SearchField({ id: 'input-record-search' })).fillIn(institutionId),
      Button('Search').click(),
    ]);
    cy.wait(2000);
    cy.do([
      selectLocationsModal
        .find(MultiColumnListCell({ content: institutionId, row: 0, columnIndex: 0 }))
        .click(),
    ]);
    cy.do([quantityElectronicField.fillIn(quantityElectronic)]);
    cy.expect([
      electronicUnitPriceTextField.has({ value: electronicUnitPrice }),
      quantityElectronicTextField.has({ value: quantityElectronic }),
    ]);
    save();
    // If purchase order line will be dublicate, Modal with button 'Submit' will be activated
    submitOrderLine();
  },

  fillInPOLineInfoForExportWithLocationAndAccountNumber(AUMethod, location, accountNumber) {
    cy.wait(4000);
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(AUMethod).click(),
      Select({ name: 'vendorDetail.vendorAccount' }).choose(accountNumber),
    ]);
    cy.do([
      electronicUnitPriceTextField.fillIn(electronicUnitPrice),
      quantityElectronicTextField.fillIn(quantityElectronic),
      Select({ name: 'eresource.materialType' }).choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(location),
      Button('Search').click(),
      Modal('Select locations')
        .find(MultiColumnListCell({ content: location, row: 0, columnIndex: 0 }))
        .click(),
    ]);
    cy.do([quantityElectronicField.fillIn(quantityElectronic)]);
    cy.expect([
      electronicUnitPriceTextField.has({ value: electronicUnitPrice }),
      quantityElectronicTextField.has({ value: quantityElectronic }),
    ]);
    save();
    // If purchase order line will be dublicate, Modal with button 'Submit' will be activated
    submitOrderLine();
  },

  fillInPOLineInfoForExportWithLocationForPhysicalResource(AUMethod, institutionName, quantity) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(3000);
    cy.do([
      SelectionOption(AUMethod).click(),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionName),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionName)).click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity)]);
    cy.expect([
      physicalUnitPriceTextField.has({ value: physicalUnitPrice }),
      quantityPhysicalLocationField.has({ value: quantity }),
    ]);
    save();
    // If purchase order line will be dublicate, Modal with button 'Submit' will be activated
    submitOrderLine();
  },

  fillInPOLineInfoForPhysicalResourceWithPaymentNotRequired(
    fund,
    unitPrice,
    quantity,
    value,
    institutionId,
  ) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      Select({ name: 'paymentStatus' }).choose(ORDER_PAYMENT_STATUS.PAYMENT_NOT_REQUIRED),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.wait(2000);
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.wait(4000);
    submitOrderLine();
  },

  deleteButtonInOrderLineIsAbsent: () => {
    cy.wait(4000);
    expandActionsDropdownInPOL();
    cy.expect(Button('Delete').absent());
  },

  editPOLineInfoAndChangeLocation(institutionName, quantity) {
    cy.do([
      locationSection.find(trashButton).click(),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionName),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionName)).click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity)]);
    cy.expect([
      physicalUnitPriceTextField.has({ value: physicalUnitPrice }),
      quantityPhysicalLocationField.has({ value: quantity }),
    ]);
    save();
    // If purchase order line will be dublicate, Modal with button 'Submit' will be activated
    submitOrderLine();
  },

  fillInPOLineInfoWithLocationForPEMIXResource(accountNumber, AUMethod, institutionName, quantity) {
    cy.do([orderFormatSelect.choose(ORDER_FORMAT_NAMES.PE_MIX), acquisitionMethodButton.click()]);
    cy.wait(2000);
    cy.do([
      SelectionOption(AUMethod).click(),
      Select({ name: 'vendorDetail.vendorAccount' }).choose(accountNumber),
    ]);
    cy.do([
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      electronicUnitPriceTextField.fillIn(electronicUnitPrice),
      quantityElectronicTextField.fillIn(quantity),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      Select({ name: 'eresource.materialType' }).choose(MATERIAL_TYPE_NAMES.DVD),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionName),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionName)).click(),
    ]);
    cy.do([
      quantityPhysicalLocationField.fillIn(quantity),
      quantityElectronicField.fillIn(quantity),
      physicalResourceDetailsAccordion
        .find(Select({ name: 'physical.createInventory' }))
        .choose('Instance, holdings, item'),
      eResourcesDetails
        .find(Select({ name: 'eresource.createInventory' }))
        .choose('Instance, holdings'),
      saveAndCloseButton.click(),
    ]);
    // If purchase order line will be dublicate, Modal with button 'Submit' will be activated
    cy.wait(2000);
    submitOrderLine();
  },

  selectFilterMainLibraryLocationsPOL: () => {
    cy.do([
      buttonLocationFilter.click(),
      Button('Location look-up').click(),
      Select({ name: 'campusId' }).choose('City Campus'),
      Button({ id: 'locationId' }).click(),
      SelectionOption('Main Library (KU/CC/DI/M) ').click(),
      saveButton.click(),
      buttonLocationFilter.click(),
    ]);
  },

  selectFilterFundCodeUSHISTPOL: () => {
    cy.do([
      buttonFundCodeFilter.click(),
      Button({ id: 'fundCode-selection' }).click(),
      SelectionOption('USHIST').click(),
      buttonFundCodeFilter.click(),
    ]);
  },

  selectFilterOrderFormatPhysicalResourcePOL: () => {
    cy.do([
      buttonOrderFormatFilter.click(),
      Checkbox({ id: 'clickable-filter-orderFormat-physical-resource' }).click(),
      buttonOrderFormatFilter.click(),
    ]);
  },

  selectFilterVendorPOL: (invoice) => {
    cy.do([
      buttonFVendorFilter.click(),
      Button({ id: 'purchaseOrder.vendor-button' }).click(),
      Modal('Select Organization').find(searchField).fillIn(invoice.vendorName),
      Modal('Select Organization').find(searchButton).click(),
    ]);
    SearchHelper.selectFromResultsList();
    cy.do(buttonFVendorFilter.click());
  },

  selectFilterNoInRushPOL: () => {
    cy.do([
      buttonRushFilter.click(),
      Checkbox({ id: 'clickable-filter-rush-false' }).click(),
      buttonRushFilter.click(),
    ]);
  },

  selectFilterOngoingPaymentStatus: () => {
    cy.do(Checkbox({ id: 'clickable-filter-paymentStatus-ongoing' }).click());
  },

  selectFilterSubscriptionFromPOL: (newDate) => {
    cy.do([
      buttonSubscriptionFromFilter.click(),
      TextField('From').fillIn(newDate),
      TextField('To').fillIn(newDate),
      Button('Apply').click(),
      buttonSubscriptionFromFilter.click(),
    ]);
  },

  selectPOLInOrder: (index = 0) => {
    cy.do(
      polListingAccordion
        .find(MultiColumnListRow({ index }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .click(),
    );
  },

  addPolToOrder(
    { title, method, format, price, quantity, inventory, location, materialType },
    shouldSave = true,
  ) {
    cy.wait(2000);
    this.addPOLine();
    this.fillPolByLinkTitle(title);
    this.addAcquisitionMethod(method);
    this.addOrderFormat(format);
    this.fillPhysicalUnitPrice(price);
    this.fillPhysicalUnitQuantity(quantity);
    this.addCreateInventory(inventory);
    this.addHolding(location, quantity);
    this.addMaterialType(materialType);
    if (shouldSave) {
      this.savePol();
    }
  },

  editPOLInOrder: () => {
    cy.do(orderLineDetailsPane.find(paneHeaderOrderLinesDetailes.find(actionsButton)).click());
    cy.wait(4000);
    cy.do(Button('Edit').click());
    cy.wait(4000);
  },

  changeInstanceConnectionInActions: () => {
    cy.do([
      orderLineDetailsPane.find(paneHeaderOrderLinesDetailes.find(actionsButton)).click(),
      Button('Change instance connection').click(),
    ]);
    cy.wait(4000);
  },

  fillPOLineDetails({ receiptStatus }) {
    if (receiptStatus) {
      cy.do(poLineDetails.receiptStatus.focus());
      cy.do(poLineDetails.receiptStatus.choose(receiptStatus));
      cy.expect(
        poLineDetails.receiptStatus.has({ value: matching(new RegExp(receiptStatus, 'i')) }),
      );
    }
  },

  deleteFundInPOL() {
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(trashButton).click(),
      saveAndCloseButton.click(),
    ]);
    cy.wait(6000);
    submitOrderLine();
    cy.wait(4000);
  },

  clickAddFundDistributionButton() {
    cy.do(Button('Add fund distribution').click());
  },

  fillFundInPOLWithoutExpenseClass(fund) {
    cy.do(fundDistributionSelect.click());
    cy.do([
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      // need to click for activating checking of required Expense class field
      fundDistributionExpenseClass.click(),
    ]);
  },

  deleteFundInPOLwithoutSave(index = 0) {
    cy.get('#fundDistributionAccordion').find('button[icon="trash"]').eq(index).click();
  },

  deleteFundsInPOL() {
    cy.get('#fundDistributionAccordion').find('button[icon="trash"]').first().click();
  },

  deleteLocationsInPOL() {
    cy.get('#location').find('button[icon="trash"]').first().click();
  },

  addContributorToPOL: () => {
    cy.do([
      Button('Add contributor').click(),
      TextField('Contributor*').fillIn(contibutor),
      Select('Contributor type*').choose('Personal name'),
    ]);
  },

  changePaymentStatus: (paymantStatus) => {
    cy.do(Select({ name: 'paymentStatus' }).choose(paymantStatus));
  },

  saveOrderLine() {
    cy.wait(4000);
    cy.expect(saveAndCloseButton.has({ disabled: false }));
    save();
    this.submitOrderLine();
    cy.wait(4000);
  },

  openInstance: () => {
    cy.do(
      Section({ id: 'ItemDetails' })
        .find(Link({ href: including('/inventory/view/') }))
        .click(),
    );
  },

  openReceiving: () => {
    cy.do([paneHeaderOrderLinesDetailes.find(actionsButton).click(), Button('Receive').click()]);
  },

  fillPolByLinkTitle: (instanceTitle) => {
    cy.do(Button('Title look-up').click());
    SelectInstanceModal.searchByName(instanceTitle);
    SelectInstanceModal.selectInstance(instanceTitle);
  },

  addAcquisitionMethod: (method) => {
    cy.do(acquisitionMethodButton.click());
    cy.do(SelectionOption(method).click());
  },

  addOrderFormat: (format) => {
    cy.do(orderFormatSelect.choose(format));
  },

  fillPhysicalUnitPrice: (price) => {
    cy.do(physicalUnitPriceTextField.fillIn(price));
  },

  fillPhysicalUnitQuantity: (quantity) => {
    cy.do(quantityPhysicalTextField.fillIn(quantity));
  },

  addCreateInventory: (inventory) => {
    cy.do(Select('Create inventory*').choose(inventory));
  },

  addMaterialType: (type) => {
    cy.do(Select({ name: 'physical.materialType' }).choose(type));
    // need to wait upload product types
    cy.wait(1000);
  },
  addHolding(location, quantity = quantityPhysical) {
    if (location) {
      cy.do(addLocationButton.click());
      this.selectLocation(location, quantity);
    }
  },
  selectLocation(location, quantity) {
    cy.do([
      holdingSelect.click(),
      SelectionOption(including(location)).click(),
      quantityPhysicalLocationField.fillIn(quantity),
    ]);
  },
  setPhysicalQuantity(quantity) {
    cy.do([quantityPhysicalLocationField.clear(), quantityPhysicalLocationField.fillIn(quantity)]);
    cy.expect(quantityPhysicalLocationField.has({ value: quantity }));
  },
  setElectronicQuantity(quantity) {
    cy.wait(1500);
    cy.do([quantityElectronicField.clear(), quantityElectronicField.fillIn(quantity)]);
    cy.expect(quantityElectronicField.has({ value: quantity }));
  },
  openCreateHoldingForLocation() {
    cy.do([addLocationButton.click(), createNewLocationButton.click()]);
    return SelectLocationModal;
  },
  savePol: () => {
    save();
    cy.expect(Pane({ id: 'pane-poLineForm' }).absent());
  },

  fillPOLWithTitleLookUp: () => {
    cy.do([orderFormatSelect.choose(ORDER_FORMAT_NAMES.OTHER), acquisitionMethodButton.click()]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityPhysicalLocationField.fillIn(quantityPhysical),
      saveAndCloseButton.click(),
    ]);
  },

  changePhysicalUnitPrice: (unitPrice) => {
    cy.do([physicalUnitPriceTextField.fillIn(unitPrice)]);
  },

  selectRandomInstanceInTitleLookUP: (instanceName, rowNumber = 0) => {
    cy.wait(4000);
    cy.do([
      Button({ id: 'find-instance-trigger' }).click(),
      selectInstanceModal.find(TextField({ name: 'query' })).fillIn(instanceName),
      selectInstanceModal.find(searchButton).click(),
    ]);
    cy.do([selectInstanceModal.find(MultiColumnListRow({ index: rowNumber })).click()]);
    // Need to wait,while entering data loading on page
    cy.wait(2000);
  },

  preparePOLToPackage: (titleName) => {
    cy.wait(4000);
    cy.do([Checkbox({ name: 'isPackage' }).click(), orderLineTitleField.fillIn(titleName)]);
    // Need to wait,while entering data loading on page
    cy.wait(2000);
  },

  submitMoveInChangeTitleModal: () => {
    cy.wait(4000);
    cy.do([
      Modal('Change title').find(Select('How to update Holdings*')).choose('Move'),
      Button('Submit').click(),
    ]);
    // Need to wait,while entering data loading on page
    cy.wait(2000);
    InteractorsTools.checkCalloutMessage('Order instance connection has been successfully updated');
  },

  submitCreateNewInChangeTitleModal: (holdingsButton) => {
    cy.wait(4000);
    cy.do([
      Modal('Change title').find(Select('How to update Holdings*')).choose('Create new'),
      Button('Submit').click(),
      Modal('Delete Holdings').find(Button(holdingsButton)).click(),
    ]);
    // Need to wait,while entering data loading on page
    cy.wait(2000);
    InteractorsTools.checkCalloutMessage('Order instance connection has been successfully updated');
  },

  selectInstanceInSelectInstanceModal: (instanceName, rowNumber = 0) => {
    cy.wait(4000);
    cy.do([
      selectInstanceModal.find(TextField({ name: 'query' })).fillIn(instanceName),
      selectInstanceModal.find(searchButton).click(),
      selectInstanceModal.find(MultiColumnListRow({ index: rowNumber })).click(),
    ]);
    // Need to wait,while entering data loading on page
    cy.wait(2000);
  },

  checkConnectedInstance: () => {
    cy.expect(Link('Connected').exists());
  },

  fillInInvalidDataForPublicationDate: () => {
    cy.do(TextField({ text: 'Publication date' }).fillIn('Invalid date'));
  },

  clickNotConnectionInfoButton: () => {
    cy.do(itemDetailsSection.find(Button({ icon: 'info' })).click());
  },

  removeInstanceConnectionModal: () => {
    cy.do(
      Modal({ id: 'break-instance-connection-confirmation' })
        .find(Button({ id: 'clickable-break-instance-connection-confirmation-confirm' }))
        .click(),
    );
    cy.wait(4000);
  },

  cancelRemoveInstanceConnectionModal: () => {
    cy.do(
      Modal({ id: 'break-instance-connection-confirmation' })
        .find(Button({ id: 'clickable-break-instance-connection-confirmation-cancel' }))
        .click(),
    );
    cy.wait(6000);
  },

  cancelEditingPOL: () => {
    cy.do(Button({ id: 'clickable-close-new-line-dialog-footer' }).click());
    cy.wait(6000);
  },

  confirmCancelingPOLChanges: () => {
    cy.do(
      Modal({ id: 'cancel-editing-confirmation' })
        .find(Button({ id: 'clickable-cancel-editing-confirmation-cancel' }))
        .click(),
    );
    cy.wait(2000);
  },

  selectCurrentEncumbrance: (currentEncumbrance) => {
    cy.do(fundDistributionSection.find(Link(currentEncumbrance)).click());
  },

  openPageCurrentEncumbranceInFund: (fund, linkText) => {
    cy.get('#FundDistribution')
      .contains('div[class^="mclCell-"]', fund)
      .parent()
      .find('a')
      .contains(linkText)
      .invoke('removeAttr', 'target')
      .click();
  },

  openPageCurrentEncumbrance(fundText) {
    cy.get('#FundDistribution')
      .find('a[data-test-text-link="true"]')
      .contains(fundText)
      .invoke('removeAttr', 'target')
      .click();
  },

  checkCurrentEncumbranceIsBlank() {
    cy.get('#FundDistribution [role="gridcell"]')
      .eq(5)
      .then(($cell) => {
        const noValue = $cell.find('[data-test-no-value="true"]').length > 0;
        if (noValue) {
          cy.wrap(noValue).should('be.true');
        } else {
          const text = $cell.text().trim().replace(/\s+/g, ' ');
          expect(text).to.equal('$0.00');
        }
      });
  },

  openPageConnectedInstance: () => {
    cy.get('#itemDetails').find('a').contains('Connected').invoke('removeAttr', 'target')
      .click();
  },

  cancelPOL: () => {
    cy.do([
      orderLineDetailsPane.find(paneHeaderOrderLinesDetailes.find(actionsButton)).click(),
      cancelButton.click(),
      Button('Cancel order line').click(),
    ]);
  },

  changeFundInPOL: (fund) => {
    cy.wait(4000);
    cy.do([fundDistributionSelect.click(), SelectionOption(`${fund.name} (${fund.code})`).click()]);
    cy.wait(2000);
    cy.do([saveAndCloseButton.click()]);
  },

  checkFundInPOL: (fund) => {
    cy.expect(fundDistributionSection.find(Link(`${fund.name}(${fund.code})`)).exists());
  },

  checkCurrencyInPOL: () => {
    cy.get('[id=FundDistribution]').contains('a', '$').should('exist');
  },

  checkDownloadedFile() {
    cy.wait(5000);
    // Find and read the most recent order export CSV file
    FileManager.findDownloadedFilesByMask('*order-export*.csv').then((downloadedFilenames) => {
      if (downloadedFilenames && downloadedFilenames.length > 0) {
        const fileName = downloadedFilenames[0];

        FileManager.readFile(fileName).then((fileContent) => {
          const fileRows = fileContent.split('\n');
          expect(fileRows[0].trim()).to.equal(
            '"PO number prefix","PO number","PO number suffix","Vendor","Organization type","Order type","Acquisitions units","Approval date","Assigned to","Bill to","Ship to","Manual","Re-encumber","Note","Workflow status","Approved","Approved by","Renewal interval","Subscription","Manual renewal","Ongoing notes","Review period","Renewal date","Review date","PO tags","Date opened","Created by","Created on","Updated by","Updated on","POLine number","Title","Instance UUID","Subscription from","Subscription to","Subscription interval","Receiving note","Publisher","Edition","Linked package","Contributor, Contributor type","Product ID, Qualifier, Product ID type","Internal note","Acquisition method","Order format","Receipt date","Receipt status","Payment status","Source","Donor","Selector","Requester","Cancellation restriction","Cancellation description","Rush","Collection","Line description","Vendor reference number, reference type","Instructions to vendor","Account number","Physical unit price","Quantity physical","Electronic unit price","Quantity electronic","Discount","Estimated price","Currency","Fund code, Expense class, Value, Amount","Location, Quantity P, Quantity E","Material supplier","Receipt due","Expected receipt date","Volumes","Create inventory","Material type","Access provider","Activation status","Activation due","Create inventory E","Material type E","Trial","Expected activation","User limit","URL","POLine tags","Renewal note","Exchange rate","Created by (PO Line)","Created on (PO Line)","Updated by (PO Line)","Updated on (PO Line)"',
          );
        });
      }
    });
  },

  checkCreateInventory() {
    cy.expect([
      physicalResourceDetailsAccordion
        .find(KeyValue({ value: 'Instance, Holding, Item' }))
        .exists(),
      eResourcesDetails.find(KeyValue({ value: 'Instance, Holding, Item' })).exists(),
    ]);
  },

  openLinkedInstance() {
    cy.do(Accordion('Linked instance').clickHeader());
    cy.do(
      Accordion('Linked instance')
        .find(Link({ href: including('/inventory/view') }))
        .click(),
    );
  },

  getAssignedPOLNumber: () => cy.then(() => Accordion('Purchase order line').find(KeyValue('POL number')).value()),

  verifyPOLDetailsIsOpened: () => {
    cy.expect(orderLineDetailsPane.find(paneHeaderOrderLinesDetailes).exists());
  },

  verifyOrderTitle(title) {
    cy.expect(KeyValue('Title').has({ value: title }));
  },

  addNewNote() {
    cy.do([
      Section({ id: 'notes' })
        .find(Button({ id: 'note-create-button' }))
        .click(),
      TextField({ name: 'title' }).fillIn(noteTitle),
      saveAndCloseButton.click(),
    ]);
    cy.wait(4000);
  },

  receiveOrderLineViaActions() {
    cy.do([
      PaneHeader({ id: 'paneHeaderorder-lines-details' }).find(actionsButton).click(),
      Button('Receive').click(),
    ]);
  },

  checkCreatedInventoryInPhysicalRecourceDetails: (value) => {
    cy.expect(
      Accordion('Physical resource details').find(KeyValue('Create inventory')).has({ value }),
    );
  },

  checkCreatedInventoryInElectronicRecourceDetails: (value) => {
    cy.expect(Accordion('E-resources details').find(KeyValue('Create inventory')).has({ value }));
  },

  checkCreatedInventoryInOtherRecourceDetails: (value) => {
    cy.expect(
      Accordion('Other resource details').find(KeyValue('Create inventory')).has({ value }),
    );
  },

  checkPaymentStatusInPOL: (paymentStatus) => {
    cy.expect(KeyValue('Payment status').has({ value: paymentStatus }));
  },

  verifyOrderFieldContent: (orderData) => {
    cy.expect([KeyValue(orderData.name).has({ value: orderData.value })]);
  },
  checkIsOrderCreatedWithDataFromImportedFile: (orderData) => {
    cy.expect([
      KeyValue('Title').has({ value: orderData.title }),
      KeyValue('Publication date').has({ value: orderData.publicationDate }),
      KeyValue('Publisher').has({ value: orderData.publisher }),
      KeyValue('Internal note').has({ value: orderData.internalNote }),
      KeyValue('Acquisition method').has({ value: orderData.acquisitionMethod }),
      KeyValue('Order format').has({ value: orderData.orderFormat }),
      KeyValue('Receipt status').has({ value: orderData.receiptStatus }),
      KeyValue('Payment status').has({ value: orderData.paymentStatus }),
      KeyValue('Source').has({ value: orderData.source }),
      KeyValue('Selector').has({ value: orderData.selector }),
      KeyValue('Receiving workflow').has({ value: orderData.receivingWorkflow }),
      KeyValue('Account number').has({ value: orderData.accountNumber }),
      KeyValue('Physical unit price').has({ value: orderData.physicalUnitPrice }),
      Accordion('Cost details')
        .find(KeyValue('Quantity physical'))
        .has({ value: orderData.quantityPhysical }),
      KeyValue('Currency').has({ value: orderData.currency }),
      KeyValue('Material supplier').has({ value: orderData.materialSupplier }),
      KeyValue('Create inventory').has({ value: orderData.createInventory }),
      KeyValue('Material type').has({ value: orderData.materialType }),
    ]);
    cy.expect(
      MultiColumnList({ id: 'list-item-contributors' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: orderData.contributor }),
    );
    cy.expect(
      MultiColumnList({ id: 'list-item-contributors' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: orderData.contributorType }),
    );
    cy.expect(
      MultiColumnList({ id: 'list-product-ids' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: orderData.productId }),
    );
    cy.expect(
      MultiColumnList({ id: 'list-product-ids' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: orderData.productIDType }),
    );
    cy.expect(
      MultiColumnList({ id: 'list-item-reference-numbers' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: orderData.vendorReferenceNumber }),
    );
    cy.expect(
      MultiColumnList({ id: 'list-item-reference-numbers' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: orderData.vendorReferenceType }),
    );
    cy.expect([
      KeyValue('Name (code)').has({ value: orderData.locationName }),
      Pane({ id: 'order-lines-details' })
        .find(Accordion('Location'))
        .find(KeyValue('Quantity physical'))
        .has({ value: orderData.locationQuantityPhysical }),
    ]);
    cy.expect(
      fundDistributionAccordion
        .find(MultiColumnList())
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: orderData.fund }),
    );
    cy.expect(
      fundDistributionAccordion
        .find(MultiColumnList())
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: orderData.value }),
    );
  },

  checkFundAndExpenseClassPopulated(fundInformation) {
    cy.expect(
      fundDistributionAccordion
        .find(MultiColumnList())
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: fundInformation.fund }),
    );
    cy.expect(
      fundDistributionAccordion
        .find(MultiColumnList())
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: fundInformation.expenseClass }),
    );
    cy.expect(
      fundDistributionAccordion
        .find(MultiColumnList())
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: fundInformation.value }),
    );
    cy.expect(
      fundDistributionAccordion
        .find(MultiColumnList())
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .has({ content: fundInformation.amount }),
    );
  },

  checkErrorToastMessage: (message) => {
    cy.wait(4000);
    InteractorsTools.checkOneOfCalloutsContainsErrorMessage(message);
  },

  checkPhysicalQuantityInLocation: (quantity) => {
    const arrayOfQuantityRows = [];
    cy.get('#location')
      .find('[class*="col-"]:nth-child(2)')
      .each(($row) => {
        cy.get('[class*="kvValue-"]', { withinSubject: $row })
          // extract its text content
          .invoke('text')
          .then((cellValue) => {
            arrayOfQuantityRows.push(cellValue);
          });
      })
      .then(() => {
        expect(quantity).to.equal(arrayOfQuantityRows.length);
      });
  },
  checkElectronicQuantityInLocation: (quantity) => {
    const arrayOfQuantityRows = [];
    cy.get('#location')
      .find('[class*="col-"]:nth-child(3)')
      .each(($row) => {
        cy.get('[class*="kvValue-"]', { withinSubject: $row })
          // extract its text content
          .invoke('text')
          .then((cellValue) => {
            arrayOfQuantityRows.push(cellValue);
          });
      })
      .then(() => {
        expect(quantity).to.equal(arrayOfQuantityRows.length);
      });
  },
  getOrderLineViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'orders/order-lines',
        searchParams,
      })
      .then(({ body }) => body.poLines);
  },
  getOrderLineByIdViaApi(orderLineId) {
    return cy
      .okapiRequest({
        path: `orders/order-lines/${orderLineId}`,
      })
      .then(({ body }) => body);
  },
  createOrderLineViaApi(orderLine) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'orders/order-lines',
        body: orderLine,
      })
      .then(({ body }) => body);
  },
  updateOrderLineViaApi(orderLine) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `orders/order-lines/${orderLine.id}`,
      body: orderLine,
    });
  },
  deleteOrderLineViaApi(orderLineId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `orders/order-lines/${orderLineId}`,
    });
  },
  verifyPOlineListIncludesLink: (POlinenumber) => {
    cy.expect(searchResultsPane.find(Link(POlinenumber)).exists());
  },

  verifyNoResultsMessage() {
    cy.expect(HTML('Choose a filter or enter a search query to show results.').exists());
  },

  verifyOrderTitlePOL(title) {
    cy.expect(
      orderLineDetailsPane.find(paneHeaderOrderLinesDetailes).has({ text: including(title) }),
    );
  },

  selectStatusInSearchOrderLine: (orderStatus) => {
    cy.do(Accordion({ id: 'receiptStatus' }).clickHeader());
    switch (orderStatus) {
      case 'Awaiting receipt':
        cy.do(
          Checkbox({ id: 'clickable-filter-receiptStatus-awaiting-receipt' }).checkIfNotSelected(),
        );
        break;
      case 'Cancelled':
        cy.do(Checkbox({ id: 'clickable-filter-receiptStatus-cancelled' }).checkIfNotSelected());
        break;
      case 'Fully received':
        cy.do(
          Checkbox({ id: 'clickable-filter-receiptStatus-fully-received' }).checkIfNotSelected(),
        );
        break;
      case 'Ongoing':
        cy.do(Checkbox({ id: 'clickable-filter-receiptStatus-ongoing' }).checkIfNotSelected());
        break;
      case 'Partially received':
        cy.do(
          Checkbox({
            id: 'clickable-filter-receiptStatus-partially-received',
          }).checkIfNotSelected(),
        );
        break;
      case 'Pending':
        cy.do(Checkbox({ id: 'clickable-filter-receiptStatus-pending' }).checkIfNotSelected());
        break;
      case 'Receipt not required':
        cy.do(
          Checkbox({
            id: 'clickable-filter-receiptStatus-receipt-not-required',
          }).checkIfNotSelected(),
        );
        break;
      default:
        cy.log('No such status like ' + orderStatus + '. Please use Closed, Open or Pending');
    }
  },

  claimingActiveAndSetInterval(interval) {
    cy.do([
      Checkbox({ name: 'claimingActive' }).click(),
      TextField({ name: 'claimingInterval' }).fillIn(interval),
    ]);
  },

  claimingActive() {
    cy.do(Checkbox({ name: 'claimingActive' }).click());
  },

  checkClaimingIntervalInPOL(claimingInterval) {
    cy.expect([
      poLineInfoSection.find(KeyValue('Claiming interval')).has({ value: claimingInterval }),
    ]);
  },

  verifyProductIdentifier: (productId, productIdType, rowIndex = 0) => {
    if (productIdType) {
      cy.expect([
        MultiColumnList({ id: 'list-product-ids' })
          .find(MultiColumnListRow({ index: rowIndex }))
          .find(MultiColumnListCell({ columnIndex: 0 }))
          .has({ content: productId }),
        MultiColumnList({ id: 'list-product-ids' })
          .find(MultiColumnListRow({ index: rowIndex }))
          .find(MultiColumnListCell({ columnIndex: 2 }))
          .has({ content: productIdType }),
      ]);
    } else {
      cy.expect(
        MultiColumnList({ id: 'list-product-ids' })
          .find(MultiColumnListRow({ index: rowIndex }))
          .find(MultiColumnListCell({ columnIndex: 0 }))
          .has({ content: productId }),
      );
    }
  },

  openDonorInformationSection() {
    cy.do(Button({ id: 'accordion-toggle-button-donorsInformation' }).click());
    cy.wait(2000);
  },

  checkAddDonorButtomisActive() {
    cy.expect([
      Section({ id: 'donorsInformation' })
        .find(Button({ id: 'donorOrganizationIds-plugin' }))
        .is({ disabled: false }),
    ]);
  },

  addDonor(donorName) {
    cy.do([
      Button({ id: 'donorOrganizationIds-plugin' }).click(),
      addDonorsModal.find(TextField({ id: 'input-record-search' })).fillIn(donorName),
      addDonorsModal.find(searchButton).click(),
    ]);
    cy.wait(3000);
    cy.do([
      addDonorsModal.find(Checkbox({ ariaLabel: 'Select all' })).click(),
      addDonorsModal.find(Button('Save')).click(),
    ]);
  },

  addDonorAndCancel(donorName) {
    cy.do([
      Button({ id: 'donorOrganizationIds-plugin' }).click(),
      addDonorsModal.find(TextField({ id: 'input-record-search' })).fillIn(donorName),
      addDonorsModal.find(searchButton).click(),
      addDonorsModal.find(Checkbox({ ariaLabel: 'Select all' })).click(),
      addDonorsModal.find(Button('Close')).click(),
    ]);
  },

  deleteDonor(donorName) {
    cy.get('#donorOrganizationIds')
      .find('[data-row-index]')
      .contains(donorName)
      .closest('[data-row-index]')
      .within(() => cy.get('button[aria-label="Unassign"]').click());
  },

  checkEmptyDonorList() {
    cy.get('#donorsInformation').contains('The list contains no items');
  },

  clickTitleLookUp() {
    cy.do(Button('Title look-up').click());
    SelectInstanceModal.waitLoading();
  },

  POLWithDifferntCurrency(
    fund,
    unitPrice,
    quantity,
    value,
    institutionId,
    currency,
    currencyLogo,
    exchangeRate,
  ) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(
        RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      ),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      currencyButton.click(),
      SelectionOption(currency).click(),
      Checkbox({ id: 'use-set-exchange-rate' }).click(),
      TextField({ name: 'cost.exchangeRate' }).fillIn(exchangeRate),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      Section({ id: 'fundDistributionAccordion' }).find(Button(currencyLogo)).click(),
      fundDistributionField.fillIn(value),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.do([
      TextField({ id: 'input-record-search' }).fillIn(institutionId),
      Button('Search').click(),
      Modal('Select locations').find(MultiColumnListCell(institutionId)).click(),
    ]);
    cy.do([quantityPhysicalLocationField.fillIn(quantity), saveAndCloseButton.click()]);
    cy.wait(4000);
    submitOrderLine();
  },

  selectLocationInFilters: (locationName) => {
    cy.wait(4000);
    cy.do([
      Button({ id: 'accordion-toggle-button-pol-location-filter' }).click(),
      Button('Location look-up').click(),
      selectLocationsModal.find(SearchField({ id: 'input-record-search' })).fillIn(locationName),
      Button('Search').click(),
    ]);
    cy.wait(2000);
    cy.do([
      selectLocationsModal.find(Checkbox({ ariaLabel: 'Select all' })).click(),
      selectLocationsModal.find(Button('Save')).click(),
    ]);
  },

  selectOrders: () => {
    cy.do(Section({ id: 'order-lines-filters-pane' }).find(Button('Orders')).click());
  },

  openRoutingLists: () => {
    cy.do(Button({ id: 'accordion-toggle-button-routing-list' }).click());
  },

  addRoutingListExist: () => {
    cy.expect(routingListSection.find(addRoutingListButton).exists());
  },

  addRoutingList: () => {
    cy.do(routingListSection.find(addRoutingListButton).click());
  },

  addRoutingListByActions: () => {
    cy.do([routingListSection.find(actionsButton).click(), addRoutingListButton.click()]);
  },

  addRoutingListAbsent: () => {
    cy.expect(routingListSection.find(addRoutingListButton).absent());
  },

  fillInRoutingListInfoAndSave: (name) => {
    cy.do([TextField({ id: 'input-routing-list-name' }).fillIn(name), saveAndCloseButton.click()]);
  },

  fillInRoutingListInfoWithNotesAndSave: (name, notes) => {
    cy.do([
      TextField({ id: 'input-routing-list-name' }).fillIn(name),
      TextArea({ name: 'notes' }).fillIn(notes),
      saveAndCloseButton.click(),
    ]);
  },

  varifyAddingRoutingList: (name) => {
    cy.expect(routingListSection.find(MultiColumnListCell(name)).exists());
  },

  openRoutingList: (name) => {
    cy.do(routingListSection.find(MultiColumnListCell(name)).find(Link()).click());
  },

  checkRoutingListNameDetails(name) {
    cy.expect(KeyValue('Name').has({ value: name }));
  },

  checkRoutingListNotesDetails(notes) {
    cy.expect(KeyValue('Notes').has({ value: notes }));
  },

  addRoutingListIsDisabled() {
    cy.expect(addRoutingListButton.has({ disabled: true }));
  },

  clickActionsButtonInRoutingList() {
    cy.do(routingListSection.find(actionsButton).click());
  },

  deleteRoutingList() {
    cy.do([
      actionsButton.click(),
      Button('Delete').click(),
      Modal('Delete Routing list')
        .find(Button({ id: 'clickable-delete-routing-list-confirmation-confirm' }))
        .click(),
    ]);
  },

  editRoutingList() {
    cy.do([actionsButton.click(), Button('Edit').click()]);
  },

  addUserToRoutingList() {
    cy.do(Button({ id: 'clickable-plugin-find-user' }).click());
  },

  unAssignAllUsers() {
    cy.do([
      Button({ id: 'clickable-remove-all-permissions' }).click(),
      Modal('Unassign all users').find(Button('Yes')).click(),
    ]);
  },

  deleteUserFromRoutingList(user) {
    cy.do(Button({ id: `clickable-remove-user-${user}` }).click());
  },

  assignUser: (userName) => {
    cy.do([
      findUserButton.click(),
      userSearchModal.find(searchTextField).fillIn(userName),
      searchButton.click(),
    ]);
    cy.wait(4000);
    cy.do([
      userSearchModal.find(firstSearchResult).find(checkboxAll).click(),
      userSearchModal.find(Button('Save')).click(),
    ]);
  },

  checkUserIsAdded(user) {
    cy.expect(MultiColumnListCell(including(user)).exists());
  },

  checkUserIsAbsent(user) {
    cy.expect(MultiColumnListCell(including(user)).absent());
  },

  checkBinderyActiveStatus(status) {
    cy.get('label:contains("Bindery active")').within(() => {
      cy.get('input[type="checkbox"]').should('have.prop', 'checked', status);
    });
  },

  checkDonorInformation(donors) {
    for (let i = 0; i < donors.length; i++) {
      cy.expect(
        Section({ id: 'donorsInformation' })
          .find(MultiColumnListCell({ row: i, column: 'Name' }))
          .has({ content: donors[i] }),
      );
    }
  },

  checkDonorIsAbsent(donor) {
    cy.expect(
      Section({ id: 'donorsInformation' })
        .find(MultiColumnListCell({ content: donor }))
        .absent(),
    );
  },

  changeExpenseClassInPOLWithoutSave(indexOfPreviousExpenseClass, expenseClass) {
    cy.do([
      Button({ id: `fundDistribution[${indexOfPreviousExpenseClass}].expenseClassId` }).click(),
      SelectionOption(`${expenseClass.name}`).click(),
    ]);
    cy.wait(2000);
  },

  setExchangeRate(exchangeRate) {
    cy.do(Checkbox({ id: 'use-set-exchange-rate' }).click());
    cy.get('[name="cost.exchangeRate"]').type('{selectall}{backspace}', { delay: 50 });
    cy.get('[name="cost.exchangeRate"]').type(exchangeRate, { delay: 100 });
  },

  selectCurrency(currency) {
    cy.do([currencyButton.click(), SelectionOption(currency).click()]);
  },

  addPackageTitleViaApi({ title, poLineId, instanceId }) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'orders/titles',
      body: {
        title,
        poLineId,
        instanceId,
      },
    });
  },

  createRoutingListViaApi(userIds, routingListName, polId) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'orders/routing-lists',
      body: {
        userIds,
        name: routingListName,
        poLineId: polId,
      },
    });
  },

  fillInRoutingListInfo: (name) => {
    cy.do(TextField({ id: 'input-routing-list-name' }).fillIn(name));
  },

  saveRoutingList: () => {
    cy.do(saveAndCloseButton.click());
  },

  unAssignUserFromRoutingList(userID) {
    cy.do(Button({ id: `clickable-remove-user-${userID}` }).click());
  },

  fillCostDetailsForElectronicOrderType(electronicPrice, quantity) {
    cy.do([
      electronicUnitPriceTextField.fillIn(electronicPrice),
      quantityElectronicTextField.fillIn(quantity),
    ]);
  },

  fillCostDetailsForPhysicalOrderType(physicalPrice, quantity) {
    cy.do([
      physicalUnitPriceTextField.fillIn(physicalPrice),
      quantityPhysicalTextField.fillIn(quantity),
    ]);
  },

  verifyFieldWarningMessage() {
    cy.expect(
      quantityPhysicalLocationField
        .find(
          HTML(
            'Locations physical quantity should be empty or match with PO line physical quantity',
          ),
        )
        .exists(),
    );
    cy.expect(Pane({ id: 'pane-poLineForm' }).exists());
  },

  verifyExpenseClassRequiredFieldWarningMessage() {
    cy.get('[id="fundDistribution[0].expenseClassId"]')
      .parent()
      .parent()
      .find('[role="alert"]')
      .contains('Required!')
      .should('be.visible');
  },
};
