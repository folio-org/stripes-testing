import { Pane, Button, MultiColumnList, MultiColumnListRow } from '../../../../../../interactors';

const resultsPane = Pane({ id: 'pane-results' });
const actionsButton = Button('Actions');
const extensionsList = MultiColumnList({ id: 'file-extensions-list' });

export default {
  openNewFileExtentionForm: () => {
    cy.do([resultsPane.find(actionsButton).click(), Button('New file extension').click()]);
  },
  select: () => cy.do(extensionsList.find(MultiColumnListRow({ index: 0 })).click()),
  verifyListOfExistingFileExtensionsIsDisplayed: () => cy.expect(resultsPane.exists()),
  verifyActionMenuAbsent: () => cy.expect(resultsPane.find(actionsButton).absent()),
  verifyActionMenuOnViewPaneAbsent: () => cy.expect(Pane({ id: 'view-file-extension-pane' }).find(actionsButton).absent()),
};
