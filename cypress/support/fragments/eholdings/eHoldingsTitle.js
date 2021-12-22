import { Accordion, Button, Modal, Section, RadioButton, including } from '../../../../interactors';

const packagesSection = Section({ id: 'titleShowPackages' });
const packageFilterModal = Modal({ id : 'package-filter-modal' });

const filterPackagesStatuses = { all: 'All',
  selected: 'Selected',
  notSelected: 'Not selected' };

export default {
  waitLoading: (specialTitle) => {
    cy.expect(Section({ id : specialTitle.replaceAll(' ', '-').toLowerCase() }).exists());
  },

  filterPackagesStatuses,

  filterPackages: (selectionStatus) => {
    const selectionStatusAccordion = packageFilterModal.find(Accordion({ id: 'filter-packages-selected' }));
    cy.do(packagesSection.find(Button({ icon: 'search' })).click());
    cy.expect(packageFilterModal.exists());
    cy.do(selectionStatusAccordion
      .find(RadioButton(selectionStatus ?? filterPackagesStatuses.notSelected)).click());
    cy.do(packageFilterModal.find(Button('Search')).click());
    cy.expect(packageFilterModal.absent());
  }
};
