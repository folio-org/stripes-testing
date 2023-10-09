import devTeams from '../../../../support/dictionary/devTeams';
import TestType from '../../../../support/dictionary/testTypes';
import NewNoticePolicy from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
// TO DO: update test with duplicate and edit methods, after PO will review test case.
describe('ui-circulation-settings: create patron notice policies', () => {
  const noticePolicy = { ...NewNoticePolicy.defaultUi };
  beforeEach('login', () => {
    cy.loginAsAdmin({
      path: SettingsMenu.circulationPatronNoticePoliciesPath,
      waiter: NewNoticePolicy.waitLoading,
    });
  });

  it('C6530 Create notice policy (vega)', { tags: [TestType.smoke, devTeams.vega] }, () => {
    NewNoticePolicy.waitLoading();
    NewNoticePolicy.startAdding();
    NewNoticePolicy.checkInitialState();
    NewNoticePolicy.fillGeneralInformation(noticePolicy);
    NewNoticePolicy.save();
    NewNoticePolicy.checkPolicyName(noticePolicy);
    NewNoticePolicy.choosePolicy(noticePolicy);
    NewNoticePolicy.duplicatePolicy(noticePolicy);
    NewNoticePolicy.deletePolicy(noticePolicy);
    NewNoticePolicy.choosePolicy(noticePolicy);
    NewNoticePolicy.editPolicy(noticePolicy);
    NewNoticePolicy.save(noticePolicy);
    NewNoticePolicy.checkPolicyName(noticePolicy);
    NewNoticePolicy.choosePolicy(noticePolicy);
    NewNoticePolicy.deletePolicy(noticePolicy);
  });
});
