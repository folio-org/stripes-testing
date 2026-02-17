import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import Groups from '../../../support/fragments/finance/groups/groups';
import BatchEditBudget from '../../../support/fragments/finance/ledgers/batchEditBudget';

describe('Finance › Batch allocation', () => {
  let user;
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const acqUnit = AcquisitionUnits.getDefaultAcquisitionUnit({ protectRead: true });
  let membershipAdminId;
  const ledgers = [
    {
      ...Ledgers.defaultUiLedger,
      name: `Ledger_A_${getRandomPostfix()}`,
      code: `test_automation_code_1_${getRandomPostfix()}`,
      acqUnitIds: [],
    },
    {
      ...Ledgers.defaultUiLedger,
      name: `Ledger_B_${getRandomPostfix()}`,
      code: `test_automation_code_2_${getRandomPostfix()}`,
    },
  ];
  const funds = [
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_A_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_1`,
    },
    {
      ...Funds.defaultUiFund,
      name: `autotest_fund_B_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_2`,
    },
  ];
  const group = { ...Groups.defaultUiGroup };
  const budgets = [
    { ...Budgets.getDefaultBudget(), allocated: 100 },
    { ...Budgets.getDefaultBudget(), allocated: 100 },
  ];

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.ledgerPath,
      waiter: Ledgers.waitLoading,
    });
    AcquisitionUnits.createAcquisitionUnitViaApi(acqUnit).then(() => {
      ledgers[0].acqUnitIds.push(acqUnit.id);
      cy.getAdminUserDetails().then((u) => {
        AcquisitionUnits.assignUserViaApi(u.id, acqUnit.id).then((id) => {
          membershipAdminId = id;
        });
      });
    });

    FiscalYears.createViaApi(fiscalYear).then((fy) => {
      fiscalYear.id = fy.id;
      ledgers.forEach((ledger) => {
        ledger.fiscalYearOneId = fy.id;
      });
      budgets.forEach((b) => {
        b.fiscalYearId = fy.id;
      });
      Ledgers.createViaApi(ledgers[0]).then((ledger1Response) => {
        ledgers[0].id = ledger1Response.id;
        funds[0].ledgerId = ledger1Response.id;
        Ledgers.createViaApi(ledgers[1]).then((ledger2Response) => {
          ledgers[1].id = ledger2Response.id;
          funds[1].ledgerId = ledger2Response.id;
          Groups.createViaApi(group).then((groupAResponse) => {
            group.id = groupAResponse.id;
            Funds.createViaApi(funds[0]).then((fundResponseA) => {
              funds[0].id = fundResponseA.fund.id;
              budgets[0].fundId = fundResponseA.fund.id;
              Budgets.createViaApi(budgets[0]);
            });
            Funds.createViaApi(funds[1], [groupAResponse.id]).then((fundResponseB) => {
              funds[1].id = fundResponseB.fund.id;
              budgets[1].fundId = fundResponseB.fund.id;
              Budgets.createViaApi(budgets[1]);
            });
          });
        });
      });
    });
    Ledgers.searchByName(ledgers[0].name);
    Ledgers.selectLedger(ledgers[0].name);
    BatchEditBudget.clickBatchAllocationButton();
    BatchEditBudget.saveAndCloseBatchAllocation();
    BatchEditBudget.setAllocationChange(funds[0].name, '100');
    BatchEditBudget.clickRecalculateButton();
    cy.wait(1000);
    BatchEditBudget.assertTotalAllocatedAfter(funds[0].name, '200.00');
    BatchEditBudget.clickSaveAndCloseButton();
    cy.wait(4000);
    Ledgers.closeOpenedPage();
    BatchEditBudget.openBatchAllocationLogsFromLedgerList();
    BatchEditBudget.searchLogs(fiscalYear.code, ledgers[0].code);
    BatchEditBudget.clickLogForLedger(fiscalYear.code, ledgers[0].code);

    cy.createTempUser([
      permissions.uiFinanceViewLedger.gui,
      permissions.uiFinanceViewGroups.gui,
      permissions.uiFinanceFundUpdateLogsView.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitLoading,
      });
    });
  });

  after('Clean up', () => {
    cy.getAdminToken();
    AcquisitionUnits.unAssignUserViaApi(membershipAdminId);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(acqUnit.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C688780 User not assigned to Acq unit cannot see batch allocation logs associated with ledger or group with acquisition units (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C688780'] },
    () => {
      Ledgers.searchByName(ledgers[0].name);
      Ledgers.checkNoResultsMessage(
        `No results found for "${ledgers[0].name}". Please check your spelling and filters.`,
      );
      BatchEditBudget.openBatchAllocationLogsFromLedgerList();
      BatchEditBudget.searchLogs(fiscalYear.code, ledgers[0].code);
      BatchEditBudget.verifyNoResultsMessage(`${fiscalYear.code}-${ledgers[0].code}`);
    },
  );
});
