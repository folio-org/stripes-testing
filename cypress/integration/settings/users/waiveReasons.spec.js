import TestType from '../../../support/dictionary/testTypes';
import Features from '../../../support/dictionary/features';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Conditions from '../../../support/fragments/settings/users/conditions';
import Condition from '../../../support/fragments/settings/users/condition';
import waiveReasons from '../../../support/fragments/settings/users/waiveReasons';

describe('Management of waive reasons', () => {
  beforeEach(() => {
    cy.loginAsAdmin({ path: SettingsMenu.waiveReasons, waiter: waiveReasons.waitLoading });
  });

  it('C446 Verify that you can create/edit/delete waive reasons', { tags: [TestType.smoke, Features.waiveReasons] }, () => {
  });
});
