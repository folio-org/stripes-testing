import RefundReasons from '../../../../support/fragments/settings/users/refundReasons';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Settings Users', () => {
  const refundReason = {
    name: `C447 autotest.${getRandomPostfix()}`,
    description: 'test',
  };

  const refundReasonUpdated = {
    name: `C447 updated autotest.${getRandomPostfix()}`,
    description: 'updated test',
    date: DateTools.getCurrentDate(),
  };

  before('Create test data', () => {
    cy.getAdminToken();
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.refundReasons);
  });

  it(
    'C447 Verify that you can create/edit/delete refund reasons (vega) (TaaS)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      RefundReasons.createViaUi(refundReason);
      RefundReasons.verifyRefundReasonRecord(refundReason);
      RefundReasons.editViaUi(refundReason, refundReasonUpdated);
      RefundReasons.verifyRefundReasonRecord(refundReasonUpdated);
      RefundReasons.clickAddNewButton();
      RefundReasons.fillInFields(refundReasonUpdated);
      RefundReasons.verifySaveButtonDisabled();
      RefundReasons.checkReasonValidatorMessage();
      RefundReasons.clickCancelButton();
      RefundReasons.deleteViaUi(refundReasonUpdated);
    },
  );
});
