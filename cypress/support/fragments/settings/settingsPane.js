import { REQUEST_METHOD } from '../../constants';
import {
  Button,
  Pane,
  Section,
  EditableList,
  EditableListRow,
  ColumnHeader,
  MultiColumnListHeader,
  MultiColumnListCell,
  Modal,
  TextField,
  HTML,
  including,
  or,
} from '../../../../interactors';

export const startRowIndex = 2;
export const rootPane = Section({ id: 'controlled-vocab-pane' });
export const paneContent = HTML({ id: 'controlled-vocab-pane-content' });
export const addButton = rootPane.find(Button('+ New'));
export const table = rootPane.find(EditableList());

const clickActionBtn = ({ rowIndex = startRowIndex, locator }) => {
  // filter index implemented based on parent-child relations.
  // aria-rowindex calculated started from 2. Need to count it.
  const currentRow = rootPane.find(EditableListRow({ index: rowIndex - startRowIndex }));
  cy.do(currentRow.find(Button(locator)).click());
};

export default {
  waitLoading(header = 'Settings') {
    cy.expect(Pane(header).exists());
  },
  clickAddNewBtn() {
    cy.do(addButton.click());
  },
  clickSaveBtn({ rowIndex = 2 } = {}) {
    clickActionBtn({ rowIndex, locator: 'Save' });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
  },
  clickCancelBtn({ rowIndex } = {}) {
    clickActionBtn({ rowIndex, locator: 'Cancel' });
    cy.expect(addButton.has({ disabled: false }));
  },
  clickEditBtn({ rowIndex } = {}) {
    clickActionBtn({ rowIndex, locator: { icon: 'edit' } });
  },
  clickDeleteBtn({ rowIndex } = {}) {
    clickActionBtn({ rowIndex, locator: { icon: 'trash' } });
  },
  checkValidatorError({ placeholder, error }) {
    cy.expect(rootPane.find(TextField({ placeholder })).has({ error }));
  },
  checkEmptyTableContent(messages) {
    const [primary, secondary] = messages;
    cy.expect([
      paneContent.exists(),
      paneContent.find(HTML(or(including(primary), including(secondary)))).exists(),
    ]);
  },
  checkResultsTableColumns(columns = [], rootNode = paneContent) {
    columns.forEach((column) => {
      cy.expect(rootNode.find(MultiColumnListHeader(column)).exists());
    });
  },
  checkResultsTableContent(records = [], columnIndex = 0) {
    cy.expect(addButton.has({ disabled: false }));

    records
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((record, index) => {
        cy.expect([
          EditableListRow({ index })
            .find(MultiColumnListCell({ columnIndex }))
            .has({ content: record.name }),
          EditableListRow({ index })
            .find(MultiColumnListCell({ columnIndex: columnIndex + 1 }))
            .has({ content: record.code }),
          EditableListRow({ index })
            .find(Button({ icon: 'edit' }))
            .exists(),
          EditableListRow({ index })
            .find(Button({ icon: 'trash' }))
            .exists(),
        ]);
      });
  },
  checkAddNewBtnAbsent() {
    cy.expect(addButton.absent());
  },
  checkColumnAbsent(content) {
    cy.expect(table.find(ColumnHeader()).exists());
    cy.expect(table.find(ColumnHeader(content)).absent());
  },
  checkColumnExists(content) {
    cy.expect(table.find(ColumnHeader(content)).exists());
  },
  editViaUi(record) {
    if (record) {
      cy.then(() => rootPane.find(MultiColumnListCell(record)).row()).then((rowIndex) => {
        this.clickEditBtn({ rowIndex });
      });
    } else {
      this.clickEditBtn();
    }
  },
  deleteViaUi({ record, modalHeader } = {}) {
    if (record) {
      cy.then(() => rootPane.find(MultiColumnListCell(record)).row()).then((rowIndex) => {
        this.clickDeleteBtn({ rowIndex });
      });
    } else {
      this.clickDeleteBtn();
    }
    cy.do(Modal(modalHeader).find(Button('Delete')).click());
    cy.expect(Modal(modalHeader).absent());
  },
  getViaApi({ path, searchParams } = {}) {
    return cy
      .okapiRequest({
        path,
        searchParams,
      })
      .then((response) => {
        return response.body;
      });
  },
  createViaApi: ({ path, body, searchParams }) => {
    return cy
      .okapiRequest({
        path,
        body,
        searchParams,
        method: REQUEST_METHOD.POST,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },
  deleteViaApi: ({ path, searchParams }) => {
    return cy.okapiRequest({
      path,
      searchParams,
      method: REQUEST_METHOD.DELETE,
      isDefaultSearchParamsRequired: false,
    });
  },
};
