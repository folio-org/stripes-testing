import BulkEditProfileView from './bulkEditProfileView';
import { RepeatableFieldItem, Select } from '../../../../../../interactors';

const targetRow = (rowIndex = 0) => RepeatableFieldItem({ index: rowIndex });

export default {
  ...BulkEditProfileView,

  verifySelectedItemStatus(status, rowIndex = 0) {
    cy.expect(
      targetRow(rowIndex)
        .find(Select({ dataTestID: 'select-statuses-0' }))
        .has({ checkedOptionText: status }),
    );
  },
};
