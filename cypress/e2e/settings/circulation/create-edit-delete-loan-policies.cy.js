import Permissions from '../../../support/dictionary/permissions';
import LoanPolicy from '../../../support/fragments/circulation/loan-policy';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Permissions -> Circulation', () => {
  const userData = {};
  const newLoanPolicy = {
    name: 'name',
    description: 'description',
    loanable: false,
  };
  const editLoanPolicies = {
    name: 'new name',
    description: 'new description',
    loanable: true,
    loans: {
      profileId: 'Rolling',
      period: {
        duration: 3,
        intervalId: 'Week(s)',
        closedLibraryDueDateManagementId: 'Keep the current due date',
      },
    },
    renewable: true,
    renewals: {
      numberOfRenewalsAllowed: '3',
      renewFromId: 'Current due date',
    },
    requestManagement: {
      holds: {
        alternateCheckoutLoanPeriod: {
          duration: 3,
          intervalId: 'Day(s)',
        },
      },
    },
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
    LoanPolicy.deleteLoanPolicyByNameViaAPI(newLoanPolicy.name);
    LoanPolicy.deleteLoanPolicyByNameViaAPI(editLoanPolicies.name);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C1214 Can create, edit and remove loan policies (vega)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      // Create a new loan policies
      LoanPolicy.clickNewButton();
      LoanPolicy.fillLoanPolicy(newLoanPolicy);
      LoanPolicy.saveAndCloseLoanPolicy();
      InteractorsTools.checkCalloutMessage(
        `The Loan policy ${newLoanPolicy.name} was successfully created.`,
      );

      // Edit the cancellation reason
      LoanPolicy.clickActionsButton();
      LoanPolicy.clickEditButton();
      LoanPolicy.fillLoanPolicy(editLoanPolicies);
      LoanPolicy.saveAndCloseLoanPolicy();
      InteractorsTools.checkCalloutMessage(
        `The Loan policy ${editLoanPolicies.name} was successfully updated.`,
      );

      // Remove the loan policies
      LoanPolicy.clickActionsButton();
      LoanPolicy.clickDeleteButton();
      LoanPolicy.confirm();
      InteractorsTools.checkCalloutMessage(
        `The Loan policy ${editLoanPolicies.name} was successfully deleted.`,
      );
    },
  );
});
