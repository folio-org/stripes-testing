import {
  Section,
  Button,
  SearchField,
  Checkbox,
  Accordion,
  MultiColumnList,
  MultiColumnListRow,
  MultiColumnListCell,
  MultiSelect,
  Select,
  TextArea,
} from '../../../../interactors';
import marcAuthorities from './marcAuthorities';
import { REFERENCES_FILTER_CHECKBOXES } from '../../constants';

const rootSection = Section({ id: 'pane-authorities-filters' });
const referencesFilterAccordion = Accordion('References');
const authorityList = MultiColumnList({ id: 'authority-result-list' });

export default {
  searchBy: (parameter, value) => {
    cy.do(
      rootSection.find(SearchField({ id: 'textarea-authorities-search' })).selectIndex(parameter),
    );
    cy.do(rootSection.find(SearchField({ id: 'textarea-authorities-search' })).fillIn(value));
    cy.do(rootSection.find(Button({ id: 'submit-authorities-search' })).click());
    marcAuthorities.waitLoading();
  },

  selectExcludeReferencesFilter(checkbox = REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM) {
    cy.then(() => referencesFilterAccordion.open()).then((isOpen) => {
      if (!isOpen) {
        cy.do(referencesFilterAccordion.clickHeader());
      }
    });
    if (checkbox === REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM) {
      cy.do([
        referencesFilterAccordion
          .find(Checkbox({ label: 'Exclude see from' }))
          .checkIfNotSelected(),
      ]);
      // need to wait until filter will be applied
      cy.wait(1000);
    }
    if (checkbox === REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO) {
      cy.do([
        referencesFilterAccordion
          .find(Checkbox({ label: 'Exclude see from also' }))
          .checkIfNotSelected(),
      ]);
      // need to wait until filter will be applied
      cy.wait(1000);
    }
  },

  unselectExcludeReferencesFilter(checkbox = REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM) {
    cy.then(() => referencesFilterAccordion.open()).then((isOpen) => {
      if (!isOpen) {
        cy.do(referencesFilterAccordion.clickHeader());
      }
    });
    if (checkbox === REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM) {
      cy.do([
        referencesFilterAccordion.find(Checkbox({ label: 'Exclude see from' })).uncheckIfSelected(),
      ]);
      // need to wait until filter will be applied
      cy.wait(1000);
    }
    if (checkbox === REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO) {
      cy.do([
        referencesFilterAccordion
          .find(Checkbox({ label: 'Exclude see from also' }))
          .uncheckIfSelected(),
      ]);
      // need to wait until filter will be applied
      cy.wait(1000);
    }
  },

  selectAuthorityByIndex(rowIndex) {
    cy.do([
      authorityList
        .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .find(Button())
        .click(),
    ]);
  },

  verifyFiltersState: (selectedFilterValue, searchValue, toggle) => {
    if (toggle === 'Search') {
      cy.expect([
        Button({ id: 'segment-navigation-search' }).has({ disabled: false, visible: true }),
        Button({ id: 'segment-navigation-browse' }).has({ disabled: false }),
      ]);
    }
    if (toggle === 'Browse') {
      cy.expect([
        Button({ id: 'segment-navigation-search' }).has({ disabled: false }),
        Button({ id: 'segment-navigation-browse' }).has({ disabled: false, visible: true }),
      ]);
    }
    cy.get('#textarea-authorities-search-qindex').then((elem) => {
      expect(elem.text()).to.include('Personal name');
    });
    cy.expect([
      Select({ id: 'textarea-authorities-search-qindex' }).has({ value: selectedFilterValue }),
      TextArea({ id: 'textarea-authorities-search' }).has({ value: searchValue }),
      Section({ id: 'sourceFileId' })
        .find(MultiSelect({ selectedCount: 0 }))
        .exists(),
    ]);
  },
};
