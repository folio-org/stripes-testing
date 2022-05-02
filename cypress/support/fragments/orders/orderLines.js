import { Button, SearchField, PaneHeader, Pane, Select, Accordion, KeyValue, Checkbox, MultiColumnList, MultiColumnListCell, MultiColumnListRow, Modal, TextField, SelectionOption, SelectionList } from '../../../../interactors';
import SearchHelper from '../finance/financeHelper';
import getRandomPostfix from '../../utils/stringTools';



const searhInputId = 'input-record-search';
const searchButton = Button('Search');
const saveAndClose = Button('Save & close');
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

export default {

  searchByParameter: (parameter, value) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex(parameter),
      SearchField({ id: 'input-record-search' }).fillIn(value),
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

  createPOLineViaActions: () => {
    cy.do([
      Accordion({ id: 'POListing' })
        .find(Button('Actions'))
        .click(),
      Button('Add PO line').click()
    ]);
  },
  fillInPOLineInfoViaUi: () => {
    cy.do([
      TextField({ name: 'titleOrPackage' }).fillIn(`Autotest Tetle_${getRandomPostfix()}`),
      Select({ name: 'orderFormat' }).choose('P/E mix'),
      Button({ id: 'acquisition-method' }).click(),
      Button({ id: 'acquisition-method' }).click(),
      SelectionOption('Depository').click(),
      Select({ name: 'checkinItems' }).choose('Independent order and receipt quantity'),
      TextField({ name: 'cost.listUnitPrice' }).fillIn(physicalUnitPrice),
      TextField({ name: 'cost.quantityPhysical' }).fillIn(quantityPhysical),
      TextField({ name: 'cost.listUnitPriceElectronic' }).fillIn(electronicUnitPrice),
      TextField({ name: 'cost.quantityElectronic' }).fillIn(quantityElectronic),
      Select({ name: 'physical.materialType' }).choose('book'),
      Button('Add location').click(),
      Button('Location look-up').click(),
      Select({ name: 'campusId' }).choose('Online'),
      Button('Save and close').click(),
      TextField({ name: 'locations[0].quantityPhysical' }).fillIn(quantityPhysical),
      TextField({ name: 'locations[0].quantityElectronic' }).fillIn(quantityElectronic),
    ]);
    cy.expect([
      TextField({ name: 'cost.listUnitPrice' }).has({ value: physicalUnitPrice }),
      TextField({ name: 'cost.quantityPhysical' }).has({ value: quantityPhysical }),
      TextField({ name: 'cost.listUnitPriceElectronic' }).has({ value: electronicUnitPrice }),
      TextField({ name: 'cost.quantityElectronic' }).has({ value: quantityElectronic }),
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
};

