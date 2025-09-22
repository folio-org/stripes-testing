import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';
import SettingsMenu from '../../support/fragments/settingsMenu';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Fees&Fines', () => {
  describe('Settings Circulation', () => {
    const name = getTestEntityValue('A_very_specific_name');
    const editedName = getTestEntityValue('An_edited_name');
    const lostItemChargeFeeFineError =
      'Required if there is a possibility of no fee/fine being charged for a lost item';
    const duplicateError =
      'The Lost item fee policy name entered already exists. Please enter a different name.';
    const duration = '6';
    const period = 'week(s)';

    before('Preconditions', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.circulationLostItemFeePolicyPath,
        waiter: LostItemFeePolicy.waitLoading,
        authRefresh: true,
      });
    });

    it(
      'C5558 Verify that you can create/edit/delete lost item fee policies (vega)',
      { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C5558'] },
      () => {
        // creating
        LostItemFeePolicy.startAdding();
        LostItemFeePolicy.fillName(name);
        LostItemFeePolicy.save();
        LostItemFeePolicy.checkErrorMessage(lostItemChargeFeeFineError);
        LostItemFeePolicy.fillDuration(duration, period);
        LostItemFeePolicy.save();
        LostItemFeePolicy.checkAfterSaving(name, `${duration} ${period}`);

        // editing
        LostItemFeePolicy.startEditing();
        LostItemFeePolicy.fillName(editedName);
        LostItemFeePolicy.save();
        LostItemFeePolicy.checkAfterSaving(editedName, `${duration} ${period}`);

        // creating policy with existing name
        LostItemFeePolicy.startAdding();
        LostItemFeePolicy.fillName(editedName);
        LostItemFeePolicy.fillDuration(duration, period);
        LostItemFeePolicy.save();
        LostItemFeePolicy.checkErrorMessage(duplicateError);
      },
    );
    after('Deleting lost item fee policy', () => {
      // deleting
      LostItemFeePolicy.delete(name);
    });
  });
});
