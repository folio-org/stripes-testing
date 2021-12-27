import { Accordion, Button, Modal, Section, RadioButton, ListItem, HTML, including, Pane } from '../../../../interactors';
import eHoldingsResourceView from './eHoldingsResourceView';

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

  filterPackages: (selectionStatus = filterPackagesStatuses.notSelected) => {
    const selectionStatusAccordion = packageFilterModal.find(Accordion({ id: 'filter-packages-selected' }));
    cy.do(packagesSection.find(Button({ icon: 'search' })).click());
    cy.expect(packageFilterModal.exists());
    cy.do(selectionStatusAccordion
      .find(RadioButton(selectionStatus)).click());
    cy.do(packageFilterModal.find(Button('Search')).click());
    cy.expect(packageFilterModal.absent());
  },
  waitPackagesLoading: () => {
    cy.expect(packagesSection
      .find(ListItem({ index: 0 })
        .find(Button())).exists());
  },
  openResource:(packageNumber = 0) => {
    cy.then(() => packagesSection
      .find(ListItem({ index: packageNumber })).h4Value())
      .then(packageName => {
        cy.then(() => Pane().title())
          .then(titleName => {
            cy.do(packagesSection
              .find(ListItem({ index: packageNumber })
                .find(Button())).click())
              .then(() => {
                cy.intercept('/eholdings/resources**').as('getResource');
                cy.wait('@getResource').then((req) => {
                  cy.log(JSON.stringify(req.response?.body));
                });

              // return req?.response?.body?.attributes?.customCoverages.length;
              });


            eHoldingsResourceView.waitLoading();
            eHoldingsResourceView.checkNames(packageName, titleName);
          });
      });
  },
  checkPackagesSelectionStatus: (expectedSelectionStatus) => {
    for (const status in filterPackagesStatuses) {
      if (filterPackagesStatuses[status] !== expectedSelectionStatus) {
        cy.expect(packagesSection.find(HTML(including(filterPackagesStatuses[status]))).absent());
      }
    }
  }
};
