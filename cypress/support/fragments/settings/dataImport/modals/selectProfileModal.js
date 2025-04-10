import {
  Button,
  HTML,
  Modal,
  MultiColumnListCell,
  TextField,
  including,
  matching,
} from '../../../../../../interactors';
import ArrayUtils from '../../../../utils/arrays';

const selectProfileModal = Modal({ header: matching(/Select (?:Action|Field Mapping) Profiles/) });

export default {
  waitLoading() {
    cy.expect(selectProfileModal.exists());
  },
  searchProfile(profileName) {
    cy.wait(1000);
    cy.do([
      selectProfileModal.find(TextField({ name: 'query' })).fillIn(profileName),
      selectProfileModal.find(Button('Search')).click(),
    ]);
    cy.expect(selectProfileModal.find(HTML(including('1 record found'))).exists());
  },
  selectProfile(profileName) {
    cy.do(
      selectProfileModal.find(MultiColumnListCell({ content: including(profileName) })).click(),
    );
    cy.expect(selectProfileModal.absent());
  },
  verifyProfilesIsSortedInAlphabeticalOrder: () => {
    const cells = [];
    cy.get('#list-plugin-find-records')
      .find('div[class^="mclRowContainer--"]')
      .find('[data-row-index]')
      .each(($row) => {
        cy.get('[class*="mclCell-"]:nth-child(1)', { withinSubject: $row })
          .invoke('text')
          .then((cellValue) => {
            cy.wait(1000);
            cells.push(cellValue);
            cy.log(cellValue);
          });
      })
      .then(() => {
        const isSorted = ArrayUtils.checkIsSortedAlphabetically({ array: cells });
        cy.expect(isSorted).to.equal(true);
      });
  },
};
