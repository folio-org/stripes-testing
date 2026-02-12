/*
Due to test parallelization, it was decided to check only 'Recall overdue by maximum number of days' condition.
If this test checks all conditions, it may cause other tests that use conditions to fail.
'Recall overdue by maximum number of days' was chosen because it is not used by other tests.
*/
import Condition from '../../../../../../support/fragments/settings/users/condition';
import Conditions from '../../../../../../support/fragments/settings/users/conditions';
import SettingsMenu from '../../../../../../support/fragments/settingsMenu';
import { parseSanityParameters } from '../../../../../../support/utils/users';

describe('Fees&Fines', () => {
  describe('Settings Users (Fee/fine)', () => {
    const { user, memberTenant } = parseSanityParameters();
    beforeEach(() => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: SettingsMenu.conditionsPath,
        waiter: Conditions.waitLoading,
      });
      cy.allure().logCommandSteps();
      Conditions.resetConditions();
    });

    it(
      'C11078 Verify that you can select/edit/remove patron block conditions (vega)',
      { tags: ['dryRun', 'vega', 'C11078'] },
      () => {
        Object.values(Condition.blockCheckboxes).forEach((specialCheckBox) => {
          const conditionType = Conditions.conditionTypes[5];
          Conditions.select(conditionType);
          const specialCondition = new Condition(conditionType);
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
          specialCondition.save(conditionType);

          // revert changed condition into initial state
          Conditions.resetCondition(conditionType);
          cy.reload().then(() => {
            Conditions.waitLoading();
            cy.wait(2000);
          });
        });
      },
    );
  });
});
