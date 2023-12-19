import permissions from '../../../../support/dictionary/permissions';
import NewNoticePolicyTemplate from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import { NOTICE_CATEGORIES } from '../../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplate from '../../../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

describe('Patron Notices', () => {
  let userData;
  let servicePointId;
  const testData = {};
  const patronGroup = {
    name: getTestEntityValue('groupUserChange'),
  };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
        servicePointId = servicePoints[0].id;
      });
      NoticePolicyTemplate.createViaApi().then((noticeTemplateResp) => {
        testData.noticeTemplateBody = noticeTemplateResp;
      });
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser(
        [permissions.uiCirculationSettingsNoticeTemplates.gui],
        patronGroup.name,
      ).then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
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
    PatronGroups.deleteViaApi(patronGroup.id);
    NoticePolicyTemplate.deleteViaApi(testData.noticeTemplateBody.id);
  });

  it(
    'C387439 Add metadata info to view of Patron Notice Templates scenario 1,4,5 (volaris)',
    { tags: ['extendedPath', 'volaris'] },
    () => {
      NewNoticePolicyTemplate.openToSide({ name: testData.noticeTemplateBody.name });
      NewNoticePolicyTemplate.checkAfterSaving({
        name: testData.noticeTemplateBody.name,
        description: testData.noticeTemplateBody.description,
        category: NOTICE_CATEGORIES.loan,
        subject: 'Email subject: Loan',
        body: 'Email body {{item.title}}',
      });
      cy.wait(2000);
      NoticePolicyTemplate.collapseAll();
      NoticePolicyTemplate.expandAll();
    },
  );
});
