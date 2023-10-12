import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import getRandomPostfix from '../../support/utils/stringTools';
import DateTools from '../../support/utils/dateTools';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../support/fragments/topMenu';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import SettingsMenu from '../../support/fragments/settingsMenu';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import Users from '../../support/fragments/users/users';

describe('Acquisition Units', () => {
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `new_autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(9000, 9999),
    periodBeginDate: DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit(),
    periodEndDate: DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit(),
  };
  let user;

  before(() => {
    cy.getAdminToken();
    cy.loginAsAdmin({
      path: SettingsMenu.acquisitionUnitsPath,
      waiter: AcquisitionUnits.waitLoading,
    });
    cy.createTempUser([
      permissions.uiFinanceAssignAcquisitionUnitsToNewRecord.gui,
      permissions.uiSettingsFinanceViewEditCreateDeleter.gui,
      permissions.uiFinanceViewEditDeleteLedger.gui,
      permissions.uiFinanceViewEditDeletGroups.gui,
      permissions.uiFinanceViewEditDeletFundBudget.gui,
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
      FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
        firstFiscalYear.id = firstFiscalYearResponse.id;
      });

      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInAUInfo(defaultAcquisitionUnit.name);
      AcquisitionUnits.assignUser(user.username);

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.fiscalYearPath,
        waiter: FiscalYears.waitForFiscalYearDetailsLoading,
      });
      FinanceHelp.searchByAll(firstFiscalYear.name);
      FiscalYears.selectFisacalYear(firstFiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.assignAU(defaultAcquisitionUnit.name);
      FiscalYears.closeThirdPane();
      FiscalYears.resetFilters();
    });
  });

  after(() => {
    cy.loginAsAdmin({
      path: SettingsMenu.acquisitionUnitsPath,
      waiter: AcquisitionUnits.waitLoading,
    });
    AcquisitionUnits.unAssignAdmin(defaultAcquisitionUnit.name);
    AcquisitionUnits.delete(defaultAcquisitionUnit.name);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C374168 Acquisition unit restrictions for "Fiscal year" records (View, Edit, Create, Delete options are active) when user is assigned to acquisition unit (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      FinanceHelp.searchByAll(firstFiscalYear.name);
      FiscalYears.selectFisacalYear(firstFiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.editDescription();
      FiscalYears.deleteFiscalYearViaActions();
      FiscalYears.createDefaultFiscalYear(secondFiscalYear);
      FiscalYears.closeThirdPane();
      FiscalYears.resetFilters();
      FinanceHelp.searchByAll(secondFiscalYear.name);
      FiscalYears.selectFisacalYear(secondFiscalYear.name);
      FiscalYears.deleteFiscalYearViaActions();
    },
  );
});
