import { Button, TextField, MultiColumnListHeader, EditableListRow, MultiColumnListCell } from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import DateTools from '../../utils/dateTools';

const saveButton = Button('Save');
const deleteButton = Button('Delete');
const trashIconButton = Button({ icon: 'trash' });
const editIconButton = Button({ icon: 'edit' });

export default {
  settingsInvoicePath: {
    approvals: '/approvals',
    adjustments: '/adjustments',
    batchGroups:  '/batch-groups',
    batchGroupConfiguration: '/batch-group-configuration',
    voucherNumber: '/invoice/voucher-number'
  },

  waitBatchGroupsLoading: () => {
    cy.expect(MultiColumnListHeader({ id: 'list-column-name' }).exists());
  },

  fillRequiredFields: (batchGroup) => {
    cy.do([
      TextField({ placeholder: 'name' }).fillIn(batchGroup.name),
      TextField({ placeholder: 'description' }).fillIn(batchGroup.description),
      saveButton.click()
    ]);
  },

  createNewBatchGroup(batchGroup) {
    cy.do(Button({ id: 'clickable-add-batch-groups' }).click());
    this.fillRequiredFields(batchGroup);
  },

  editBatchGroup(batchGroup, rowNumber = 0) {
    cy.do(EditableListRow({ index: rowNumber }).find(editIconButton).click());
    this.fillRequiredFields(batchGroup);
  },

  checkBatchGroup: (batchGroup, rowNumber = 0) => {
    const createdByAdmin = `${DateTools.getFormattedDateWithSlashes({ date: new Date() })} by ADMINISTRATOR, DIKU`;

    cy.expect(EditableListRow({ index: rowNumber })
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: batchGroup.name }));

    cy.expect(EditableListRow({ index: rowNumber })
      .find(MultiColumnListCell({ columnIndex: 1 }))
      .has({ content: batchGroup.description }));

    cy.expect(EditableListRow({ index: rowNumber })
      .find(MultiColumnListCell({ columnIndex: 2 }))
      .has({ content: createdByAdmin }));
  },

  deleteBatchGroup: (batchGroup, rowNumber = 0) => {
    cy.do([
      EditableListRow({ index: rowNumber })
        .find(trashIconButton).click(),
      deleteButton.click()
    ]);
    InteractorsTools.checkCalloutMessage(`The Batch group ${batchGroup.name} was successfully deleted`);
  }
};
