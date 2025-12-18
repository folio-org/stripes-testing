import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import DateTools from '../../support/utils/dateTools';

describe('Acquisition Units', () => {
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const newFiscalYear = {
    name: `FYA2023_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodBeginDate: DateTools.getCurrentDateForFiscalYear(),
    periodEndDate: DateTools.getDayAfterTomorrowDateForFiscalYear(),
  };
  let user;
  let createdFiscalYearId;

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
    ]).then((userProperties) => {
      user = userProperties;

      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInAUInfoWithDeleteOnly(defaultAcquisitionUnit.name);
      AcquisitionUnits.assignAdmin();

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
    if (createdFiscalYearId) {
      FiscalYears.deleteFiscalYearViaApi(createdFiscalYearId);
    }
    AcquisitionUnits.unAssignAdmin(defaultAcquisitionUnit.name);
    AcquisitionUnits.delete(defaultAcquisitionUnit.name);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C375080 Acquisition unit restrictions for "Fiscal year" records (only Delete option is active) when user is NOT assigned to acquisition unit (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C375080'] },
    () => {
      FinanceHelp.searchByAll(defaultFiscalYear.name);
      FiscalYears.expectFY(defaultFiscalYear.name);
      FiscalYears.selectFisacalYear(defaultFiscalYear.name);
      FiscalYears.verifyAcquisitionUnitIsDisplayed(defaultAcquisitionUnit.name);
      FiscalYears.clickActionsButtonInFY();
      FiscalYears.checkDeleteButtonIsDisabled();
      FiscalYears.clickActionsButtonInFY();
      FiscalYears.editFiscalYearDetails();
      FiscalYears.checkSaveButtonIsDisabled();
      const descriptionText = `Edited_by_test_${getRandomPostfix()}`;
      FiscalYears.editDescription(descriptionText);
      FiscalYears.checkSaveButtonIsEnabled();
      FiscalYears.clickSaveAndClose();
      FiscalYears.verifySuccessMessage();
      FiscalYears.closeThirdPane();
      FiscalYears.clickNewFY();
      FiscalYears.createFiscalYearWithAllFields(newFiscalYear, defaultAcquisitionUnit.name);
      FiscalYears.checkSaveButtonIsEnabled();
      FiscalYears.clickSaveAndClose();
      FiscalYears.verifySuccessMessage();
      FiscalYears.waitForFiscalYearDetailsLoading();
      FiscalYears.getFiscalYearIdByName(newFiscalYear.name).then((fiscalYearId) => {
        createdFiscalYearId = fiscalYearId;
      });
      FiscalYears.clickActionsButtonInFY();
      FiscalYears.checkDeleteButtonIsDisabled();
    },
  );
});
