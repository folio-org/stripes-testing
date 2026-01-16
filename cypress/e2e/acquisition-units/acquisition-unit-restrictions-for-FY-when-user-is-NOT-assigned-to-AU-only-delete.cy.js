import Permissions from '../../support/dictionary/permissions';
import FiscalYearDetails from '../../support/fragments/finance/fiscalYears/fiscalYearDetails';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

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
    ]).then((userProperties) => {
      user = userProperties;

      cy.getAdminUserDetails().then((adminUser) => {
        defaultAcquisitionUnit.protectDelete = true;
        defaultAcquisitionUnit.protectUpdate = false;
        defaultAcquisitionUnit.protectCreate = false;
        AcquisitionUnits.createAcquisitionUnitViaApi(defaultAcquisitionUnit)
          .then((acqUnitResponse) => {
            defaultAcquisitionUnit.id = acqUnitResponse.id;
            return AcquisitionUnits.assignUserViaApi(adminUser.id, defaultAcquisitionUnit.id);
          })
          .then(() => {
            FiscalYears.createViaApi({
              ...defaultFiscalYear,
              acqUnitIds: [defaultAcquisitionUnit.id],
            }).then((firstFiscalYearResponse) => {
              defaultFiscalYear.id = firstFiscalYearResponse.id;
            });
          })
          .then(() => {
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.fiscalYearPath,
              waiter: FiscalYears.waitForFiscalYearDetailsLoading,
            });
          });
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
      FiscalYears.selectFisacalYear(defaultFiscalYear.name);
      FiscalYearDetails.checkFiscalYearDetails({
        information: [{ key: 'Acquisition units', value: defaultAcquisitionUnit.name }],
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
      FiscalYears.createFiscalYearWithAllFields(newFiscalYear, defaultAcquisitionUnit.name);
      FiscalYears.clickSaveAndClose();
      cy.wait(1000);
      InteractorsTools.checkCalloutMessage('Fiscal year has been saved');
      FiscalYears.waitForFiscalYearDetailsLoading();
      FiscalYears.getFiscalYearIdByName(newFiscalYear.name).then((fiscalYearId) => {
        createdFiscalYearId = fiscalYearId;
      });
      FiscalYears.clickActionsButtonInFY();
      FiscalYears.checkDeleteButtonIsDisabled();
    },
  );
});
