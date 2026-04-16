import { Permissions } from '../../support/dictionary';
import { FiscalYears } from '../../support/fragments/finance';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  DateTools,
  ExecutionFlowManager,
} from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';

/* Resource keys */
const R = {
  ACQUISITION_UNIT: 'acquisitionUnit',
  INITIAL_FISCAL_YEAR: 'initialFiscalYear',
  MEMBERSHIP_USER_ID: 'membershipUserId',
  USER_PROPERTIES: 'userProperties',
};

function getPreconditionSteps() {
  const createAcquisitionUnitWithAllRestrictions = (flow) => {
    AcquisitionUnits
      .createAcquisitionUnitViaApi({
        ...AcquisitionUnits.defaultAcquisitionUnit,
        protectDelete: true,
        protectUpdate: true,
        protectCreate: true,
        protectRead: true,
      })
      .then((acqUnitResponse) => flow.set(
        R.ACQUISITION_UNIT,
        acqUnitResponse,
        () => AcquisitionUnits.deleteAcquisitionUnitViaApi(acqUnitResponse.id),
      ));
  };

  const createUserWithPermissions = (flow) => {
    cy
      .createTempUser([
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
      ])
      .then((userProperties) => flow.set(
        R.USER_PROPERTIES,
        userProperties,
        () => Users.deleteViaApi(userProperties.userId),
      ));
  };

  const assignUserToAcquisitionUnit = (flow) => {
    const userProperties = flow.get(R.USER_PROPERTIES);
    const acquisitionUnit = flow.get(R.ACQUISITION_UNIT);

    AcquisitionUnits
      .assignUserViaApi(userProperties.userId, acquisitionUnit.id)
      .then((id) => flow.set(
        R.MEMBERSHIP_USER_ID,
        id,
        () => AcquisitionUnits.unAssignUserViaApi(id),
      ));
  };

  const createActiveFiscalYear = (flow) => {
    FiscalYears
      .createViaApi({
        ...FiscalYears.defaultUiFiscalYear,
        acqUnitIds: [flow.get(R.ACQUISITION_UNIT).id],
      })
      .then((fiscalYear) => flow.set(R.INITIAL_FISCAL_YEAR, fiscalYear)); // No need to delete fiscal year via API, as it will be deleted via UI in the test
  };

  const loginAndNavigateToFinance = (flow) => {
    const userProperties = flow.get(R.USER_PROPERTIES);

    cy.login(userProperties.username, userProperties.password, {
      path: TopMenu.fiscalYearPath,
      waiter: FiscalYears.waitForFiscalYearDetailsLoading,
    });
  };

  return {
    assignUserToAcquisitionUnit,
    createActiveFiscalYear,
    createAcquisitionUnitWithAllRestrictions,
    createUserWithPermissions,
    loginAndNavigateToFinance,
  };
}

describe('Acquisition Units', () => {
  const flow = new ExecutionFlowManager();

  const fiscalYearToCreate = {
    name: `new_autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(9000, 9999),
    periodBeginDate: DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit(),
    periodEndDate: DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit(),
  };

  before(() => {
    cy.getAdminToken();

    const steps = getPreconditionSteps();

    flow
      .step(steps.createAcquisitionUnitWithAllRestrictions) // Precondition #1
      .step(steps.createUserWithPermissions) // Precondition #2
      .step(steps.assignUserToAcquisitionUnit) // Precondition #3
      .step(steps.createActiveFiscalYear) // Precondition #4-5
      .step(steps.loginAndNavigateToFinance); // Precondition #6
  });

  after(() => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C374168 Acquisition unit restrictions for "Fiscal year" records (View, Edit, Create, Delete options are active) when user is assigned to acquisition unit (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C374168'] },
    () => {
      const {
        acquisitionUnit,
        initialFiscalYear,
      } = flow.ctx();

      FinanceHelp.searchByAll(initialFiscalYear.name);
      FiscalYears.selectFiscalYear(initialFiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.editDescription();
      FiscalYears.deleteFiscalYearViaActions();
      FiscalYears.createDefaultFiscalYear(fiscalYearToCreate);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.assignAU(acquisitionUnit.name);
      FiscalYears.closeThirdPane();
      FiscalYears.resetFilters();
      FinanceHelp.searchByAll(fiscalYearToCreate.name);
      FiscalYears.selectFiscalYear(fiscalYearToCreate.name);
      FiscalYears.deleteFiscalYearViaActions();
    },
  );
});
