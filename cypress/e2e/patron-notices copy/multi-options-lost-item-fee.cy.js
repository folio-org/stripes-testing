import { APPLICATION_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import NewNoticePolicy from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import NewNoticePolicyTemplate, {
  createNoticeTemplate,
} from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import NoticePolicyApi, {
  NOTICE_CATEGORIES,
} from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Patron notices', () => {
  describe('Settings (Patron notices)', () => {
    const patronGroup = {
      name: 'groupToTestNotices' + getRandomPostfix(),
    };
    const userData = {};
    const noticeTemplates = [
      createNoticeTemplate({
        name: 'Lost_item_fee_upon_at',
        category: NOTICE_CATEGORIES.AutomatedFeeFineCharge,
        noticeOptions: {
          noticeName: 'FeeFine',
          noticeId: 'feeFine',
          send: 'Upon/At',
          action: 'Lost item fee(s) charged',
        },
      }),
      createNoticeTemplate({
        name: 'Lost_item_fee_after_once',
        category: NOTICE_CATEGORIES.AutomatedFeeFineCharge,
        noticeOptions: {
          noticeName: 'FeeFine',
          noticeId: 'feeFine',
          send: 'After',
          action: 'Lost item fee(s) charged',
          sendBy: {
            duration: '1',
            interval: 'Minute(s)',
          },
          frequency: 'One Time',
        },
      }),
    ];
    const noticePolicy = {
      name: `Autotest ${getRandomPostfix()} Lost item fee(s) charged`,
      description: 'Created by autotest team',
    };
    before('Preconditions', () => {
      cy.getAdminToken();
      PatronGroups.createViaApi(patronGroup.name).then((res) => {
        patronGroup.id = res;
        cy.createTempUser(
          [
            permissions.uiCirculationSettingsNoticeTemplates.gui,
            permissions.uiCirculationSettingsNoticePolicies.gui,
          ],
          patronGroup.name,
        )
          .then((userProperties) => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
          })
          .then(() => {
            cy.login(userData.username, userData.password, {
              path: SettingsMenu.circulationPatronNoticeTemplatesPath,
              waiter: NewNoticePolicyTemplate.waitLoading,
            });
          });
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((noticePolicyRes) => {
        NoticePolicyApi.deleteViaApi(noticePolicyRes[0].id);
      });
      Users.deleteViaApi(userData.userId);
      PatronGroups.deleteViaApi(patronGroup.id);
      noticeTemplates.forEach((template) => {
        NoticePolicyTemplateApi.getViaApi({
          query: `name=${template.name}`,
        }).then((templateId) => {
          NoticePolicyTemplateApi.deleteViaApi(templateId);
        });
      });
    });

    it(
      'C385643 User can select Multiples options for "Lost item fee(s) charged" (volaris)',
      { tags: ['extendedPath', 'volaris', 'C385643'] },
      () => {
        noticeTemplates.forEach((template, index) => {
          NewNoticePolicyTemplate.createPatronNoticeTemplate(template, !!index);
          NewNoticePolicyTemplate.checkAfterSaving(template);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        NewNoticePolicy.openTabCirculationPatronNoticePolicies();
        NewNoticePolicy.waitLoading();

        NewNoticePolicy.createPolicy({ noticePolicy, noticeTemplates });
        NewNoticePolicy.checkPolicyName(noticePolicy.name);
      },
    );
  });
});
