import Permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

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
      Permissions.uiFinanceAssignAcquisitionUnitsToNewRecord.gui,
      Permissions.uiSettingsFinanceViewEditCreateDelete.gui,
      Permissions.uiFinanceViewEditDeleteLedger.gui,
      Permissions.uiFinanceViewEditDeleteGroups.gui,
      Permissions.uiFinanceViewEditDeleteFundBudget.gui,
      Permissions.uiFinanceViewEditDeleteFiscalYear.gui,
      Permissions.uiFinanceViewEditCreateLedger.gui,
      Permissions.uiFinanceCreateViewEditGroups.gui,
      Permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      Permissions.uiFinanceViewEditCreateFiscalYear.gui,
      Permissions.uiFinanceViewEditLedger.gui,
      Permissions.uiFinanceViewEditFundAndBudget.gui,
      Permissions.uiFinanceViewEditFiscalYear.gui,
      Permissions.uiFinanceViewLedger.gui,
      Permissions.uiFinanceViewGroups.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiFinanceViewFiscalYear.gui,
      Permissions.uiFinanceManuallyReleaseEncumbrance.gui,
      Permissions.uiFinanceManageAcquisitionUnits.gui,
      Permissions.uiFinanceExportFinanceRecords.gui,
      Permissions.uiFinanceExecuteFiscalYearRollover.gui,
      Permissions.uiFinanceCreateTransfers.gui,
      Permissions.uiFinanceCreateAllocations.gui,
      Permissions.uiFinanceFinanceViewGroup.gui,
    ]).then((userProperties) => {
      user = userProperties;

      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInAUInfo(defaultAcquisitionUnit.name);
      AcquisitionUnits.assignAdmin();
      AcquisitionUnits.editAU();
      AcquisitionUnits.selectViewCheckbox();
      AcquisitionUnits.editAU();
      AcquisitionUnits.selectEditCheckbox();

      cy.visit(TopMenu.fiscalYearPath);
      FinanceHelp.searchByAll(defaultFiscalYear.name);
      FiscalYears.selectFisacalYear(defaultFiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.assignAU(defaultAcquisitionUnit.name);
      FiscalYears.closeThirdPane();
      FiscalYears.resetFilters();
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.fiscalYearPath,
        waiter: FiscalYears.waitForFiscalYearDetailsLoading,
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
    'C375079 Acquisition unit restrictions for "Fiscal year" records (Create, Delete options are active) when user is NOT assigned to acquisition unit (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C375079'] },
    () => {
      FinanceHelp.searchByAll(defaultFiscalYear.name);
      FiscalYears.selectFisacalYear(defaultFiscalYear.name);
      FiscalYears.clickActionsButtonInFY();
      FiscalYears.checkDeleteButtonIsDisabled();
      FiscalYears.clickActionsButtonInFY();
      FiscalYears.editFiscalYearDetails();
      FiscalYears.editDescription();
      FiscalYears.clickNewFY();
      FiscalYears.checkAcquisitionUnitIsAbsentToAssign(defaultAcquisitionUnit.name);
    },
  );
});
