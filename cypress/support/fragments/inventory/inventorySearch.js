import { MultiColumnList, MultiColumnListCell, Pane, Accordion, Checkbox, TextField } from '../../../../interactors';
import InventoryActions from './InventoryInstances';


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
  getSearchResult: (row, col) => MultiColumnListCell({ 'row': row ?? 0, 'columnIndex': col ?? 0 }),

  selectResultCheckboxes(count) {
    const clickActions = [];
    for (let i = 0; i < count; i++) {
      clickActions.push(this.getSearchResult(i).find(Checkbox()).click());
    }
    return cy.do(clickActions);
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

  byKeywords(kw) {
    return cy.do(keywordInput.fillIn(kw ?? '*'));
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

  getUUIDsFromRequest(req) {
    const expectedUUIDs = [];
    req.response.body.ids.forEach((elem) => { expectedUUIDs.push(elem.id); });
    return expectedUUIDs;
  },

  verifySelectedRecords(selected) {
    cy.get('div[data-row-index]').then((el) => {
      const overall = el.length;
      cy.expect(Pane('Inventory').is({ subtitle: `${overall} records found${selected} records selected` }));
    });
  },
};
