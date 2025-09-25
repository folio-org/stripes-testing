import { Pane, MultiSelect } from '../../../../../../interactors';
import BulkEditProfileForm from './bulkEditProfileForm';

const newProfilePane = Pane('New FOLIO instances bulk edit profile');
const statisticalCodeSelect = MultiSelect({ label: 'Statistical code select' });

export default {
  ...BulkEditProfileForm,

  waitLoading() {
    cy.expect(newProfilePane.exists());
  },

  verifyNewProfilePaneAbsent() {
    cy.expect(newProfilePane.absent());
  },

  selectStatisticalCode(statisticalCode, rowIndex = 0) {
    cy.do(this.targetRow(rowIndex).find(statisticalCodeSelect).select(statisticalCode));
  },

  verifyStatisticalCodeSelected(statisticalCode, rowIndex = 0) {
    cy.expect(
      this.targetRow(rowIndex)
        .find(statisticalCodeSelect)
        .has({ selected: [statisticalCode] }),
    );
  },
};
