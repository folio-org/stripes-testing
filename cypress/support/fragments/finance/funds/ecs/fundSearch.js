import { SearchField, Button, PaneContent } from '../../../../../../interactors';
import { COMMON_BUTTON_LABELS } from '../../../../constants';
import { PaneRequestWaiter } from '../../../../utils';

const { PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;

const searchField = SearchField({ id: 'input-record-search' });
const searchButton = Button(COMMON_BUTTON_LABELS.SEARCH);
const resultsPaneContent = PaneContent({ id: 'fund-results-pane-content' });

export default {
  searchByName(name) {
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.FUNDS,
      trigger: () => {
        cy.do([searchField.selectIndex('Name'), searchField.fillIn(name), searchButton.click()]);
      },
    });

    cy.expect(resultsPaneContent.exists());
  },

  searchByIsolatedName({ baseName, isolationTag }) {
    const value = `${baseName}${isolationTag}`;
    this.searchByName(value);
  },
};
