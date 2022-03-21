import { HTML, including } from '@interactors/html';
import {
  MultiColumnList,
  MultiColumnListCell,
  Pane,
  Accordion,
  Checkbox,
  TextField,
  Button,
  SearchField,
  Select
} from '../../../../interactors';
import InventoryActions from './inventoryActions';


const effectiveLocationInput = Accordion({ id: 'effectiveLocation' });
const languageInput = Accordion({ id: 'language' });
const keywordInput = TextField({ id: 'input-inventory-search' });

export default {
  effectiveLocation: {
    mainLibrary: { id: 'clickable-filter-effectiveLocation-main-library' }
  },
  language: {
    eng: { id: 'clickable-filter-language-english' }
  },
  getAllSearchResults: () => MultiColumnList(),
  getSearchResult: (row = 0, col = 0) => MultiColumnListCell({ 'row': row, 'columnIndex': col }),

  selectResultCheckboxes(count) {
    const clickActions = [];
    for (let i = 0; i < count; i++) {
      clickActions.push(this.getSearchResult(i).find(Checkbox()).click());
    }
    return cy.do(clickActions);
  },

  selectSearchResultItem(indexRow = 0) {
    return cy.do(this.getSearchResult(indexRow, 0).click());
  },

  byEffectiveLocation(values) {
    return cy.do([
      effectiveLocationInput.clickHeader(),
      effectiveLocationInput.find(Checkbox(values ?? this.effectiveLocation.mainLibrary)).click()
    ]);
  },

  byLanguage(lang) {
    // lang: language object. Example: language.eng
    return cy.do([
      languageInput.clickHeader(),
      languageInput.find(Checkbox(lang ?? this.language.eng)).click()
    ]);
  },

  byKeywords(kw = '*') {
    return cy.do(keywordInput.fillIn(kw));
  },

  selectBrowseCallNumbers() {
    // cypress can't draw selected option without wait
    cy.wait(1000);
    cy.do(Select('Search field index').choose('Browse call numbers'));
  },

  selectBrowseSubjects() {
    // cypress can't draw selected option without wait
    cy.wait(1000);
    cy.do(Select('Search field index').choose('Browse subjects'));
  },

  browseCallNumberIsAbsent() {
    cy.expect(HTML('Browse call numbers').absent());
  },

  showsOnlyEffectiveLocation() {
    cy.expect(Accordion({ id: 'effectiveLocation' }).exists());
    cy.expect(Accordion({ id: 'language' }).absent());
    cy.expect(Accordion({ id: 'resource' }).absent());
    cy.expect(Accordion({ id: 'format' }).absent());
    cy.expect(Accordion({ id: 'mode' }).absent());
    cy.expect(Accordion({ id: 'natureOfContent' }).absent());
    cy.expect(Accordion({ id: 'staffSuppress' }).absent());
    cy.expect(Accordion({ id: 'instancesDiscoverySuppress' }).absent());
    cy.expect(Accordion({ id: 'statisticalCodeIds' }).absent());
    cy.expect(Accordion({ id: 'createdDate' }).absent());
    cy.expect(Accordion({ id: 'updatedDate' }).absent());
    cy.expect(Accordion({ id: 'source' }).absent());
    cy.expect(Accordion({ id: 'instancesTags' }).absent());
  },

  filtersIsAbsent() {
    cy.expect(Accordion({ id: 'effectiveLocation' }).absent());
    cy.expect(Accordion({ id: 'language' }).absent());
    cy.expect(Accordion({ id: 'resource' }).absent());
    cy.expect(Accordion({ id: 'format' }).absent());
    cy.expect(Accordion({ id: 'mode' }).absent());
    cy.expect(Accordion({ id: 'natureOfContent' }).absent());
    cy.expect(Accordion({ id: 'staffSuppress' }).absent());
    cy.expect(Accordion({ id: 'instancesDiscoverySuppress' }).absent());
    cy.expect(Accordion({ id: 'statisticalCodeIds' }).absent());
    cy.expect(Accordion({ id: 'createdDate' }).absent());
    cy.expect(Accordion({ id: 'updatedDate' }).absent());
    cy.expect(Accordion({ id: 'source' }).absent());
    cy.expect(Accordion({ id: 'instancesTags' }).absent());
  },

  verifyKeywordsAsDefault() {
    cy.get('#input-inventory-search-qindex').then(elem => {
      expect(elem.text()).to.include('Keyword (title, contributor, identifier)');
      expect(elem).to.be.visible;
    });
  },

  verifyCallNumberBrowseEmptyPane() {
    const callNumberBrowsePane = Pane({ title: 'Browse inventory' });
    cy.expect(callNumberBrowsePane.exists());
    cy.expect(callNumberBrowsePane.has({ subtitle: 'Enter search criteria to start browsing' }));
    cy.expect(HTML(including('Browse for results entering a query or choosing a filter.')).exists());
  },

  saveUUIDs() {
    return cy.do([
      InventoryActions.open(),
      InventoryActions.options.saveUUIDs.click()
    ]);
  },

  saveCQLQuery() {
    return cy.do([
      InventoryActions.open(),
      InventoryActions.options.saveCQLQuery.click()
    ]);
  },

  exportInstanceAsMarc() {
    return cy.do([
      InventoryActions.open(),
      InventoryActions.options.exportMARC.click()
    ]);
  },

  showSelectedRecords() {
    cy.do([
      InventoryActions.open(),
      InventoryActions.options.showSelectedRecords.click()
    ]);
  },

  getUUIDsFromRequest(req) {
    const expectedUUIDs = [];
    req.response.body.ids.forEach((elem) => { expectedUUIDs.push(elem.id); });
    return expectedUUIDs;
  },

  verifySelectedRecords(selected) {
    cy.get('#list-inventory div[data-row-index]').then((el) => {
      const overall = el.length;
      cy.expect(Pane('Inventory').is({ subtitle: `${overall} records found${selected} records selected` }));
    });
  },

  searchByParameter: (parameter, value) => {
    cy.do([
      SearchField({ id: 'input-inventory-search' }).selectIndex(parameter),
      SearchField({ id: 'input-inventory-search' }).fillIn(value),
      Button('Search').click(),
    ]);
  },
  switchToItem: () => {
    cy.do(Button({ id: 'segment-navigation-items' }).click());
  },
  switchToHoldings: () => {
    cy.do(Button({ id: 'segment-navigation-holdings' }).click());
  },

  instanceTabIsDefault() {
    cy.do(
      Button({ id: 'segment-navigation-instances' }).perform(element => {
        expect(element.classList[2]).to.include('primary');
      })
    );
  },

  browseSubjectsSearch(searchString = 'test123') {
    cy.do([
      TextField({ id: 'input-inventory-search' }).fillIn(searchString),
      Button('Browse').click()
    ]);
  },
};
