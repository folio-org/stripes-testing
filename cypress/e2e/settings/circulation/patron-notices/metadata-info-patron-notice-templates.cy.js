import permissions from '../../../../support/dictionary/permissions';
import { NOTICE_CATEGORIES } from '../../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NewNoticePolicyTemplate from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import NoticeTemplates from '../../../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';

describe('Patron Notices', () => {
  let userData;
  const newBodytext = 'New text';
  const noticeTemplate = NoticeTemplates.getDefaultTemplate();
  let adminNames;

  before('Preconditions', () => {
    cy.getAdminToken();
    NoticeTemplates.createViaApi(noticeTemplate);
    ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' })
      .then((servicePoints) => {
        return servicePoints[0].id;
      })
      .then((servicePointId) => {
        cy.createTempUser([permissions.uiCirculationSettingsNoticeTemplates.gui]).then(
          (userProperties) => {
            userData = userProperties;
            UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
          },
        );
      })
      .then(() => {
        cy.getAdminSourceRecord().then((names) => {
          adminNames = names;
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.circulationPatronNoticeTemplatesPath,
            waiter: NewNoticePolicyTemplate.waitLoading,
          });
        });
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    NoticeTemplates.deleteViaApi(noticeTemplate.id);
  });

  it(
    'C387439 C367968 Add metadata info to view of Patron Notice Templates scenario 1,4,5 (volaris)',
    { tags: ['extendedPath', 'volaris'] },
    () => {
      NewNoticePolicyTemplate.openToSide({ name: noticeTemplate.name });
      NewNoticePolicyTemplate.checkAfterSaving({
        name: noticeTemplate.name,
        description: noticeTemplate.description,
        category: NOTICE_CATEGORIES.loan,
        subject: 'Email subject: Loan',
        body: 'Email body {{item.title}}',
      });
      NewNoticePolicyTemplate.editTemplate(noticeTemplate.name);
      NewNoticePolicyTemplate.updateBodyText(newBodytext);
      NewNoticePolicyTemplate.openToSide({ name: noticeTemplate.name });
      NewNoticePolicyTemplate.checkAfterSaving({
        name: noticeTemplate.name,
        description: noticeTemplate.description,
        category: NOTICE_CATEGORIES.loan,
        subject: 'Email subject: Loan',
        body: newBodytext,
      });
      cy.wait(2000);
      NoticeTemplates.collapseAll();
      NoticeTemplates.expandAll();
    },
  );

  it(
    'C387440 Add metadata info to view of Patron Notice Templates scenario 2/3 (volaris)',
    { tags: ['extendedPath', 'volaris'] },
    () => {
      NewNoticePolicyTemplate.openToSide({ name: noticeTemplate.name });
      NewNoticePolicyTemplate.verifyMetadataObjectIsVisible(adminNames);
    },
  );
});
