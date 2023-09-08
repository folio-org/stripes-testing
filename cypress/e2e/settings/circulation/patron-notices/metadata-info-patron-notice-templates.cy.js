import devTeams from '../../../../support/dictionary/devTeams';
import permissions from '../../../../support/dictionary/permissions';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import TestTypes from '../../../../support/dictionary/testTypes';
import Users from '../../../../support/fragments/users/users';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../../support/fragments/users/userEdit';
import NewNoticePolicyTemplate from '../../../../support/fragments/circulation/newNoticePolicyTemplate';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import NoticePolicyTemplate from '../../../../support/fragments/circulation/notice-policy-template';

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
        testData.noticeTemplateBody = noticeTemplateResp.body;
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
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    NoticePolicyTemplate.deleteViaApi(testData.noticeTemplateBody.id);
  });

  it(
    'C387439 Add metadata info to view of Patron Notice Templates scenario 1,4,5 (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      NewNoticePolicyTemplate.openToSide({ name: testData.noticeTemplateBody.name });
      NewNoticePolicyTemplate.checkAfterSaving({
        name: testData.noticeTemplateBody.name,
        description: testData.noticeTemplateBody.description,
        category: testData.noticeTemplateBody.category,
      });
      cy.wait(2000);
      NoticePolicyTemplate.collapseAll();
      NoticePolicyTemplate.expandAll();
    },
  );
});
