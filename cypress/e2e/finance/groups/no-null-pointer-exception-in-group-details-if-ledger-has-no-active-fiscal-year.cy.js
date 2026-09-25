import { COMMON_BUTTON_LABELS, FISCAL_YEARS_VIEW_FIELDS } from '../../../support/constants';
import { GROUP_VIEW_FIELDS } from '../../../support/constants/finance/group';
import Permissions from '../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYearDetails,
  FiscalYears,
  Funds,
  GroupDetails,
  Groups,
} from '../../../support/fragments/finance';
import DateTools from '../../../support/utils/dateTools';
import InteractorsTools from '../../../support/utils/interactorsTools';
import States from '../../../support/fragments/finance/states';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Groups', () => {
    const testData = {
      fiscalYear: {},
      group: {},
      fund: {},
      user: {},
    };

    const createGroup = () => {
      return Groups.createViaApi(Groups.getDefaultGroup()).then((group) => {
        testData.group = group;
      });
    };

    const createBudgetWithFundLedgerAndFiscalYear = () => {
      const { fiscalYear, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        fiscalYear: { ...DateTools.getFullFiscalYearStartAndEnd(0) },
        budget: { allocated: 100 },
      });

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
    };

    const addFundToGroup = () => {
      return Funds.getFundsViaApi({ query: `id=="${testData.fund.id}"` }).then(({ funds }) => {
        return Funds.updateFundViaApi(funds[0], [testData.group.id]);
      });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceViewEditFiscalYear.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiFinanceViewGroups.gui,
          Permissions.uiFinanceViewLedger.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.fiscalYearPath,
            waiter: FiscalYears.waitLoading,
          });
          FinanceHelper.searchByName(testData.fiscalYear.name);
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();

      createGroup()
        .then(createBudgetWithFundLedgerAndFiscalYear)
        .then(addFundToGroup)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C378889 No "Null pointer exception" error in Group Details if a Ledger does not have an active fiscal year (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C378889'] },
      () => {
        // Step 1: Open "Fiscal year #1" details
        FiscalYears.selectFiscalYear(testData.fiscalYear.name);

        // Step 2: Open "Edit fiscal year" form
        FiscalYears.editFiscalYearDetails();
        FiscalYears.checkButtonsConditions([
          { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
        ]);

        // Steps 3-4: Move the fiscal year period to the previous year and save
        const previousYear = new Date().getFullYear() - 1;

        FiscalYears.fillTheStartAndEndDateOnCalenderStartDateField(
          `01/01/${previousYear}`,
          `12/31/${previousYear}`,
        );
        InteractorsTools.checkCalloutMessage(States.fiscalYearSavedSuccessfully);
        FiscalYearDetails.checkFiscalYearDetails({
          information: [
            {
              key: FISCAL_YEARS_VIEW_FIELDS.PERIOD_END_DATE,
              value: `12/31/${previousYear}, 12:00 AM`,
            },
          ],
        });

        // Steps 5-7: Open the group of the ledger without an active fiscal year
        FinanceHelper.selectGroupsNavigation();
        Groups.waitLoading();
        Groups.searchByName(testData.group.name);
        Groups.selectGroupByName(testData.group.name);
        GroupDetails.verifyGroupName(testData.group.name);
        InteractorsTools.checkNoErrorCallouts();

        // Step 8: "Fiscal year #1" is listed as a previous fiscal year
        GroupDetails.checkInformation([
          { key: GROUP_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
        ]);
        GroupDetails.checkFiscalYearDropdownOptions({
          current: [],
          previous: [testData.fiscalYear.code],
        });
      },
    );
  });
});
