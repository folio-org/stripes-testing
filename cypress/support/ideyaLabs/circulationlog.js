import {
  Button,
  Link,
  MultiColumnListRow,
  PaneContent,
  Section,
  TextField,
} from '../../../interactors';
import usersSearchPane from '../fragments/users/usersSearchPane';

const userSearchPaneContent = PaneContent({
  id: 'users-search-results-pane-content',
});

export default {
  clickOnStatus() {
    usersSearchPane.searchByStatus('Active');
    cy.do([
      userSearchPaneContent
        .find(MultiColumnListRow({ index: 2 }).find(Link('A2L 1, Holly')))
        .click(),
      Button({ id: 'accordion-toggle-button-loansSection' }).click(),
      Section({ id: 'loansSection' }).find(Link('1 open loan')).click(),
    ]);
  },

  checkIn: (barcode) => {
    cy.do([
      TextField('Item ID').fillIn(barcode),
      Button('Enter').click(),
    ]);
  },
};
