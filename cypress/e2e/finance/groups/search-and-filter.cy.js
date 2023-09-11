import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Groups from '../../../support/fragments/finance/groups/groups';

describe('ui-finance: Groups', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultGroup = { ...Groups.defaultUiGroup };
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;

        Groups.createViaApi(defaultGroup).then((groupResponse) => {
          defaultGroup.id = groupResponse.id;
        });
      });
    });
    cy.createTempUser([permissions.uiFinanceViewGroups.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.groupsPath,
        waiter: Groups.waitLoading,
      });
    });
  });

  after(() => {
    Groups.deleteGroupViaApi(defaultGroup.id);
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C4060 Test the search and filter options for fund groups  (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      // Search Groups by all
      FinanceHelp.searchByAll(defaultGroup.name);
      Groups.checkSearchResults(defaultGroup.name);
      Groups.resetFilters();
      // Search Groups by name
      FinanceHelp.searchByName(defaultGroup.name);
      Groups.checkSearchResults(defaultGroup.name);
      Groups.resetFilters();
      // Search Groups by code
      FinanceHelp.searchByCode(defaultGroup.code);
      Groups.checkSearchResults(defaultGroup.name);
      Groups.resetFilters();
      // Filter Gruops by Acquisition Unit
      Groups.openAcquisitionAccordion();
      Groups.selectNoAcquisitionUnit();
      Groups.checkCreatedInList(defaultGroup.name);
      Groups.resetFilters();
      // Filter Gruops by Status
      Groups.selectActiveStatus();
      Groups.checkCreatedInList(defaultGroup.name);
      Groups.resetFilters();
      // Search and Filter Gruops
      FinanceHelp.searchByAll(defaultGroup.name);
      Groups.selectNoAcquisitionUnit();
      Groups.selectActiveStatus();
      Groups.checkCreatedInList(defaultGroup.name);
      Groups.resetFilters();
    },
  );
});
