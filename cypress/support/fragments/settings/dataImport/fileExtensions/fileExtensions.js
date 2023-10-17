import { including } from '@interactors/html';
import { randomFourDigitNumber } from '../../../../utils/stringTools';
import {
  Pane,
  Button,
  MultiColumnList,
  MultiColumnListCell,
  Callout,
  MultiColumnListRow,
} from '../../../../../../interactors';
import { REQUEST_METHOD } from '../../../../constants';

const resultsPane = Pane({ id: 'pane-results' });
const actionsButton = Button('Actions');
const extensionsList = MultiColumnList({ id: 'file-extensions-list' });

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
  verifyActionMenuOnViewPaneAbsent: () => cy.expect(Pane({ id: 'view-file-extension-pane' }).find(actionsButton).absent()),
  verifyListOfExistingFileExtensionsIsDisplayed: () => cy.expect(resultsPane.exists()),
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
