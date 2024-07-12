import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import LoanPolicy from '../../../support/fragments/circulation/loan-policy';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Permissions -> Circulation', () => {
  const userData = {};
  const newLoanPolicies = {
    name: uuid(),
    description: 'description',
    loanable: false,
  };
  const editLoanPolicies = {
    name: uuid(),
    description: 'new description',
    loanable: true,
    loans: {
      profile: 'Rolling',
      period: {
        duration: 3,
        interval: 'Week(s)',
        closedLibraryDueDateManagement: 'Keep the current due date',
      },
    },
    renewable: true,
    renewals: {
      numberOfRenewalsAllowed: '3',
      renewFrom: 'Current due date',
    },
    requestManagement: {
      holds: {
        alternateCheckoutLoanPeriod: {
          duration: 3,
          interval: 'Day(s)',
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
    LoanPolicy.deleteLoanPolicyByNameViaAPI(newLoanPolicies.name);
    LoanPolicy.deleteLoanPolicyByNameViaAPI(editLoanPolicies.name);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C1214 Can create, edit and remove loan policies (vega)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      // Create a new loan policies
      LoanPolicy.clickNewButton();
      LoanPolicy.fillLoanPolicy(newLoanPolicies);
      LoanPolicy.saveAndCloseLoanPolicy();
      InteractorsTools.checkCalloutMessage(
        `The Loan policy ${newLoanPolicies.name} was successfully created.`,
      );
      LoanPolicy.selectLoanPolicyByName(newLoanPolicies.name);
      LoanPolicy.verifyLoanPolicy('Loan policy name', newLoanPolicies.name);
      LoanPolicy.verifyLoanPolicy('Description', newLoanPolicies.description);

      // Edit the cancellation reason
      LoanPolicy.clickActionsButton();
      LoanPolicy.clickEditButton();
      LoanPolicy.fillLoanPolicy(editLoanPolicies);
      LoanPolicy.saveAndCloseLoanPolicy();
      InteractorsTools.checkCalloutMessage(
        `The Loan policy ${editLoanPolicies.name} was successfully updated.`,
      );
      LoanPolicy.selectLoanPolicyByName(editLoanPolicies.name);
      LoanPolicy.verifyLoanPolicy('Loan policy name', editLoanPolicies.name);
      LoanPolicy.verifyLoanPolicy('Description', editLoanPolicies.description);
      LoanPolicy.verifyLoanPolicy('Loan profile', editLoanPolicies.loans.profile);
      LoanPolicy.verifyLoanPolicy(
        'Loan period',
        editLoanPolicies.loans.period.duration + ' ' + editLoanPolicies.loans.period.interval,
      );
      LoanPolicy.verifyLoanPolicy(
        'Closed library due date management',
        editLoanPolicies.loans.period.closedLibraryDueDateManagement,
      );
      LoanPolicy.verifyLoanPolicy('Renewable', editLoanPolicies.renewable ? 'Yes' : 'No');

      // Remove the loan policies
      LoanPolicy.clickActionsButton();
      LoanPolicy.clickDeleteButton();
      LoanPolicy.confirm();
      InteractorsTools.checkCalloutMessage(
        `The Loan policy ${editLoanPolicies.name} was successfully deleted.`,
      );
      LoanPolicy.verifyLoanPolicyInNotInTheList(editLoanPolicies.name);
    },
  );
});
