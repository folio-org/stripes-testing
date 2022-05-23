import TestType from '../../../support/dictionary/testTypes';
import Features from '../../../support/dictionary/features';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Conditions from '../../../support/fragments/settings/users/conditions';
import Condition from '../../../support/fragments/settings/users/condition';

describe('ui-users-settings: Conditions in Patron blocks', () => {
  beforeEach(() => {
    cy.loginAsAdmin({ path: SettingsMenu.conditionsPath, waiter: Conditions.waitLoading });
    cy.getAdminToken();
    Conditions.resetConditions();
  });

  it('C11078 Verify that you can select/edit/remove patron block conditions', { tags: [TestType.smoke, Features.patronBlocks] }, () => {
    Object.values(Condition.blockCheckboxes).forEach(specialCheckBox => {
      Conditions.conditionsValues.forEach(conditionValue => {
        Conditions.select(conditionValue);
        const specialCondition = new Condition(conditionValue);
        specialCondition.checkInitialState();

        // If Borrowing and/or Renewals and/or Requests is check marked, then Message to be displayed
        specialCondition.clickByCheckbox(specialCheckBox);
        specialCondition.trySave();
        specialCondition.checkRequiredMessageField();
        specialCondition.checkEmptyMessageValidation();
        // uncheck special checkbox
        specialCondition.clickByCheckbox(specialCheckBox);

        // If Message to be displayed is entered, then Borrowing and/or Renewals and/or Requests must be set selected;
        specialCondition.setMessage('Test message');
        specialCondition.trySave();
        specialCondition.checkRequiredCheckboxValidation();

        // save change based on validator error message
        specialCondition.clickByCheckbox(specialCheckBox);
        specialCondition.save(conditionValue);

        // revert changed condition into initial state
        Conditions.resetCondition(conditionValue);
      });
    });
  });
});
