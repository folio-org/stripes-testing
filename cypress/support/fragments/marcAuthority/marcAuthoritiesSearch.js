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

  selectExcludeReferencesFilter() {
    cy.do([
      referencesFilterAccordion.clickHeader(),
      referencesFilterAccordion.find(Checkbox({ label: 'Exclude see from' })).checkIfNotSelected(),
    ]);
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

  verifyFiltersState: (selectedFilterValue, searchValue) => {
    cy.expect([
      Select({ id: 'textarea-authorities-search-qindex' }).has({ value: selectedFilterValue }),
      TextArea({ id: 'textarea-authorities-search' }).has({ value: searchValue }),
      Section({ id: 'sourceFileId' })
        .find(MultiSelect({ selectedCount: 0 }))
        .exists(),
    ]);
  },
};
