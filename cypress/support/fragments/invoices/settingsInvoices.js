import { Button, TextField, NavListItem, MultiColumnListHeader, EditableListRow, MultiColumnListCell } from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const settings = {
  approvals: 'Approvals',
  adjustments: 'Adjustments',
  batchGroups: 'Batch groups',
  batchGroupConfiguration: 'Batch group configuration',
  voucherNumber: 'Voucher number'
};

export default {
  settings: {
    approvals: 'Approvals',
    adjustments: 'Adjustments',
    batchGroups: 'Batch groups',
    batchGroupConfiguration: 'Batch group configuration',
    voucherNumber: 'Voucher number'
  },

  selectSetting: (setting) => {
    cy.do(NavListItem(setting).click());
    cy.expect(MultiColumnListHeader({ id: 'list-column-name' }).exists());
  },

  createNewBatchGroup: (batchGroup) => {
    cy.expect(Button({ id: 'clickable-add-batch-groups' }).exists());
    cy.do([
      Button({ id: 'clickable-add-batch-groups' }).click(),
      TextField({ placeholder: 'name' }).fillIn(batchGroup.name),
      TextField({ placeholder: 'description' }).fillIn(batchGroup.description),
      Button('Save').click()
    ]);
  },

  editBatchGroup: (batchGroup, rowNumber = 0) => {
    cy.do([
      EditableListRow({ index: rowNumber })
        .find(Button({ icon: 'edit' })).click(),
      TextField({ placeholder: 'name' }).fillIn(batchGroup.name),
      TextField({ placeholder: 'description' }).fillIn(batchGroup.description),
      Button('Save').click()
    ]);
  },

  checkBatchGroup: (batchGroup, rowNumber = 0) => {
    cy.expect(EditableListRow({ index: rowNumber })
      .find(MultiColumnListCell({ content: batchGroup.name })).exists());

    cy.expect(EditableListRow({ index: rowNumber })
      .find(MultiColumnListCell({ content: batchGroup.description })).exists());
  },

  deleteBatchGroup: (batchGroup, rowNumber = 0) => {
    cy.do([
      EditableListRow({ index: rowNumber })
        .find(Button({ icon: 'trash' })).click(),
      Button('Delete').click()
    ]);
    InteractorsTools.checkCalloutMessage(`The Batch group ${batchGroup.name} was successfully deleted`);
  }
};
