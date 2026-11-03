import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import { FUND_DETAILS_FIELDS } from '../../../support/constants/finance/fund';
import { Budgets } from '../../../support/fragments/finance';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';
import FundEditForm from '../../../support/fragments/finance/funds/fundEditForm';
import Funds from '../../../support/fragments/finance/funds/funds';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Funds', () => {
    const testData = {
      acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit(),
      user: {},
      membershipId: null,
    };

    before(() => {
      cy.getAdminToken().then(() => {
        const { fiscalYear, ledger, fund, budget } =
          Budgets.createBudgetWithFundLedgerAndFYViaApi();
        testData.fiscalYear = fiscalYear;
        testData.ledger = ledger;
        testData.fund = fund;
        testData.budget = budget;

        AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then(() => {
          cy.createTempUser([
            Permissions.uiFinanceViewEditCreateFundAndBudget.gui,
            Permissions.uiFinanceManageAcquisitionUnits.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            AcquisitionUnits.assignUserViaApi(userProperties.userId, testData.acqUnit.id).then(
              (membershipId) => {
                testData.membershipId = membershipId;

                cy.login(userProperties.username, userProperties.password, {
                  path: TopMenu.fundPath,
                  waiter: Funds.waitLoading,
                });
              },
            );
          });
        });
      });
    });

    after(() => {
      cy.getAdminToken().then(() => {
        AcquisitionUnits.unAssignUserViaApi(testData.membershipId);
        AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id);
        Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budget);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C1045984 Finance: Manage acquisition units (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C1045984'] },
      () => {
        // Search for the fund and assign acquisition unit
        Funds.searchByName(testData.fund.name);
        Funds.selectFund(testData.fund.name);
        FundDetails.openFundEditForm();
        FundEditForm.fillFundInfoSectionFields({ acqUnits: [testData.acqUnit.name] });
        Funds.save();
        Funds.verifyFundIsSaved();

        // Check edited fund details
        FundDetails.waitLoading();
        FundDetails.checkFundDetails({
          information: [
            { key: FUND_DETAILS_FIELDS.ACQUISITION_UNITS, value: testData.acqUnit.name },
            { key: FUND_DETAILS_FIELDS.DESCRIPTION, value: testData.fund.description },
          ],
        });

        // Create a new fund and check acquisition unit selection is disabled
        Funds.newFund();
        FundEditForm.waitLoading();
        Funds.verifyAcqUnitSelectionDisabled();
      },
    );
  });
});
