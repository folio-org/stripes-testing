import { including } from '@interactors/html';
import {
  Accordion,
  Modal,
  Button,
  MultiColumnListHeader,
  TextField,
  PaneHeader,
  Pane,
  Label,
  MultiSelect,
  SelectionList,
} from '../../../../interactors';

const actionsButton = Button('Actions');
const selectLocationsModal = Modal('Select locations');
const closeButton = Button('Close');
const selectAffiliationButton = Button({ ariaLabelledby: including('affiliations-select') });
const searchButton = Button('Search');
const resetAllButton = Button('Reset all');
const institutionAccordion = Accordion('Institution');
const campusAccordion = Accordion('Campus');
const libraryAccordion = Accordion('Library');

export default {
  verifyLocationLookupModalInCentralTenant() {
    cy.expect([
      selectLocationsModal.exists(),
      selectLocationsModal.find(Pane({ title: 'Search & filter' })).exists(),
      selectLocationsModal.find(PaneHeader({ title: 'Locations' })).exists(),
      selectLocationsModal.find(Button({ icon: 'times' })).exists(),
      selectLocationsModal.find(closeButton).has({ disabled: false }),
      selectLocationsModal.find(Label('Affiliation')),

      selectLocationsModal.find(selectAffiliationButton).exists(),
      selectLocationsModal.find(TextField({ id: 'input-record-search' })),
      selectLocationsModal.find(searchButton).has({ disabled: true }),
      selectLocationsModal.find(resetAllButton).has({ disabled: true }),

      selectLocationsModal.find(institutionAccordion).has({ open: true }),
      selectLocationsModal
        .find(institutionAccordion)
        .find(MultiSelect({ id: 'institutions-filter' })),
      selectLocationsModal.find(campusAccordion).has({ open: true }),
      selectLocationsModal.find(campusAccordion).find(MultiSelect({ id: 'campuses-filter' })),
      selectLocationsModal.find(libraryAccordion).has({ open: true }),
      selectLocationsModal.find(libraryAccordion).find(MultiSelect({ id: 'libraries-filter' })),

      selectLocationsModal.find(PaneHeader({ subtitle: including('records found') })).exists(),
      selectLocationsModal.find(actionsButton).exists(),

      selectLocationsModal.find(MultiColumnListHeader('Name')).exists(),
      selectLocationsModal.find(MultiColumnListHeader('Code')).exists(),
      selectLocationsModal.find(MultiColumnListHeader('Institution')).exists(),
      selectLocationsModal.find(MultiColumnListHeader('Campus')).exists(),
      selectLocationsModal.find(MultiColumnListHeader('Library')).exists(),
      selectLocationsModal.find(MultiColumnListHeader('Location status')).exists(),
    ]);
  },

  verifyTenantsInAffiliationDropdown(...tenants) {
    cy.do(selectLocationsModal.find(selectAffiliationButton).click());
    cy.then(() => {
      SelectionList({ id: including('affiliations-select') }).optionList();
    }).then((options) => {
      expect(options).to.equal(tenants);
    });
  },
};
