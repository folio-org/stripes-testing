import { HTML } from '@interactors/html';
import {
  PaneSet,
  Button,
  Section,
  or,
  including,
  MultiColumnListRow,
} from '../../../../interactors';

const resultsSection = Section({ id: 'pane-list-udps' });
const ermUsagePaneset = PaneSet({ id: 'udps-paneset' });
const resetAllFiltersButton = Button({ id: 'clickable-reset-all' });

export default {
  waitLoading: () => {
    cy.expect(
      or(
        resultsSection.find(MultiColumnListRow()).exists(),
        resultsSection
          .find(HTML(including('Choose a filter or enter a search query to show results.')))
          .exists(),
      ),
      ermUsagePaneset.exists(),
      resetAllFiltersButton.exists(),
    );
  },
};
