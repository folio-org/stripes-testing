import {
  Button,
  SearchField,
  PaneHeader,
  Select,
  Accordion,
  Checkbox,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Modal,
  TextField,
  SelectionOption,
  Pane,
  PaneContent,
  Link,
  including,
  Section,
  KeyValue,
  Card
} from '../../../../interactors';
import SearchHelper from '../finance/financeHelper';
import getRandomPostfix from '../../utils/stringTools';
import SelectInstanceModal from './selectInstanceModal';
import { ORDER_FORMAT_NAMES, ACQUISITION_METHOD_NAMES, RECEIVING_WORKFLOW_NAMES, MATERIAL_TYPE_NAMES } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';

const path = require('path');

const receivedtitleDetails = PaneContent({ id: 'receiving-results-pane-content' });
const saveAndClose = Button('Save & close');
const actionsButton = Button('Actions');
const searhInputId = 'input-record-search';
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
const funddetailsSection = Section({ id: 'FundDistribution' });
const quantityPhysicalTextField = TextField({ name: 'cost.quantityPhysical' });
const electronicUnitPriceTextField = TextField({ name: 'cost.listUnitPriceElectronic' });
const quantityElectronicTextField = TextField({ name: 'cost.quantityElectronic' });
const searchForm = SearchField({ id: 'input-record-search' });
const contibutor = 'Autotest,Contributor_name';
const orderLineTitle = `Autotest Tetle_${getRandomPostfix()}`;
const orderLineTitleField = TextField({ name: 'titleOrPackage' });
const orderFormatSelect = Select({ name: 'orderFormat' });
const acquisitionMethodButton = Button({ id: 'acquisition-method' });
const receivingWorkflowSelect = Select({ name: 'checkinItems' });
const materialTypeSelect = Select({ name: 'physical.materialType' });
const addLocationButton = Button({ text: 'Add location' });
const locationSelect = Button({ id: 'field-locations[0].locationId' });
const onlineLocationOption = SelectionOption('Online (E)');
const quantityPhysicalLocationField = TextField({ name: 'locations[0].quantityPhysical' });
const addFundDistributionButton = Button({ id: 'fundDistribution-add-button' });
const fundDistributionSelect = Button({ id: 'fundDistribution[0].fundId' });
const fundDistributionField = TextField({ name: 'fundDistribution[0].value' });
const orderLineInfoPage = Section({ id: 'order-lines-details' });
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
const selectPermanentLocationModal = Modal('Select permanent location');
const noteTitle = `Autotest Title_${getRandomPostfix()}`;
const orderHistorySection = Section({ id: 'versions-history-pane-order-line' });
const agreementLinesSection = Section({ id: 'relatedAgreementLines' });
const invoiceLinesSection = Section({ id: 'relatedInvoiceLines' });
const notesSection = Section({ id: 'notes' });
const submitOrderLine = () => {
  const submitButton = Button('Submit');
  cy.get('body').then($body => {
    if ($body.find('[id=line-is-not-unique-confirmation]').length) {
      cy.wait(4000);
      cy.do(Modal({ id: 'line-is-not-unique-confirmation' }).find(submitButton).click());
    } else {
      // do nothing if modal is not displayed
    }
  });
};

export default {
  submitOrderLine,
  searchByParameter: (parameter, value) => {
    cy.do([
      searchForm.selectIndex(parameter),
      searchForm.fillIn(value),
      searchButton.click(),
    ]);
  },

  clickOnOrderLines: () => {
    cy.do([
      orderLineButton.click(),
    ]);
  },
  waitLoading() {
    cy.expect([
      Pane({ id: 'order-lines-filters-pane' }).exists(),
      Pane({ id: 'order-lines-results-pane' }).exists(),
    ]);
  },

  selectFund: (FundName) => {
    cy.do(funddetailsSection.find(Link(FundName)).click());
  },

  resetFilters: () => {
    cy.do(Button('Reset all').click());
  },

  checkOrderlineSearchResults: (orderLineNumber) => {
    cy.expect(MultiColumnList({ id: 'order-line-list' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: orderLineNumber }));
  },

  checkCreatedPOLinePhysicalResource: (orderLineTitleName, fund) => {
    cy.expect([
      orderLineInfoPage.exists(),
      itemDetailsSection.find(KeyValue({ value: orderLineTitleName })).exists(),
      poLineInfoSection.find(KeyValue({ value: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE_Check })).exists(),
      fundDistributionSection
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: `${fund.name}(${fund.code})` }),
      locationSection.find(KeyValue({ value: quantityPhysical })).exists(),
    ]);
  },

  checkCreatedPOLineOtherResource: (orderLineTitleName, fund) => {
    cy.expect([
      orderLineInfoPage.exists(),
      itemDetailsSection.find(KeyValue({ value: orderLineTitleName })).exists(),
      poLineInfoSection.find(KeyValue({ value: ORDER_FORMAT_NAMES.OTHER })).exists(),
      fundDistributionSection
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: `${fund.name}(${fund.code})` }),
    ]);
  },

  checkCreatedPOLineElectronicResource: (orderLineTitleName, fund) => {
    cy.expect([
      orderLineInfoPage.exists(),
      itemDetailsSection.find(KeyValue({ value: orderLineTitleName })).exists(),
      poLineInfoSection.find(KeyValue({ value: ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE_Check })).exists(),
      fundDistributionSection
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: `${fund.name}(${fund.code})` }),
      locationSection.find(KeyValue({ value: quantityElectronic })).exists(),
    ]);
  },

  closeThirdPane: () => {
    cy.do(PaneHeader({ id: 'paneHeaderorder-details' }).find(Button({ icon: 'times' })).click());
  },

  getSearchParamsMap(orderNumber, currentDate) {
    const searchParamsMap = new Map();
    // 'date opened' parameter verified separately due to different condition
    searchParamsMap.set('PO number', orderNumber)
      .set('Keyword', orderNumber)
      .set('Date created', currentDate);
    return searchParamsMap;
  },
  checkPoSearch(searchParamsMap, orderNumber) {
    for (const [key, value] of searchParamsMap.entries()) {
      cy.do([
        searchField.selectIndex(key),
        searchField.fillIn(value),
        searchButton.click(),
      ]);
      // verify that first row in the result list contains related order line title
      this.checkSearchResults(orderNumber);
      this.resetFilters();
      // TODO: remove waiter - currenty it's a workaround for incorrect selection from search list
      cy.wait(1000);
    }
  },

  addPOLine: () => {
    cy.do([
      polListingAccordion.find(actionsButton).click(),
      Button('Add PO line').click()
    ]);
  },

  backToEditingOrder: () => {
    cy.do(Button({ id: 'clickable-backToPO' }).click());
    cy.wait(4000);
  },

  openVersionHistory() {
    cy.do(Section({ id: 'order-lines-details' }).find(Button({ icon: 'clock' })).click());
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
      orderHistorySection.find(Card({ headerStart: date })).find(Button({ icon: 'clock' })).click(),
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
      Button({ id: 'clickable-delete-line-confirmation-confirm' }).click()
    ]);
  },

  POLineInfodorPhysicalMaterial: (orderLineTitleName) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityPhysicalLocationField.fillIn(quantityPhysical),
      saveAndClose.click()
    ]);
  },

  POLineInfodorPhysicalMaterialForRecieve: (orderLineTitleName) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn('1'),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityPhysicalLocationField.fillIn('1'),
      saveAndClose.click()
    ]);
  },
  POLineInfodorPhysicalMaterialWithLocation: (orderLineTitleName, institutionId) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      Button('Location look-up').click(),
    ]);
    cy.get('form[id=location-form] select[name=institutionId]').select(institutionId);
    cy.do([
      selectPermanentLocationModal.find(saveButton).click(),
      quantityPhysicalLocationField.fillIn(quantityPhysical),
      saveAndClose.click()
    ]);
  },

  POLineInfodorPhysicalMaterialWithFund: (orderLineTitleName, fund) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      fundDistributionField.fillIn('100'),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityPhysicalLocationField.fillIn(quantityPhysical),
      saveAndClose.click()
    ]);
  },

  POLineInfodorOtherMaterialWithFund: (orderLineTitleName, fund) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.OTHER),
      acquisitionMethodButton.click(),
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      fundDistributionField.fillIn('100'),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityPhysicalLocationField.fillIn(quantityPhysical),
      saveAndClose.click()
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
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.get('form[id=location-form] select[name=institutionId]').select(institutionId);
    cy.do([
      selectPermanentLocationModal.find(saveButton).click(),
      quantityPhysicalLocationField.fillIn(quantity),
      saveAndClose.click()
    ]);
    cy.wait(4000);
    submitOrderLine();
  },

  editFundInPOL(fund, unitPrice, value) {
    cy.do([
      physicalUnitPriceTextField.fillIn(unitPrice),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      fundDistributionField.fillIn(value),
      saveAndClose.click()
    ]);
    cy.wait(6000);
    submitOrderLine();
  },

  selectOrderline: (POlinenumber) => {
    cy.do(Pane({ id: 'order-lines-results-pane' }).find(Link(POlinenumber)).click());
  },
  selectreceivedTitleName: (title) => {
    cy.do(receivedtitleDetails.find((Link(title))).click());
  },

  addFundToPOL(fund, value) {
    cy.do([
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      saveAndClose.click()
    ]);
    cy.wait(6000);
    submitOrderLine();
  },

  rolloverPOLineInfoforElectronicResourceWithFund: (orderLineTitleName, fund, unitPrice, quantity, value) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE),
      acquisitionMethodButton.click(),
      SelectionOption(ORDER_FORMAT_NAMES.OTHER).click(),
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY),
      electronicUnitPriceTextField.fillIn(unitPrice),
      quantityElectronicTextField.fillIn(quantity),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      Section({ id: 'fundDistributionAccordion' }).find(Button('$')).click(),
      fundDistributionField.fillIn(value),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityElectronicField.fillIn(quantity),
      saveAndClose.click()
    ]);
  },

  POLineInfoforElectronicResource: (orderLineTitleName, fund) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitleName),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE),
      acquisitionMethodButton.click(),
      SelectionOption(ORDER_FORMAT_NAMES.OTHER).click(),
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY),
      electronicUnitPriceTextField.fillIn(electronicUnitPrice),
      quantityElectronicTextField.fillIn(quantityElectronic),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      fundDistributionField.fillIn('100'),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityElectronicField.fillIn(quantityElectronic),
      saveAndClose.click()
    ]);
  },

  fillInPOLineInfoWithFund: (fund) => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitle),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
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
      fundDistributionField.fillIn('100'),
      saveAndClose.click()
    ]);
  },

  fillPolWithEuroCurrency(fund, unitPrice, quantity, institutionId) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
    ]);
    cy.wait(2000);
    cy.do([
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      Button({ id: 'currency' }).click(),
      SelectionOption('Euro (EUR)').click(),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      fundDistributionField.fillIn('100'),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.get('form[id=location-form] select[name=institutionId]').select(institutionId);
    cy.do([
      selectPermanentLocationModal.find(saveButton).click(),
      quantityPhysicalLocationField.fillIn(quantity),
      saveAndClose.click()
    ]);
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
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY),
      physicalUnitPriceTextField.fillIn(unitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      Button({ id: 'currency' }).click(),
      SelectionOption('Polish Zloty (PLN)').click(),
      addFundDistributionButton.click(),
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      fundDistributionField.fillIn('100'),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.get('form[id=location-form] select[name=institutionId]').select(institutionId);
    cy.do([
      selectPermanentLocationModal.find(saveButton).click(),
      quantityPhysicalLocationField.fillIn(quantity),
      saveAndClose.click()
    ]);
    cy.wait(4000);
    submitOrderLine();
  },

  fillInPOLineInfoViaUi: () => {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitle),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PE_MIX),
      acquisitionMethodButton.click(),
      acquisitionMethodButton.click(),
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY),
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
    cy.do(saveAndClose.click());
  },

  fillInPOLineInfoForExport(accountNumber, AUMethod) {
    cy.do([
      orderLineTitleField.fillIn(orderLineTitle),
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PE_MIX),
      acquisitionMethodButton.click(),
      acquisitionMethodButton.click(),
      SelectionOption(AUMethod).click(),
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY),
      Select({ name: 'vendorDetail.vendorAccount' }).choose(accountNumber),
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
    cy.do(saveAndClose.click());
  },

  fillInPOLineInfoForExportWithLocation(accountNumber, AUMethod, institutionId) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE),
      acquisitionMethodButton.click(),
      acquisitionMethodButton.click(),
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
    cy.get('form[id=location-form] select[name=institutionId]').select(institutionId);
    cy.do([
      selectPermanentLocationModal.find(saveButton).click(),
      quantityElectronicField.fillIn(quantityElectronic),
    ]);
    cy.expect([
      electronicUnitPriceTextField.has({ value: electronicUnitPrice }),
      quantityElectronicTextField.has({ value: quantityElectronic }),
    ]);
    cy.do(saveAndClose.click());
    // If purchase order line will be dublicate, Modal with button 'Submit' will be activated
    cy.wait(2000);
    submitOrderLine();
  },

  fillInPOLineInfoForExportWithLocationForPhysicalResource(accountNumber, AUMethod, institutionName, quantity) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE),
      acquisitionMethodButton.click(),
      acquisitionMethodButton.click(),
      SelectionOption(AUMethod).click(),
      Select({ name: 'vendorDetail.vendorAccount' }).choose(accountNumber),
    ]);
    cy.do([
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.get('form[id=location-form] select[name=institutionId]').select(institutionName);
    cy.do([
      selectPermanentLocationModal.find(saveButton).click(),
      quantityPhysicalLocationField.fillIn(quantity),
    ]);
    cy.expect([
      physicalUnitPriceTextField.has({ value: physicalUnitPrice }),
      quantityPhysicalLocationField.has({ value: quantity }),
    ]);
    cy.do(saveAndClose.click());
    // If purchase order line will be dublicate, Modal with button 'Submit' will be activated
    cy.wait(2000);
    submitOrderLine();
  },

  fillInPOLineInfoWithLocationForPEMIXResource(accountNumber, AUMethod, institutionName, quantity) {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.PE_MIX),
      acquisitionMethodButton.click(),
      acquisitionMethodButton.click(),
      SelectionOption(AUMethod).click(),
      Select({ name: 'vendorDetail.vendorAccount' }).choose(accountNumber),
    ]);
    cy.do([
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantity),
      electronicUnitPriceTextField.fillIn(electronicUnitPrice),
      quantityElectronicTextField.fillIn(quantity),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      Select({ name: 'eresource.materialType' }).choose(MATERIAL_TYPE_NAMES.DVD),
      addLocationButton.click(),
      createNewLocationButton.click(),
    ]);
    cy.get('form[id=location-form] select[name=institutionId]').select(institutionName);
    cy.do([
      selectPermanentLocationModal.find(saveButton).click(),
      quantityPhysicalLocationField.fillIn(quantity),
      quantityElectronicField.fillIn(quantity),
      physicalResourceDetailsAccordion.find(Select({ name: 'physical.createInventory' })).choose('Instance, holdings, item'),
      eResourcesDetails.find(Select({ name: 'eresource.createInventory' })).choose('Instance, holdings'),
      saveAndClose.click()
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
      Modal('Select Organization').find(SearchField({ id: searhInputId })).fillIn(invoice.vendorName),
      searchButton.click(),
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

  selectPOLInOrder: (indexNumber) => {
    cy.do(polListingAccordion
      .find(MultiColumnListRow({ index: indexNumber }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .click());
  },

  editPOLInOrder: () => {
    cy.do([orderLineDetailsPane.find(paneHeaderOrderLinesDetailes.find(actionsButton)).click(),
    Button('Edit').click()
    ]);
  },

  deleteFundInPOL() {
    cy.do([
      Section({ id: 'fundDistributionAccordion' }).find(Button({ icon: 'trash' })).click(),
      saveAndClose.click()
    ]);
    cy.wait(6000);
    submitOrderLine();
  },

  addContributorToPOL: () => {
    cy.do([
      Button('Add contributor').click(),
      TextField('Contributor*').fillIn(contibutor),
      Select('Contributor type*').choose('Personal name')
    ]);
  },

  saveOrderLine: () => {
    cy.do(Button({ id: 'clickable-updatePoLine' }).click());
  },

  openInstance: () => {
    cy.do(Section({ id: 'ItemDetails' }).find(Link({ href: including('/inventory/view/') })).click());
  },

  openReceiving: () => {
    cy.do([
      paneHeaderOrderLinesDetailes.find(actionsButton).click(),
      Button('Receive').click()
    ]);
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

  savePol: () => {
    cy.do(saveAndClose.click());
    cy.do(Pane({ id: 'pane-poLineForm' }).absent());
  },

  fillPOLWithTitleLookUp: () => {
    cy.do([
      orderFormatSelect.choose(ORDER_FORMAT_NAMES.OTHER),
      acquisitionMethodButton.click(),
      SelectionOption(ACQUISITION_METHOD_NAMES.DEPOSITORY).click(),
      receivingWorkflowSelect.choose(RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      materialTypeSelect.choose(MATERIAL_TYPE_NAMES.BOOK),
      addLocationButton.click(),
      locationSelect.click(),
      onlineLocationOption.click(),
      quantityPhysicalLocationField.fillIn(quantityPhysical),
      saveAndClose.click()
    ]);
  },

  selectRandomInstanceInTitleLookUP: (instanceName, rowNumber = 0) => {
    cy.do([
      Button({ id: 'find-instance-trigger' }).click(),
      selectInstanceModal.find(TextField({ name: 'query' })).fillIn(instanceName),
      selectInstanceModal.find(searchButton).click(),
      selectInstanceModal.find(MultiColumnListRow({ index: rowNumber })).click()
    ]);
    // Need to wait,while entering data loading on page
    cy.wait(2000);
  },

  checkConnectedInstance: () => {
    cy.expect(Section({ id: 'itemDetails' }).find(Link('Connected')).exists());
  },

  fillInInvalidDataForPublicationDate: () => {
    cy.do(TextField({ text: 'Publication date' }).fillIn('Invalid date'));
  },

  clickNotConnectionInfoButton: () => {
    cy.do(Section({ id: 'itemDetails' }).find(Button({ icon: 'info' })).click());
  },

  selectCurrentEncumbrance: (currentEncumbrance) => {
    cy.do(fundDistributionSection.find(Link(currentEncumbrance)).click());
  },

  cancelPOL: () => {
    cy.do([
      orderLineDetailsPane
        .find(paneHeaderOrderLinesDetailes
          .find(actionsButton)).click(),
      Button('Cancel').click(),
      Button('Cancel order line').click()
    ]);
  },

  changeFundInPOL: (fund) => {
    cy.do([
      fundDistributionSelect.click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      saveAndClose.click()
    ]);
  },

  checkFundInPOL: (fund) => {
    cy.expect(fundDistributionSection.find(Link(`${fund.name}(${fund.code})`)).exists());
  },

  checkCurrencyInPOL: () => {
    cy.get('[id=FundDistribution]').contains('a', '$').should('exist');
  },

  checkDownloadedFile() {
    cy.wait(10000);
    // Get the path to the Downloads folder
    const downloadsFolder = Cypress.config('downloadsFolder') || Cypress.env('downloadsFolder') || 'Downloads';

    // Find the most recently downloaded file
    cy.task('findFiles', `${downloadsFolder}/*.csv`, {
      sortBy: 'modified',
      sortOrder: 'desc',
      recursive: true,
      timeout: 15000
    }).then((files) => {
      if (files.length === 0) {
        throw new Error(`No files found in ${downloadsFolder}`);
      }
      const fileName = path.basename(files[0]);
      const filePath = `${downloadsFolder}\\${fileName}`;
      cy.readFile(filePath).then(fileContent => {
        const fileRows = fileContent.split('\n');
        expect(fileRows[0].trim()).to.equal('"PO number prefix","PO number","PO number suffix","Vendor","Organization type","Order type","Acquisitions units","Approval date","Assigned to","Bill to","Ship to","Manual","Re-encumber","Created by","Created on","Note","Workflow status","Approved","Renewal interval","Subscription","Manual renewal","Ongoing notes","Review period","Renewal date","Review date","PO tags","POLine number","Title","Instance UUID","Subscription from","Subscription to","Subscription interval","Receiving note","Publisher","Edition","Linked package","Contributor, Contributor type","Product ID, Qualifier, Product ID type","Internal note","Acquisition method","Order format","Created on (PO Line)","Receipt date","Receipt status","Payment status","Source","Donor","Selector","Requester","Cancellation restriction","Cancellation description","Rush","Collection","Line description","Vendor reference number, reference type","Instructions to vendor","Account number","Physical unit price","Quantity physical","Electronic unit price","Quantity electronic","Discount","Estimated price","Currency","Fund code, Expense class, Value, Amount","Location, Quantity P, Quantity E","Material supplier","Receipt due","Expected receipt date","Volumes","Create inventory","Material type","Access provider","Activation status","Activation due","Create inventory E","Material type E","Trial","Expected activation","User limit","URL","POLine tags","Renewal note"');
      });
    });
  },

  deleteAllDownloadedFiles() {
    cy.exec('del cypress\\downloads\\*.csv', { failOnNonZeroExit: false });
  },

  checkCreateInventory() {
    cy.expect([
      physicalResourceDetailsAccordion.find(KeyValue({ value: 'Instance, Holding, Item' })).exists(),
      eResourcesDetails.find(KeyValue({ value: 'Instance, Holding, Item' })).exists()
    ]);
  },

  openLinkedInstance() {
    cy.do(Accordion('Linked instance').clickHeader());
    cy.do(Accordion('Linked instance')
      .find(Link({ href: including('/inventory/view') }))
      .click());
  },

  getAssignedPOLNumber: () => cy.then(() => Accordion('Purchase order line').find(KeyValue('POL number')).value()),

  verifyPOLDetailsIsOpened: () => {
    cy.expect(orderLineDetailsPane
      .find(paneHeaderOrderLinesDetailes)
      .exists());
  },

  verifyOrderTitle(title) {
    cy.expect(KeyValue('Title').has({ value: title }));
  },

  addNewNote() {
    cy.do([
      Section({ id: 'notes' }).find(Button({ id: 'note-create-button' })).click(),
      TextField({ name: 'title' }).fillIn(noteTitle),
      saveAndClose.click()
    ]);
    cy.wait(4000);
  },

  receiveOrderLineViaActions() {
    cy.do([PaneHeader({ id: 'paneHeaderorder-lines-details' })
      .find(actionsButton).click(),
    Button('Receive').click(),
    ]);
  },

  checkCreatedInventoryInPhysicalRecourceDetails: (value) => {
    cy.expect(Accordion('Physical resource details')
      .find(KeyValue('Create inventory')).has({ value }));
  },

  checkCreatedInventoryInElectronicRecourceDetails: (value) => {
    cy.expect(Accordion('E-resources details')
      .find(KeyValue('Create inventory')).has({ value }));
  },

  checkCreatedInventoryInOtherRecourceDetails: (value) => {
    cy.expect(Accordion('Other resource details')
      .find(KeyValue('Create inventory')).has({ value }));
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
      Accordion('Cost details').find(KeyValue('Quantity physical')).has({ value: orderData.quantityPhysical }),
      KeyValue('Currency').has({ value: orderData.currency }),
      KeyValue('Material supplier').has({ value: orderData.materialSupplier }),
      KeyValue('Create inventory').has({ value: orderData.createInventory }),
      KeyValue('Material type').has({ value: orderData.materialType })
    ]);
    cy.expect(MultiColumnList({ id: 'list-item-contributors' })
      .find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: orderData.contributor }));
    cy.expect(MultiColumnList({ id: 'list-item-contributors' })
      .find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ columnIndex: 1 }))
      .has({ content: orderData.contributorType }));
    cy.expect(MultiColumnList({ id: 'list-product-ids' })
      .find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: orderData.productId }));
    cy.expect(MultiColumnList({ id: 'list-product-ids' })
      .find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ columnIndex: 2 }))
      .has({ content: orderData.productIDType }));
    cy.expect(MultiColumnList({ id: 'list-item-reference-numbers' })
      .find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: orderData.vendorReferenceNumber }));
    cy.expect(MultiColumnList({ id: 'list-item-reference-numbers' })
      .find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ columnIndex: 1 }))
      .has({ content: orderData.vendorReferenceType }));
    cy.expect([
      KeyValue('Name (code)').has({ value: orderData.locationName }),
      Pane({ id: 'order-lines-details' }).find(Accordion('Location'))
        .find(KeyValue('Quantity physical'))
        .has({ value: orderData.locationQuantityPhysical })
    ]);
    cy.expect(fundDistributionAccordion
      .find(MultiColumnList())
      .find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: orderData.fund }));
    cy.expect(fundDistributionAccordion
      .find(MultiColumnList())
      .find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ columnIndex: 2 }))
      .has({ content: orderData.value }));
  },

  checkFundAndExpenseClassPopulated(fundInformation) {
    cy.expect(fundDistributionAccordion
      .find(MultiColumnList())
      .find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: fundInformation.fund }));
    cy.expect(fundDistributionAccordion
      .find(MultiColumnList())
      .find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ columnIndex: 1 }))
      .has({ content: fundInformation.expenseClass }));
    cy.expect(fundDistributionAccordion
      .find(MultiColumnList())
      .find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ columnIndex: 2 }))
      .has({ content: fundInformation.value }));
    cy.expect(fundDistributionAccordion
      .find(MultiColumnList())
      .find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ columnIndex: 3 }))
      .has({ content: fundInformation.amount }));
  },

  checkErrorToastMessage: (message) => {
    cy.wait(4000);
    InteractorsTools.checkCalloutErrorMessage(message);
  },
};
