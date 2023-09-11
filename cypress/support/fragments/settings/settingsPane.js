import { Button, Pane, Section, EditableList, EditableListRow } from '../../../../interactors';

export const SETTINGS = {
  TENANT: 'Tenant',
};

export const startRowIndex = 2;
export const rootPaneSet = Section({ id: 'controlled-vocab-pane' });
export const addButton = rootPaneSet.find(Button('+ New'));
export const table = rootPaneSet.find(EditableList());

const clickActionBtn = ({ rowIndex = startRowIndex, locator }) => {
  // filter index implemented based on parent-child relations.
  // aria-rowindex calculated started from 2. Need to count it.
  const currentRow = table.find(EditableListRow({ index: rowIndex - startRowIndex }));
  cy.do(currentRow.find(Button(locator)).click());
};

export default {
  waitLoading(section = 'Settings') {
    cy.expect(Pane(section).exists());
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
};
