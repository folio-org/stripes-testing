import TestType from '../../../../support/dictionary/testTypes';
import NewNoticePolicy from '../../../../support/fragments/circulation/newNoticePolicy';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
// TO DO: update test with duplicate and edit methods, after PO will review test case.
describe('ui-circulation-settings: create patron notice policies', () => {
  const noticePolicy = { ...NewNoticePolicy.defaultUi };
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(`${SettingsMenu.circulationPatronNoticePoliciesPath}`);
  });

  it('C6530 Create notice policy', { tags: [TestType.smoke] }, () => {
    try {
      NewNoticePolicy.waitLoading();
      NewNoticePolicy.startAdding();
      NewNoticePolicy.checInitialState();
      NewNoticePolicy.fillGeneralInformation(noticePolicy);
      NewNoticePolicy.save();
      NewNoticePolicy.check(noticePolicy);
      NewNoticePolicy.choosePolicy(noticePolicy);
      NewNoticePolicy.duplicatePolicy(noticePolicy);
      NewNoticePolicy.deletePolicy(noticePolicy);
      NewNoticePolicy.choosePolicy(noticePolicy);
      NewNoticePolicy.editPolicy(noticePolicy);
      NewNoticePolicy.save(noticePolicy);
      NewNoticePolicy.check(noticePolicy);
      NewNoticePolicy.choosePolicy(noticePolicy);
      NewNoticePolicy.deletePolicy(noticePolicy);
    } catch (error) { console.log(error); }
  });
});
