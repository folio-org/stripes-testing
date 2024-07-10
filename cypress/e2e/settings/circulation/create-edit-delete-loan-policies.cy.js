import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import LoanPolicy from '../../../support/fragments/circulation/loan-policy';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Permissions -> Circulation', () => {
  const userData = {};
  const newLoanPolicy = {
    id: uuid(),
    name: 'name',
    description: 'description',
    loanable: false,
  };
  const editLoanPolicies = {
    name: 'new name',
    description: 'new description',
    loanable: false,
  };

  before('Prepare test data', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([Permissions.settingsLoanPoliciesAll.gui])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.circulationLoanPoliciesPath,
            waiter: LoanPolicy.waitLoading,
          });
        });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    LoanPolicy.getApi().then((response) => {
      if (response && response.loanPolicies) {
        response.loanPolicies.forEach((policy) => {
          LoanPolicy.deleteApi(policy.id);
        });
      }
    });
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C1214 Can create, edit and remove loan policies (vega)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      // Create a new loan policies
      LoanPolicy.clickNewButton();
      LoanPolicy.fillLoanPolicies(newLoanPolicy);
      LoanPolicy.saveAndCloseLoanPolicies();
      InteractorsTools.checkCalloutMessage(
        `The Loan policy ${newLoanPolicy.name} was successfully created.`,
      );
      //   LoanPolicy.verifyReasonInTheList(newLoanPolicy);

      // Edit the cancellation reason
      LoanPolicy.clickActionsButton();
      LoanPolicy.clickEditButton();
      LoanPolicy.fillLoanPolicies(editLoanPolicies);
      LoanPolicy.saveAndCloseLoanPolicies();
      InteractorsTools.checkCalloutMessage(
        `The Loan policy ${editLoanPolicies.name} was successfully updated.`,
      );
      //   LoanPolicy.verifyReasonInTheList(editLoanPolicies);

      // Remove the loan policies
      LoanPolicy.clickActionsButton();
      LoanPolicy.clickDeleteButton();
      LoanPolicy.clickConfirmDeleteButton();
      InteractorsTools.checkCalloutMessage(
        `The Loan policy ${editLoanPolicies.name} was successfully deleted.`,
      );
      //   LoanPolicy.verifyNoReasonInTheList(editLoanPolicies.name);
    },
  );
});
