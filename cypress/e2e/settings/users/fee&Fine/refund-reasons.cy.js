import getRandomPostfix from '../../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../../support/dictionary';
import DateTools from '../../../../support/utils/dateTools';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import RefundReasons from '../../../../support/fragments/settings/users/refundReasons';

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
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
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
