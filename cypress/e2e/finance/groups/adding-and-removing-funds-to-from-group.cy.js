import permissions from '../../../support/dictionary/permissions';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import GroupDetails from '../../../support/fragments/finance/groups/groupDetails';
import Groups from '../../../support/fragments/finance/groups/groups';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Finance', () => {
  describe('Groups', () => {
    const firstFund = { ...Funds.defaultUiFund };
    const secondFund = {
      name: `autotest_fund2_${getRandomPostfix()}`,
      code: getRandomPostfix(),
      externalAccountNo: getRandomPostfix(),
      fundStatus: 'Active',
      description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
    };
    const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const defaultLedger = { ...Ledgers.defaultUiLedger };
    const defaultGroup = { ...Groups.defaultUiGroup };
    const firstBudget = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
    };
    const secondBudget = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
    };
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
        defaultFiscalYear.id = response.id;
        defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
        firstBudget.fiscalYearId = defaultFiscalYear.id;
        secondBudget.fiscalYearId = defaultFiscalYear.id;
        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;
          firstFund.ledgerId = defaultLedger.id;
          secondFund.ledgerId = defaultLedger.id;

          Funds.createViaApi(firstFund).then((firstFundResponse) => {
            firstFund.id = firstFundResponse.fund.id;
            firstBudget.fundId = firstFundResponse.fund.id;
            Budgets.createViaApi(firstBudget);
          });
          cy.getAdminToken();
          Funds.createViaApi(secondFund).then((secondFundResponse) => {
            secondFund.id = secondFundResponse.fund.id;
            secondBudget.fundId = secondFundResponse.fund.id;
            Budgets.createViaApi(secondBudget);
          });
        });
      });
      cy.createTempUser([
        permissions.uiFinanceCreateViewEditGroups.gui,
        permissions.uiFinanceViewEditDeleteFundBudget.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.groupsPath,
          waiter: Groups.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Budgets.deleteViaApi(firstBudget.id);
      Budgets.deleteViaApi(secondBudget.id);
      Funds.deleteFundViaApi(firstFund.id);
      Funds.deleteFundViaApi(secondFund.id);
      Groups.deleteGroupViaApi(defaultGroup.id);
      Ledgers.deleteLedgerViaApi(defaultLedger.id);
      FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C347620 Adding and removing funds to/from a group (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C347620'] },
      () => {
        Groups.waitLoading();

        Groups.createDefaultGroupAndCaptureId(defaultGroup);
        Groups.checkCreatedGroup(defaultGroup);
        GroupDetails.checkFundsDetails();

        Groups.addLedgerToGroup(defaultLedger.name);
        InteractorsTools.checkCalloutMessage('Fund(s) have been added to group');

        Groups.checkAddingMultiplyFunds(secondFund.name, firstFund.name);
        Groups.verifyFundsCount(2);

        Groups.removeFundFromGroup(firstFund.name);
        InteractorsTools.checkCalloutMessage(`Fund ${firstFund.code} has been removed from group`);
        GroupDetails.checkFundAbsent(firstFund.name);
        GroupDetails.checkFundsDetails([{ name: secondFund.name }]);
        Groups.verifyFundsCount(1);
      },
    );
  });
});
