import BulkEditProfileView from './bulkEditProfileView';
import { Select } from '../../../../../../interactors';

export default {
  ...BulkEditProfileView,

  verifySelectedItemStatus(status, rowIndex = 0) {
    cy.expect(
      this.getTargetRow(rowIndex)
        .find(Select({ dataTestID: 'select-statuses-0' }))
        .has({ checkedOptionText: status }),
    );
  },
};
