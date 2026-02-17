import Permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Acquisition Units', () => {
  const acquisitionUnit = {
    ...AcquisitionUnits.defaultAcquisitionUnit,
    protectDelete: true,
    protectCreate: true,
    protectUpdate: true,
    protectRead: true,
  };
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
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
    Users.deleteViaApi(user.userId);
  });

  it(
    'C375073 Acquisition unit restrictions for "Fiscal year" records (View, Edit, Create, Delete options are restricted) when user is NOT assigned to acquisition unit (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C375073'] },
    () => {
      FinanceHelp.searchByAll(fiscalYear.name);
      FiscalYears.checkNoResultsMessage(
        `No results found for "${fiscalYear.name}". Please check your spelling and filters.`,
      );
      FiscalYears.resetFilters();
      FiscalYears.openAcquisitionAccordion();
      FiscalYears.selectAcquisitionUnitFilter(acquisitionUnit.name);
      FiscalYears.checkNoResultsMessage('No results found. Please check your filters.');
    },
  );
});
