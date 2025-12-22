import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import FiscalYearDetails from '../../support/fragments/finance/fiscalYears/fiscalYearDetails';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import DateTools from '../../support/utils/dateTools';
import InteractorsTools from '../../support/utils/interactorsTools';

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
