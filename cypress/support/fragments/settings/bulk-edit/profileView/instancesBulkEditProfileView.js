import BulkEditProfileView from './bulkEditProfileView';
import { MultiSelect } from '../../../../../../interactors';

export default {
  ...BulkEditProfileView,

  verifySelectedStatisticalCode(statisticalCode, rowIndex = 0) {
    cy.expect(
      this.targetRow(rowIndex)
        .find(MultiSelect({ label: 'Statistical code select' }))
        .has({ selected: [statisticalCode] }),
    );
  },
};
