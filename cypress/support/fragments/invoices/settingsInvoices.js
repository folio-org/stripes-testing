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

  editBatchGroup(batchGroup, oldBatchGroupName) {
    cy.do(MultiColumnListCell({ content: oldBatchGroupName }).perform(
      element => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(EditableListRow({ index: +rowNumber.split('-')[1] }).find(editIconButton).click());
        this.fillRequiredFields(batchGroup);
      }
    ));
  },

  checkBatchGroup: (batchGroup) => {
    cy.do(MultiColumnListCell({ content: batchGroup.name }).perform(
      element => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const createdByAdmin = `${DateTools.getFormattedDateWithSlashes({ date: new Date() })} by ADMINISTRATOR, DIKU`;
        cy.expect(EditableListRow({ index: +rowNumber.split('-')[1] })
          .find(MultiColumnListCell({ columnIndex: 0 }))
          .has({ content: batchGroup.name }));
        cy.expect(EditableListRow({ index: +rowNumber.split('-')[1] })
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: batchGroup.description }));
        cy.expect(EditableListRow({ index: +rowNumber.split('-')[1] })
          .find(MultiColumnListCell({ columnIndex: 2 }))
          .has({ content: createdByAdmin }));
      }
    ));
  },

  deleteBatchGroup: (batchGroup) => {
    cy.do(MultiColumnListCell({ content: batchGroup.name }).perform(
      element => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do([
          EditableListRow({ index: +rowNumber.split('-')[1] })
            .find(trashIconButton).click(),
          deleteButton.click()
        ]);
      }
    ));
    InteractorsTools.checkCalloutMessage(`The Batch group ${batchGroup.name} was successfully deleted`);
  },

  checkThatSystemBatchGroupCantBeDeleted: (batchGroupName) => {
    cy.do(MultiColumnListCell({ content: batchGroupName }).perform(
      element => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        expect(EditableListRow({ index: +rowNumber.split('-')[1] }).find(trashIconButton).absent());
      }
    ));
  }
};
