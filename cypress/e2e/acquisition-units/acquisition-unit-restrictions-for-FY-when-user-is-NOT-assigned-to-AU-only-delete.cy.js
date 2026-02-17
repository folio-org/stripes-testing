import Permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYearDetails from '../../support/fragments/finance/fiscalYears/fiscalYearDetails';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Acquisition Units', () => {
  const acquisitionUnit = {
    ...AcquisitionUnits.defaultAcquisitionUnit,
    protectDelete: true,
    protectUpdate: false,
    protectCreate: false,
  };
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const newFiscalYear = {
    name: `FYA2023_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodBeginDate: DateTools.getCurrentDateForFiscalYear(),
    periodEndDate: DateTools.getDayAfterTomorrowDateForFiscalYear(),
  };
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(fiscalYear).then((fiscalYearResponse) => {
      fiscalYear.id = fiscalYearResponse.id;

      AcquisitionUnits.createAcquisitionUnitViaApi(acquisitionUnit).then((acqUnitResponse) => {
        acquisitionUnit.id = acqUnitResponse.id;

        FiscalYears.updateFiscalYearViaApi({
          ...fiscalYearResponse,
          acqUnitIds: [acquisitionUnit.id],
        });
      });
    });

    cy.createTempUser([
      Permissions.uiFinanceAssignAcquisitionUnitsToNewRecord.gui,
      Permissions.uiFinanceManageAcquisitionUnits.gui,
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
      Permissions.uiFinanceExportFinanceRecords.gui,
      Permissions.uiFinanceExecuteFiscalYearRollover.gui,
      Permissions.uiFinanceCreateTransfers.gui,
      Permissions.uiFinanceCreateAllocations.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.fiscalYearPath,
        waiter: FiscalYears.waitForFiscalYearDetailsLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    AcquisitionUnits.deleteAcquisitionUnitViaApi(acquisitionUnit.id);
    FiscalYears.deleteFiscalYearViaApi(fiscalYear.id);
    FiscalYears.deleteFiscalYearViaApi(newFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C375080 Acquisition unit restrictions for "Fiscal year" records (only Delete option is active) when user is NOT assigned to acquisition unit (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C375080'] },
    () => {
      FinanceHelp.searchByAll(fiscalYear.name);
      FiscalYears.selectFisacalYear(fiscalYear.name);
      FiscalYearDetails.checkFiscalYearDetails({
        information: [{ key: 'Acquisition units', value: acquisitionUnit.name }],
      });
      FiscalYears.clickActionsButtonInFY();
      FiscalYears.checkDeleteButtonIsDisabled();
      FiscalYears.clickActionsButtonInFY();
      FiscalYears.editFiscalYearDetails();
      FiscalYears.editDescription();
      FiscalYears.clickSaveAndClose();
      cy.wait(1000);
      InteractorsTools.checkCalloutMessage('Fiscal year has been saved');
      FiscalYears.closeThirdPane();
      FiscalYears.clickNewFY();
      FiscalYears.createFiscalYearWithAllFields(newFiscalYear, acquisitionUnit.name);
      FiscalYears.clickSaveAndClose();
      cy.wait(1000);
      InteractorsTools.checkCalloutMessage('Fiscal year has been saved');
      FiscalYears.waitForFiscalYearDetailsLoading();
      FiscalYears.getFiscalYearIdByName(newFiscalYear.name).then((fiscalYearId) => {
        newFiscalYear.id = fiscalYearId;
      });
      FiscalYears.clickActionsButtonInFY();
      FiscalYears.checkDeleteButtonIsDisabled();
    },
  );
});
