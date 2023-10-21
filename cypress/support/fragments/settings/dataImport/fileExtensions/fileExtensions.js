import { including } from '@interactors/html';
import { randomFourDigitNumber } from '../../../../utils/stringTools';
import {
  Pane,
  Button,
  MultiColumnList,
  MultiColumnListCell,
  Callout,
  TextField,
  MultiColumnListRow,
} from '../../../../../../interactors';
import { REQUEST_METHOD } from '../../../../constants';

const resultsPane = Pane({ id: 'pane-results' });
const actionsButton = Button('Actions');
const extensionsList = MultiColumnList({ id: 'file-extensions-list' });
const searchField = TextField({ id: 'input-search-file-extensions-field' });

const defaultFileExtension = {
  importBlocked: true,
  description: '',
  extension: `.txt${randomFourDigitNumber()}`,
  dataTypes: ['MARC'],
};

function getFileExtensionNames() {
  const cells = [];

  cy.wait(2000);
  return cy
    .get('div[class^="mclRowContainer--"]')
    .find('[data-row-index]')
    .each(($row) => {
      // from each row, choose specific cell
      cy.get('[class*="mclCell-"]:nth-child(1)', { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then((cellValue) => {
          cells.push(cellValue);
        });
    })
    .then(() => cells);
}

export default {
  getFileExtensionNames,
  createViaApi: () => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'data-import/fileExtensions',
        body: defaultFileExtension,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },
  select: (extension) => {
    cy.do(
      extensionsList.find(MultiColumnListCell({ column: 'Extension', content: extension })).click(),
    );
  },
  openNewFileExtensionForm: () => {
    cy.do([resultsPane.find(actionsButton).click(), Button('New file extension').click()]);
  },
  search: (value) => {
    // TODO: clarify with developers what should be waited
    cy.wait(1500);
    cy.do(resultsPane.find(searchField).fillIn(value));
    cy.do(Button('Search').click());
  },
  clearSearchField: () => {
    cy.do(searchField.focus());
    cy.do(Button({ id: 'input-file-extensions-search-field-clear-button' }).click());
  },
  verifyActionMenuOnViewPaneAbsent: () => cy.expect(Pane({ id: 'view-file-extension-pane' }).find(actionsButton).absent()),
  verifyListOfExistingFileExtensionsIsDisplayed: () => cy.expect(resultsPane.find(MultiColumnList({ id: 'file-extensions-list' })).exists()),
  verifyActionMenuAbsent: () => cy.expect(resultsPane.find(actionsButton).absent()),
  verifyCalloutMessage: (message) => {
    cy.expect(Callout({ textContent: including(message) }).exists());
  },

  verifyDeletedFileExtensionAbsent: (extention) => {
    getFileExtensionNames().then((cells) => {
      cy.expect(cells).to.not.deep.equal(extention);
    });
  },
  verifyCreateFileExtensionPresented: (extention) => {
    getFileExtensionNames().then((cells) => {
      cy.expect(cells).to.include(extention);
    });
  },
  verifySearchFieldIsEmpty: () => cy.expect(searchField.has({ value: '' })),
  verifySearchResult: (extension) => {
    cy.wait(2000);
    cy.expect(resultsPane.find(MultiColumnListCell({ row: 0, content: extension })).exists());
  },
  verifyCreatedFileExtension: (extension, importStatus) => {
    cy.do(
      MultiColumnListCell({ content: extension }).perform((element) => {
        const rowNumber = element.closest('[data-row-index').getAttribute('data-row-index');

        cy.expect(
          MultiColumnListRow({ rowIndexInParent: rowNumber })
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ content: importStatus }),
        );
      }),
    );
  },
};
