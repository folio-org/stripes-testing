import {
  Button,
  TextField,
  MultiColumnListHeader,
  EditableListRow,
  MultiColumnListCell,
  Selection,
  SelectionList,
  PaneHeader,
  Checkbox,
  Modal,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import DateTools from '../../utils/dateTools';

const saveButton = Button('Save');
const deleteButton = Button('Delete');
const trashIconButton = Button({ icon: 'trash' });
const editIconButton = Button({ icon: 'edit' });

function getEditableListRow(rowNumber) {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
}

export default {
  // TODO: redesign to SettingsMenu
  settingsInvoicePath: {
    approvals: '/approvals',
    adjustments: '/adjustments',
    batchGroups: '/batch-groups',
    batchGroupConfiguration: '/batch-group-configuration',
    voucherNumber: '/invoice/voucher-number',
  },

  waitBatchGroupsLoading: () => {
    cy.expect(MultiColumnListHeader({ id: 'list-column-name' }).exists());
  },

  fillRequiredFields: (batchGroup) => {
    cy.do([
      TextField({ placeholder: 'name' }).fillIn(batchGroup.name),
      TextField({ placeholder: 'description' }).fillIn(batchGroup.description),
      saveButton.click(),
    ]);
  },

  createNewBatchGroup(batchGroup) {
    cy.do(Button({ id: 'clickable-add-batch-groups' }).click());
    this.fillRequiredFields(batchGroup);
  },

  editBatchGroup(batchGroup, oldBatchGroupName) {
    cy.do(
      MultiColumnListCell({ content: oldBatchGroupName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(getEditableListRow(rowNumber).find(editIconButton).click());
        this.fillRequiredFields(batchGroup);
      }),
    );
  },

  checkBatchGroup: (batchGroup, userName) => {
    cy.do(
      MultiColumnListCell({ content: batchGroup.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const createdByAdmin = `${DateTools.getFormattedDateWithSlashes({
          date: new Date(),
        })} by ${userName}`;
        cy.expect(
          getEditableListRow(rowNumber)
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: batchGroup.name }),
        );
        cy.expect(
          getEditableListRow(rowNumber)
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ content: batchGroup.description }),
        );
        cy.expect(
          getEditableListRow(rowNumber)
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: createdByAdmin }),
        );
      }),
    );
  },

  deleteBatchGroup: (batchGroup) => {
    cy.do(
      MultiColumnListCell({ content: batchGroup.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do([getEditableListRow(rowNumber).find(trashIconButton).click(), deleteButton.click()]);
      }),
    );
    InteractorsTools.checkCalloutMessage(
      `The batch group ${batchGroup.name} was successfully deleted`,
    );
  },

  canNotDeleteBatchGroup: (batchGroup) => {
    cy.do([
      MultiColumnListCell({ content: batchGroup.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do([getEditableListRow(rowNumber).find(trashIconButton).click(), deleteButton.click()]);
      }),
      Modal('Cannot delete batch group').find(Button('Okay')).click(),
    ]);
  },

  checkNotDeletingGroup: (batchGroupName) => {
    cy.do(
      MultiColumnListCell({ content: batchGroupName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        expect(getEditableListRow(rowNumber).find(trashIconButton).absent());
      }),
    );
  },
  selectJsonFormatForVaucher: () => {
    cy.do([
      Selection('Batch group*').open(),
      SelectionList().select('Amherst (AC)'),
      Selection({ name: 'format' }).open(),
      SelectionList().select('JSON'),
    ]);
  },

  setConfigurationBatchGroup: (body) => cy.okapiRequest({
    method: 'POST',
    path: 'batch-voucher/export-configurations',
    body,
  }),

  waitApprovalsLoading: () => {
    cy.expect(PaneHeader('Approvals').exists());
  },

  checkApproveAndPayCheckboxIsDisabled: () => {
    cy.expect(Checkbox({ name: 'isApprovePayEnabled' }).disabled());
  },

  checkApproveAndPayCheckboxIfNeeded: () => {
    const checkbox = Checkbox({ name: 'isApprovePayEnabled' });
    cy.expect(checkbox.exists());
    cy.do(checkbox.checkIfNotSelected());
    cy.get('#clickable-save-config').then(($btn) => {
      if (!$btn.is(':disabled') && $btn.attr('aria-disabled') !== 'true') {
        cy.wrap($btn).click();
      }
    });
    cy.wait(2000);
  },

  uncheckApproveAndPayCheckboxIfChecked: () => {
    const checkbox = Checkbox({ name: 'isApprovePayEnabled' });
    cy.expect(checkbox.exists());
    cy.do(checkbox.uncheckIfSelected());
    cy.get('#clickable-save-config').then(($btn) => {
      if (!$btn.is(':disabled') && $btn.attr('aria-disabled') !== 'true') {
        cy.wrap($btn).click();
      }
    });
    cy.wait(2000);
  },
};
