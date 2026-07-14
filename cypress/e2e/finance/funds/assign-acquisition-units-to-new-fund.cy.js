import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import { FUND_DETAILS_FIELDS } from '../../../support/constants/finance/fund';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';
import FundEditForm from '../../../support/fragments/finance/funds/fundEditForm';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Funds', () => {
    const testData = {
      fiscalYear: { ...FiscalYears.defaultUiFiscalYear },
      ledger: { ...Ledgers.defaultUiLedger },
      fund: { ...Funds.defaultUiFund },
      acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit(),
      user: {},
      membershipId: null,
    };

    before(() => {
      cy.getAdminToken().then(() => {
        FiscalYears.createViaApi(testData.fiscalYear).then((fiscalYearResponse) => {
          testData.fiscalYear.id = fiscalYearResponse.id;
          testData.ledger.fiscalYearOneId = fiscalYearResponse.id;

          Ledgers.createViaApi(testData.ledger).then((ledgerResponse) => {
            testData.ledger.id = ledgerResponse.id;

            AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then(() => {
              cy.createTempUser([
                Permissions.uiFinanceViewEditCreateFundAndBudget.gui,
                Permissions.uiFinanceAssignAcquisitionUnitsToNewRecord.gui,
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
      });
    });

    after(() => {
      cy.getAdminToken().then(() => {
        AcquisitionUnits.unAssignUserViaApi(testData.membershipId);
        AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id);
        Funds.deleteFundViaApi(testData.fund.id, false);
        Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
        FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id, false);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C1045983 Finance: Assign acquisition units to new record (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C1045983'] },
      () => {
        // Create a new fund with acquisition unit
        Funds.newFund();
        FundEditForm.waitLoading();
        FundEditForm.fillFundInfoSectionFields({
          name: testData.fund.name,
          code: testData.fund.code,
          externalAccountNo: testData.fund.externalAccountNo,
          ledger: testData.ledger.name,
          acqUnits: [testData.acqUnit.name],
        });
        Funds.save();
        Funds.verifyFundIsSaved();

        // Capture fund id from url
        cy.url().then((url) => {
          testData.fund.id = url.match(/fund\/view\/([^/]+)/)?.[1] || null;
        });

        // Check created fund details
        FundDetails.waitLoading();
        FundDetails.checkInformation([
          { key: FUND_DETAILS_FIELDS.NAME, value: testData.fund.name },
          { key: FUND_DETAILS_FIELDS.CODE, value: testData.fund.code },
          { key: FUND_DETAILS_FIELDS.LEDGER, value: testData.ledger.name },
          { key: FUND_DETAILS_FIELDS.STATUS, value: testData.fund.fundStatus },
          { key: FUND_DETAILS_FIELDS.ACQUISITION_UNITS, value: testData.acqUnit.name },
          { key: FUND_DETAILS_FIELDS.EXTERNAL_ACCOUNT_NO, value: testData.fund.externalAccountNo },
        ]);

        // Edit fund and check acquisition unit selection is disabled
        FundDetails.openFundEditForm();
        Funds.verifyAcqUnitSelectionDisabled();
        Funds.verifyAcqUnitSelected(testData.acqUnit.name);
      },
    );
  });
});
