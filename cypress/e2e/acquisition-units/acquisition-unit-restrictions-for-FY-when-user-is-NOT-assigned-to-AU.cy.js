import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';

describe('Acquisition Units', () => {
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  let user;

  before(() => {
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      cy.reload();
      AcquisitionUnits.waitLoading();
    }, 20_000);
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
    });
    cy.createTempUser([
      permissions.uiFinanceAssignAcquisitionUnitsToNewRecord.gui,
      permissions.uiSettingsFinanceViewEditCreateDelete.gui,
      permissions.uiFinanceViewEditDeleteLedger.gui,
      permissions.uiFinanceViewEditDeleteGroups.gui,
      permissions.uiFinanceViewEditDeleteFundBudget.gui,
      permissions.uiFinanceViewEditDeleteFiscalYear.gui,
      permissions.uiFinanceViewEditCreateLedger.gui,
      permissions.uiFinanceCreateViewEditGroups.gui,
      permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      permissions.uiFinanceViewEditCreateFiscalYear.gui,
      permissions.uiFinanceViewEditLedger.gui,
      permissions.uiFinanceViewEditFundAndBudget.gui,
      permissions.uiFinanceViewEditFiscalYear.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiFinanceViewGroups.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceManuallyReleaseEncumbrance.gui,
      permissions.uiFinanceManageAcquisitionUnits.gui,
      permissions.uiFinanceExportFinanceRecords.gui,
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiFinanceCreateTransfers.gui,
      permissions.uiFinanceCreateAllocations.gui,
      permissions.uiFinanceFinanceViewGroup.gui,
    ]).then((userProperties) => {
      user = userProperties;
      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInAUInfo(defaultAcquisitionUnit.name);
      AcquisitionUnits.assignAdmin();

      cy.visit(TopMenu.fiscalYearPath);
      FinanceHelp.searchByAll(defaultFiscalYear.name);
      FiscalYears.selectFisacalYear(defaultFiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.assignAU(defaultAcquisitionUnit.name);
      FiscalYears.closeThirdPane();
      FiscalYears.resetFilters();
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.financePath,
        waiter: Ledgers.waitLoading,
        authRefresh: true,
      });
    });
  });

  after(() => {
    cy.loginAsAdmin({
      path: SettingsMenu.acquisitionUnitsPath,
      waiter: AcquisitionUnits.waitLoading,
    });
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    AcquisitionUnits.unAssignAdmin(defaultAcquisitionUnit.name);
    AcquisitionUnits.delete(defaultAcquisitionUnit.name);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C375073 Acquisition unit restrictions for "Fiscal year" records (Edit, Create, Delete options are active) when user is NOT assigned to acquisition unit (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C375073'] },
    () => {
      FinanceHelp.clickFiscalYearButton();
      FinanceHelp.searchByAll(defaultFiscalYear.name);
      FiscalYears.checkNoResultsMessage(
        `No results found for "${defaultFiscalYear.name}". Please check your spelling and filters.`,
      );
      FiscalYears.resetFilters();
      FiscalYears.openAcquisitionAccordion();
      FiscalYears.selectAcquisitionUnitFilter(defaultAcquisitionUnit.name);
      FiscalYears.checkNoResultsMessage('No results found. Please check your filters.');
    },
  );
});
