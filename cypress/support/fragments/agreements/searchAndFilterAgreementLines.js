import { Accordion, Button, Pane, TextField } from '../../../../interactors';
import { COMMON_BUTTON_LABELS, DEFAULT_WAIT_TIME } from '../../constants';
import SelectAgreementModal from '../eholdings/modals/selectAgreementModal';
import FIltersPaneHelper from '../filtersPane';

const filtersPane = Pane({ id: 'agreements-tab-filter-pane' });
const agreementFilterSection = Accordion({ id: 'filter-accordion-agreement' });
const agreementLineTypeFilterSection = Accordion({ id: 'filter-accordion-lineType' });
const activeFromFilterSection = Accordion({ id: 'clickable-activeFrom-filter' });
const activeToFilterSection = Accordion({ id: 'clickable-activeTo-filter' });
const POLineFilterSection = Accordion({ id: 'filter-accordion-po-lines' });
const tagsFilterSection = Accordion({ id: 'clickable-tags-filter' });
const searchInput = filtersPane.find(TextField({ id: 'input-agreementLine-search' }));
const searchButton = filtersPane.find(Button(COMMON_BUTTON_LABELS.SEARCH));
const selectAgreementLookupTrigger = filtersPane.find(Button('Select agreement'));

export default {
  search(name) {
    cy.do([cy.do(searchInput.fillIn(name)), cy.do(searchButton.click())]);
  },

  verifyFilterOptions() {
    cy.expect([
      agreementFilterSection.exists(),
      agreementLineTypeFilterSection.exists(),
      activeFromFilterSection.exists(),
      activeToFilterSection.exists(),
      POLineFilterSection.exists(),
      tagsFilterSection.exists(),
    ]);
  },

  clearAllFilters() {
    FIltersPaneHelper.clearAllFilters(filtersPane);
  },

  filterByAgreement(agreement) {
    cy.expect(selectAgreementLookupTrigger.exists());
    cy.do(selectAgreementLookupTrigger.click());

    SelectAgreementModal.searchByName(agreement);
    cy.wait(DEFAULT_WAIT_TIME);
    SelectAgreementModal.selectAgreement();
  },
};
