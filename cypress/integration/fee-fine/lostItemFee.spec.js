import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';
import SettingsMenu from '../../support/fragments/settingsMenu';

describe('Fee/fine management', () => {
  const name = 'A_very_specific_name';
  const editedName = 'An_edited_name';
  const duration = '6 week(s)';

  before('Preconditions', () => {
    cy.loginAsAdmin({ path: SettingsMenu.circulationLostItemFeePolicyPath, waiter: LostItemFeePolicy.waitLoading });
    // cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    // cy.visit(`${SettingsMenu.circulationLostItemFeePolicyPath}`);
  });

  it('C5558 Verify that you can create/edit/delete lost item fee policies', () => {
    // creating
    LostItemFeePolicy.startAdding();
    LostItemFeePolicy.fillName(name);
    LostItemFeePolicy.save();
    LostItemFeePolicy.checkErrorMessage('Required if there is a possibility of no fee/fine being charged for a lost item');
    LostItemFeePolicy.fillDuration('6', 'week(s)');
    LostItemFeePolicy.save();
    LostItemFeePolicy.checkAfterSaving(name, duration);

    // editing
    LostItemFeePolicy.startEditing();
    LostItemFeePolicy.fillName(editedName);
    LostItemFeePolicy.save();
    LostItemFeePolicy.checkAfterSaving(editedName, duration);

    // creating policy with existing name
    LostItemFeePolicy.startAdding();
    LostItemFeePolicy.fillName(editedName);
    LostItemFeePolicy.save();
    LostItemFeePolicy.checkErrorMessage('The Lost item fee policy name entered already exists. Please enter a different name.');
  });
  after('Deleting lost item fee policy', () => {
    // deleting
    LostItemFeePolicy.delete(name);
  });
});
