import TestType from '../../../support/dictionary/testTypes';
import Features from '../../../support/dictionary/features';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Conditions from '../../../support/fragments/settings/users/conditions';
import Condition from '../../../support/fragments/settings/users/condition';

describe('ui-users-settings: Conditions in Patron blocks', () => {
  const isDisabled = true;
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  it('C11078 Verify that you can select/edit/remove patron block conditions', { tags: [TestType.smoke, Features.patronBlocks] }, () => {
    cy.visit(SettingsMenu.conditionsPath);
    Conditions.waitLoading();
    Conditions.conditionsValues.forEach(conditionValue => {
      Conditions.select(conditionValue);
      Condition.checkInitialState();
      Object.values(Condition.blockCheckboxes).forEach(specialCheckBox => {
        // If Borrowing and/or Renewals and/or Requests is check marked, then Message to be displayed
        Condition.clickByCheckbox(specialCheckBox);
        Condition.setMessage('');
        Condition.trySave();
        Condition.checkRequiredMessageField();
        Condition.checkEmptyMessageValidation();
        // uncheck special checkbox
        Condition.clickByCheckbox(specialCheckBox);

        // If Message to be displayed is entered, then Borrowing and/or Renewals and/or Requests must be set selected;
        Condition.setMessage('Test message');
        Condition.trySave();
        Condition.checkRequiredCheckboxValidation();

        // save change based on validator error message
        Condition.clickByCheckbox(specialCheckBox);
        Condition.save(conditionValue);

        // reset condition
        Condition.setMessage('');
        Condition.clickByCheckbox(specialCheckBox);
        Condition.save(conditionValue);
      });
    });
  });
});
