import { including } from '@interactors/html';
import { randomFourDigitNumber } from '../../../../utils/stringTools';
import {
  Pane,
  Button,
  MultiColumnList,
  MultiColumnListCell,
  Callout,
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

export default {
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
  verifyListOfExistingFileExtensionsIsDisplayed: () => cy.expect(resultsPane.exists()),
  verifyActionMenuAbsent: () => cy.expect(resultsPane.find(actionsButton).absent()),
  verifyCalloutMessage: (message) => {
    cy.expect(Callout({ textContent: including(message) }).exists());
  },
  verifyDeletedFileExtensionAbsent: (extention) => {
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
      .then(() => {
        cy.expect(cells).to.not.deep.equal(extention);
      });
  },
};
