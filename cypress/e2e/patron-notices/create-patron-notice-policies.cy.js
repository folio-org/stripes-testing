import NewNoticePolicy from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import SettingsMenu from '../../support/fragments/settingsMenu';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Patron notices', () => {
  describe('Settings (Patron notices)', () => {
    let noticePolicy;
    let newNoticePolicy;

    const generateTestData = () => {
      noticePolicy = NewNoticePolicy.getDefaultUI();
      newNoticePolicy = {
        name: `Test_notice_${getRandomPostfix()}`,
        description: 'Created by autotest team',
      };
    };

    beforeEach('login', () => {
      generateTestData();
      cy.loginAsAdmin({
        path: SettingsMenu.circulationPatronNoticePoliciesPath,
        waiter: NewNoticePolicy.waitLoading,
      });
    });

    it(
      'C6530 Create notice policy (volaris)',
      { tags: ['smoke', 'volaris', 'system', 'C6530'] },
      () => {
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
        NewNoticePolicy.editPolicy(noticePolicy, newNoticePolicy);
        NewNoticePolicy.save(newNoticePolicy);
        NewNoticePolicy.checkPolicyName(newNoticePolicy);
        NewNoticePolicy.choosePolicy(newNoticePolicy);
        NewNoticePolicy.deletePolicy(newNoticePolicy);
      },
    );
  });
});
