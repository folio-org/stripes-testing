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
  Link,
  including,
  PaneContent
} from '../../../../interactors';
import SearchHelper from '../finance/financeHelper';
import getRandomPostfix from '../../utils/stringTools';
import SelectInstanceModal from './selectInstanceModal';

const saveAndClose = Button('Save & close');
const actionsButton = Button('Actions');
const searhInputId = 'input-record-search';
const searchButton = Button('Search');
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
const quantityPhysicalTextField = TextField({ name: 'cost.quantityPhysical' });
const electronicUnitPriceTextField = TextField({ name: 'cost.listUnitPriceElectronic' });
const quantityElectronicTextField = TextField({ name: 'cost.quantityElectronic' });
const searchForm = SearchField({ id: 'input-record-search' });
const contibutor = 'Autotest,Contributor_name';
const orderLineTitle = `Autotest Tetle_${getRandomPostfix()}`;

export default {

  searchByParameter: (parameter, value) => {
    cy.do([
      searchForm.selectIndex(parameter),
      searchForm.fillIn(value),
      Button('Search').click(),
    ]);
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
        Button('Search').click(),
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
      Accordion({ id: 'POListing' })
        .find(Button('Actions'))
        .click(),
      Button('Add PO line').click()
    ]);
  },

  backToEditingOrder: () => {
    cy.do(Button({ id: 'clickable-backToPO' }).click());
  },

  deleteOrderLine: () => {
    cy.do([
      PaneHeader({ id: 'paneHeaderorder-lines-details' }).find(actionsButton).click(),
      Button('Delete').click(),
      Button({ id: 'clickable-delete-line-confirmation-confirm' }).click()
    ]);
  },

  POLineInfodorPhysicalMaterial: (orderLineTitleName) => {
    cy.do([
      TextField({ name: 'titleOrPackage' }).fillIn(orderLineTitleName),
      Select({ name: 'orderFormat' }).choose('Physical resource'),
      Button({ id: 'acquisition-method' }).click(),
      SelectionOption('Depository').click(),
      Select({ name: 'checkinItems' }).choose('Independent order and receipt quantity'),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      Select({ name: 'physical.materialType' }).choose('book'),
      Button('Add location').click(),
      Button('Location look-up').click(),
      Select({ name: 'campusId' }).choose('Online'),
      Button('Save and close').click(),
      TextField({ name: 'locations[0].quantityPhysical' }).fillIn(quantityPhysical),
      saveAndClose.click()
    ]);
  },

  fillInPOLineInfoWithFund: (fund) => {
    cy.do([
      TextField({ name: 'titleOrPackage' }).fillIn(orderLineTitle),
      Select({ name: 'orderFormat' }).choose('Physical resource'),
      Button({ id: 'acquisition-method' }).click(),
      SelectionOption('Depository').click(),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      Select({ name: 'physical.materialType' }).choose('book'),
      Button({ text: 'Add location' }).click(),
      Button({ id: 'field-locations[0].locationId' }).click(),
      SelectionOption('Main Library (KU/CC/DI/M)').click(),
      TextField({ name: 'locations[0].quantityPhysical' }).fillIn(quantityPhysical),
      Button({ id: 'fundDistribution-add-button' }).click(),
      Button({ id: 'fundDistribution[0].fundId' }).click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      TextField({ name: 'fundDistribution[0].value' }).fillIn('100'),
      saveAndClose.click()
    ]);
  },

  fillInPOLineInfoViaUi: () => {
    cy.do([
      TextField({ name: 'titleOrPackage' }).fillIn(orderLineTitle),
      Select({ name: 'orderFormat' }).choose('P/E mix'),
      Button({ id: 'acquisition-method' }).click(),
      Button({ id: 'acquisition-method' }).click(),
      SelectionOption('Depository').click(),
      Select({ name: 'checkinItems' }).choose('Independent order and receipt quantity'),
      physicalUnitPriceTextField.fillIn(physicalUnitPrice),
      quantityPhysicalTextField.fillIn(quantityPhysical),
      electronicUnitPriceTextField.fillIn(electronicUnitPrice),
      quantityElectronicTextField.fillIn(quantityElectronic),
      Select({ name: 'physical.materialType' }).choose('book'),
      Button({ text: 'Add location' }).click(),
      Button({ id: 'field-locations[0].locationId' }).click(),
      SelectionOption('Online (E)').click(),
      TextField({ name: 'locations[0].quantityPhysical' }).fillIn(quantityPhysical),
      TextField({ name: 'locations[0].quantityElectronic' }).fillIn(quantityElectronic),
    ]);
    cy.expect([
      physicalUnitPriceTextField.has({ value: physicalUnitPrice }),
      quantityPhysicalTextField.has({ value: quantityPhysical }),
      electronicUnitPriceTextField.has({ value: electronicUnitPrice }),
      quantityElectronicTextField.has({ value: quantityElectronic }),
    ]);
    cy.do(saveAndClose.click());
  },

  selectFilterMainLibraryLocationsPOL: () => {
    cy.do([
      buttonLocationFilter.click(),
      Button('Location look-up').click(),
      Select({ name: 'campusId' }).choose('City Campus'),
      Button({ id: 'locationId' }).click(),
      SelectionOption('Main Library (KU/CC/DI/M) ').click(),
      Button('Save and close').click(),
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

  selectFilterSubscriptionFromPOL: (newDate) => {
    cy.do([
      buttonSubscriptionFromFilter.click(),
      TextField('From').fillIn(newDate),
      TextField('To').fillIn(newDate),
      Button('Apply').click(),
      buttonSubscriptionFromFilter.click(),
    ]);
  },

  selectPOLInOrder: () => {
    cy.do(Accordion({ id: 'POListing' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .click());
  },

  editPOLInOrder: () => {
    cy.do([
      Pane({ id: 'order-lines-details' })
        .find(PaneHeader({ id: 'paneHeaderorder-lines-details' })
          .find(actionsButton)).click(),
      Button('Edit').click(),
    ]);
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

  openInstance:() => {
    cy.do(PaneContent({ id:'order-lines-details-content' }).find(Link({ href: including('/inventory/view/') })).click());
  },

  openReceiving:() => {
    cy.do([
      PaneHeader({ id: 'paneHeaderorder-lines-details' }).find(actionsButton).click(),
      Button('Receive').click()
    ]);
  },

  fillPolByLinkTitle:(instanceTitle) => {
    cy.do(Button('Title look-up').click());
    SelectInstanceModal.searchByName(instanceTitle);
    SelectInstanceModal.selectInstance(instanceTitle);
  },

  addAcquisitionMethod:(method) => {
    cy.do(Button({ id: 'acquisition-method' }).click());
    cy.do(SelectionOption(method).click());
  },

  addOrderFormat:(format) => {
    cy.do(Select({ name: 'orderFormat' }).choose(format));
  },

  fillPhysicalUnitPrice:(price) => {
    cy.do(physicalUnitPriceTextField.fillIn(price));
  },

  fillPhysicalUnitQuantity:(quantity) => {
    cy.do(quantityPhysicalTextField.fillIn(quantity));
  },

  addCreateInventory:(inventory) => {
    cy.do(Select('Create inventory*').choose(inventory));
  },

  addMaterialType:(type) => {
    cy.do(Select({ name:'physical.materialType' }).choose(type));
    // need to wait upload product types
    cy.wait(1000);
  },

  savePol:() => {
    cy.do(saveAndClose.click());
    cy.do(Pane({ id:'pane-poLineForm' }).absent());
  }
};

