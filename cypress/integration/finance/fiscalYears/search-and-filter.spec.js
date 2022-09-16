
// TO DO: Now we do not have the ability to delete data, becouse deleting transactions is now impossible.
// In the future they want to change this.
// For this reason I have already written a method for cleaning the data and I think it should be kept.
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import getRandomPostfix from '../../../support/utils/stringTools';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('ui-finance: Add transfer to budget', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };


  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear)
      .then(response => {
        defaultFiscalYear.id = response.id;
      });
  });

  after(() => {
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
  });

  it('C4058: Test the search and filter options for fiscal years (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    FinanceHelp.searchByAll(defaultFiscalYear.name);
    FiscalYears.resetFilters();
    FinanceHelp.searchByName(defaultFiscalYear.name);
    FiscalYears.resetFilters();
    FinanceHelp.searchByCode(defaultFiscalYear.code);
    FiscalYears.resetFilters();
  });
});
