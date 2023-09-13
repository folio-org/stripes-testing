import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';

describe('ui-finance: Funds', () => {
  const defaultfund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
      });
    });
    cy.createTempUser([
      permissions.uiFinanceFinanceViewGroup.gui,
      permissions.uiFinanceCreateAllocations.gui,
      permissions.uiFinanceCreateTransfers.gui,
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiFinanceExportFinanceRecords.gui,
      permissions.uiFinanceManageAcquisitionUnits.gui,
      permissions.uiFinanceManuallyReleaseEncumbrance.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewGroups.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiFinanceViewEditFiscalYear.gui,
      permissions.uiFinanceViewEditFundAndBudget.gui,
      permissions.uiFinanceViewEditGroup.gui,
      permissions.uiFinanceViewEditLedger.gui,
      permissions.uiFinanceViewEditCreateFiscalYear.gui,
      permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      permissions.uiFinanceCreateViewEditGroups.gui,
      permissions.uiFinanceViewEditCreateLedger.gui,
      permissions.uiFinanceViewEditDeleteFiscalYear.gui,
      permissions.uiFinanceViewEditDeletFundBudget.gui,
      permissions.uiFinanceViewEditDeletGroups.gui,
      permissions.uiFinanceViewEditDeleteLedger.gui,
      permissions.uiFinanceAssignAcquisitionUnitsToNewRecord.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    FinanceHelp.searchByName(defaultfund.name);
    Funds.selectFund(defaultfund.name);
    Funds.deleteFundViaActions();
    FinanceHelp.searchByName(defaultfund.name);
    Funds.checkZeroSearchResultsHeader();
    Ledgers.deleteledgerViaApi(defaultLedger.id);

    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    cy.visit(SettingsMenu.acquisitionUnitsPath);
    AcquisitionUnits.unAssignAdmin(defaultAcquisitionUnit.name);
    AcquisitionUnits.delete(defaultAcquisitionUnit.name);

    Users.deleteViaApi(user.userId);
  });

  it(
    'C163928 Test acquisition unit restrictions for Fund records (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInInfo(defaultAcquisitionUnit.name);
      // Need to wait,while data is load
      cy.wait(2000);
      AcquisitionUnits.assignUser(user.username);
      cy.login(user.username, user.password, { path: TopMenu.fundPath, waiter: Funds.waitLoading });
      Funds.createFundWithAU(defaultfund, defaultLedger, defaultAcquisitionUnit.name);
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.unAssignUser(defaultAcquisitionUnit.name);
      cy.login(user.username, user.password, { path: TopMenu.fundPath, waiter: Funds.waitLoading });
      FinanceHelp.searchByName(defaultfund.name);
      Funds.checkZeroSearchResultsHeader();
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.edit(defaultAcquisitionUnit.name);
      AcquisitionUnits.selectViewCheckbox();
      cy.login(user.username, user.password, { path: TopMenu.fundPath, waiter: Funds.waitLoading });
      FinanceHelp.searchByName(defaultfund.name);
      Funds.selectFund(defaultfund.name);
    },
  );
});
