import Permissions from '../../../../support/dictionary/permissions';
import NoticePolicyTemplates from '../../../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import NoticePolicies, {
  getDefaultNoticePolicy,
  NOTICE_CATEGORIES,
} from '../../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NewNoticePolicy from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Patron notices', () => {
  describe('Settings (Patron notice policies)', () => {
    const testData = {};
    const templates = [1, 2].map((number) => ({
      ...NoticePolicyTemplates.getDefaultTemplate({ category: NOTICE_CATEGORIES.loan }),
      name: `AT_C1464324_LoanTemplate${number}_${getRandomPostfix()}`,
    }));
    const getNotice = (template, sendWhen) => ({
      templateId: template.id,
      format: 'Email',
      realTime: false,
      sendOptions: { sendWhen },
    });
    // C1464324 needs at least one notice, C1464331 at least two loan notices
    const noticePolicy = {
      ...getDefaultNoticePolicy({
        name: `AT_C1464324_PatronNoticePolicy_${getRandomPostfix()}`,
      }),
      loanNotices: [getNotice(templates[0], 'Check out'), getNotice(templates[1], 'Check in')],
    };

    before('Create test data', () => {
      cy.getAdminToken();
      templates.forEach((template) => NoticePolicyTemplates.createViaApi(template));
      NoticePolicies.createWithTemplateApi(noticePolicy);
      cy.createTempUser([Permissions.uiCirculationSettingsViewNoticePolicies.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
        },
      );
    });

    beforeEach('Log in', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.circulationPatronNoticePoliciesPath,
        waiter: NewNoticePolicy.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      NoticePolicies.deleteViaApi(noticePolicy.id);
      templates.forEach((template) => NoticePolicyTemplates.deleteViaApi(template.id));
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1464324 - View-only user cannot add or delete notice cards in a patron notice policy (helios)',
      { tags: ['criticalPath', 'helios', 'C1464324'] },
      () => {
        // Step 1: Open the existing policy; it opens in read-only view without an Edit action
        NewNoticePolicy.openPolicy(noticePolicy.name);
        NewNoticePolicy.verifyEditActionUnavailable(noticePolicy.name);

        // Step 2: Notice cards are shown without "Add notice above"/"Delete notice" controls
        NewNoticePolicy.verifyReadOnlyNoticeCards('loan', 2);
      },
    );

    it(
      'C1464331 - Drag & drop reorder unavailable in view-only patron notice policy (helios)',
      { tags: ['extendedPath', 'helios', 'C1464331'] },
      () => {
        // Step 1: Open the existing policy; it opens in read-only view without an Edit action
        NewNoticePolicy.openPolicy(noticePolicy.name);
        NewNoticePolicy.verifyEditActionUnavailable(noticePolicy.name);

        // Step 2: Notice cards are shown without a drag & drop handle, so they can't be reordered
        NewNoticePolicy.verifyReadOnlyNoticeCards('loan', 2);
      },
    );
  });
});
