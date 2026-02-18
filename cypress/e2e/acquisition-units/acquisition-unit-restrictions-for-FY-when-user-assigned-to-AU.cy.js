import Permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Acquisition Units', () => {
  let user;
  let membershipUserId;
  const acquisitionUnit = {
    ...AcquisitionUnits.defaultAcquisitionUnit,
    protectDelete: true,
    protectUpdate: true,
    protectCreate: true,
    protectRead: true,
  };
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `new_autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(9000, 9999),
    periodBeginDate: DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit(),
    periodEndDate: DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit(),
  };

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;

      AcquisitionUnits.createAcquisitionUnitViaApi(acquisitionUnit).then((acqUnitResponse) => {
        acquisitionUnit.id = acqUnitResponse.id;

        FiscalYears.updateFiscalYearViaApi({
          ...firstFiscalYearResponse,
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

      AcquisitionUnits.assignUserViaApi(userProperties.userId, acquisitionUnit.id).then((id) => {
        membershipUserId = id;
      });

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.fiscalYearPath,
        waiter: FiscalYears.waitForFiscalYearDetailsLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    AcquisitionUnits.unAssignUserViaApi(membershipUserId);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(acquisitionUnit.id);
    FiscalYears.getFiscalYearIdByName(secondFiscalYear.name).then((id) => {
      FiscalYears.deleteFiscalYearViaApi(id);
    });
    Users.deleteViaApi(user.userId);
  });

  it(
    'C374168 Acquisition unit restrictions for "Fiscal year" records (View, Edit, Create, Delete options are active) when user is assigned to acquisition unit (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C374168'] },
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
