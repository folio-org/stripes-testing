import NewNoticePolicy from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
// TO DO: update test with duplicate and edit methods, after PO will review test case.
describe('Settings (Notices)', () => {
  const noticePolicy = { ...NewNoticePolicy.defaultUi };
  beforeEach('login', () => {
    cy.loginAsAdmin({
      path: SettingsMenu.circulationPatronNoticePoliciesPath,
      waiter: NewNoticePolicy.waitLoading,
    });
  });

  it('C6530 Create notice policy (volaris)', { tags: ['smoke', 'volaris', 'system'] }, () => {
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
