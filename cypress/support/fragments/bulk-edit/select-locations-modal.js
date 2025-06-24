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
  MultiColumnListCell,
  SelectionList,
  Selection,
} from '../../../../interactors';

const actionsButton = Button('Actions');
const selectLocationsModal = Modal('Select locations');
const closeButton = Button('Close');
const selectAffiliationButton = Button({
  id: 'undefined-affiliations-select',
});
const searchButton = Button('Search');
const resetAllButton = Button('Reset all');
const institutionAccordion = Accordion('Institution');
const campusAccordion = Accordion('Campus');
const libraryAccordion = Accordion('Library');

export default {
  scrollListOfResults(direction) {
    cy.wait(1000);
    const scrollableSelector = '#list-plugin-find-records [class^=mclScrollable-]';

    cy.get(scrollableSelector).then(($element) => {
      // Check if the element is scrollable
      const hasScrollbar = $element.get(0).scrollHeight > $element.get(0).clientHeight;

      if (hasScrollbar) {
        cy.get(scrollableSelector).scrollTo(direction);
      }
    });
  },

  verifyLocationLookupModalElementsInCentralTenant() {
    cy.expect([
      selectLocationsModal.exists(),
      selectLocationsModal.find(Pane({ title: 'Search & filter' })).exists(),
      selectLocationsModal.find(PaneHeader({ title: 'Locations' })).exists(),
      selectLocationsModal.find(Button({ icon: 'times' })).exists(),
      selectLocationsModal.find(closeButton).has({ disabled: false }),
      selectLocationsModal.find(Label('Affiliation')).exists(),
      selectLocationsModal.find(selectAffiliationButton).exists(),
      selectLocationsModal.find(TextField({ id: 'input-record-search' })).exists(),
      selectLocationsModal.find(searchButton).has({ disabled: true }),
      selectLocationsModal.find(resetAllButton).has({ disabled: true }),
      selectLocationsModal.find(institutionAccordion).has({ open: true }),
      selectLocationsModal
        .find(institutionAccordion)
        .find(MultiSelect({ id: 'institutions-filter' }))
        .exists(),
      selectLocationsModal.find(campusAccordion).has({ open: true }),
      selectLocationsModal
        .find(campusAccordion)
        .find(MultiSelect({ id: 'campuses-filter' }))
        .exists(),
      selectLocationsModal.find(libraryAccordion).has({ open: true }),
      selectLocationsModal
        .find(libraryAccordion)
        .find(MultiSelect({ id: 'libraries-filter' }))
        .exists(),
      selectLocationsModal.find(PaneHeader({ title: 'Locations' })).exists(),
      selectLocationsModal.find(PaneHeader({ subtitle: including('records found') })).exists(),
      selectLocationsModal.find(actionsButton).exists(),
      selectLocationsModal.find(MultiColumnListHeader('Name')).exists(),
      selectLocationsModal.find(MultiColumnListHeader('Code')).exists(),
    ]);

    // need to scroll to the right to verify the rest of the columns in case long location names
    this.scrollListOfResults('right');

    cy.expect([
      selectLocationsModal.find(MultiColumnListHeader('Institution')).exists(),
      selectLocationsModal.find(MultiColumnListHeader('Campus')).exists(),
      selectLocationsModal.find(MultiColumnListHeader('Library')).exists(),
      selectLocationsModal.find(MultiColumnListHeader('Location status')).exists(),
    ]);
  },

  expandSelectAffiliationAccordion() {
    cy.do(selectLocationsModal.find(selectAffiliationButton).click());
    cy.wait(1000);
  },

  verifyTenantsInAffiliationDropdown(...tenants) {
    this.expandSelectAffiliationAccordion();
    cy.then(() => {
      SelectionList({ id: 'sl-container-undefined-affiliations-select' })
        .optionList()
        .then((options) => {
          expect(options).to.deep.equal(tenants);
        });
    });
    this.expandSelectAffiliationAccordion();
  },

  selectTenantInAffiliationDropdown(tenantName) {
    cy.wait(2000);
    cy.do(
      selectLocationsModal
        .find(Selection({ value: including('Select control') }))
        .choose(tenantName),
    );
    cy.wait(1000);
  },

  selectLocation(locationName) {
    // need to scroll down if the list of locations is long
    this.scrollListOfResults('bottom');
    cy.do(selectLocationsModal.find(MultiColumnListCell({ content: locationName })).click());
  },

  verifySelectLocationModalExists(isExist = true) {
    if (isExist) {
      cy.expect(selectLocationsModal.exists());
    } else {
      cy.expect(selectLocationsModal.absent());
    }
  },
};
