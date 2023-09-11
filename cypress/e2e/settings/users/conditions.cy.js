/*
Due to test parallelization, it was decided to check only 'Recall overdue by maximum number of days' condition.
If this test checks all conditions, it may cause other tests that use conditions to fail.
'Recall overdue by maximum number of days' was chosen because it is not used by other tests.
*/
import TestType from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
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

  it(
    'C11078 Verify that you can select/edit/remove patron block conditions (vega)',
    { tags: [TestType.smoke, Features.patronBlocks, DevTeams.vega] },
    () => {
      Object.values(Condition.blockCheckboxes).forEach((specialCheckBox) => {
        const conditionValue = Conditions.conditionsValues[5];
        Conditions.select(conditionValue);
        const specialCondition = new Condition(conditionValue);
        specialCondition.checkInitialState();

        // If Borrowing and/or Renewals and/or Requests is check marked, then Message to be displayed
        specialCondition.clickByCheckbox(specialCheckBox);
        specialCondition.trySave();
        // in order to get error message Save button should be clicked two times
        specialCondition.trySave();
        specialCondition.checkRequiredMessageField();
        specialCondition.checkEmptyMessageValidation();
        // uncheck special checkbox
        specialCondition.clickByCheckbox(specialCheckBox);

        // If Message to be displayed is entered, then Borrowing and/or Renewals and/or Requests must be set selected;
        specialCondition.setMessage('Test message');
        specialCondition.trySave();
        // in order to get error message Save button should be clicked two times
        specialCondition.trySave();
        specialCondition.checkRequiredCheckboxValidation();
        // save change based on validator error message
        specialCondition.clickByCheckbox(specialCheckBox);
        specialCondition.save(conditionValue);

        // revert changed condition into initial state
        Conditions.resetCondition(conditionValue);
        cy.reload();
      });
    },
  );
});
