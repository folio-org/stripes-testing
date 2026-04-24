import FiscalYearDetails from '../../../../support/fragments/finance/fiscalYears/fiscalYearDetails';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import AcquisitionUnits from '../../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../../../support/fragments/topMenu';
import DateTools from '../../../../support/utils/dateTools';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Acquisition Units', () => {
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const newFiscalYear = {
    name: `FYA2023_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodBeginDate: DateTools.getCurrentDateForFiscalYear(),
    periodEndDate: DateTools.getDayAfterTomorrowDateForFiscalYear(),
  };
  let createdFiscalYearId;

  before(() => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });

    defaultAcquisitionUnit.protectDelete = true;
    defaultAcquisitionUnit.protectUpdate = false;
    defaultAcquisitionUnit.protectCreate = false;
    AcquisitionUnits.createAcquisitionUnitViaApi(defaultAcquisitionUnit)
      .then((acqUnitResponse) => {
        defaultAcquisitionUnit.id = acqUnitResponse.id;
      })
      .then(() => {
        FiscalYears.createViaApi({
          ...defaultFiscalYear,
          acqUnitIds: [defaultAcquisitionUnit.id],
        }).then((firstFiscalYearResponse) => {
          defaultFiscalYear.id = firstFiscalYearResponse.id;
        });
      });

    cy.allure().logCommandSteps(false);
    cy.login(user.username, user.password, {
      path: TopMenu.fiscalYearPath,
      waiter: FiscalYears.waitForFiscalYearDetailsLoading,
    });
    cy.allure().logCommandSteps(true);
  });

  after(() => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    if (createdFiscalYearId) {
      FiscalYears.deleteFiscalYearViaApi(createdFiscalYearId);
    }
    AcquisitionUnits.deleteAcquisitionUnitViaApi(defaultAcquisitionUnit.id);
  });

  it(
    'C375080 Acquisition unit restrictions for "Fiscal year" records (only Delete option is active) when user is NOT assigned to acquisition unit (thunderjet)',
    { tags: ['dryRun', 'thunderjet', 'C375080'] },
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
