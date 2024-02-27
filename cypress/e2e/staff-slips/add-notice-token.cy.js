import permissions from '../../support/dictionary/permissions';
import NewNoticePolicyTemplate from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import NoticePolicyTemplate from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Patron Notices', () => {
  let userData;
  let servicePointId;
  const testData = {};
  const patronGroup = {
    name: getTestEntityValue('groupNoticePolicy'),
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
      });
    });
  });

  beforeEach('Login', () => {
    cy.login(userData.username, userData.password, {
      path: SettingsMenu.circulationPatronNoticeTemplatesPath,
      waiter: NewNoticePolicyTemplate.waitLoading,
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    NoticePolicyTemplate.deleteViaApi(testData.noticeTemplateBody.id);
  });

  it(
    'C375248 Add "user.preferredFirstName" as staff slip token in Settings (volaris)',
    { tags: ['extendedPath', 'volaris'] },
    () => {
      NewNoticePolicyTemplate.editTemplate(testData.noticeTemplateBody.name);
      NewNoticePolicyTemplate.clearBody();
      NewNoticePolicyTemplate.addToken('user.preferredFirstName');
      NewNoticePolicyTemplate.saveAndClose();
      NewNoticePolicyTemplate.waitLoading();
      NoticePolicyTemplate.checkPreview('Paul');
    },
  );

  it(
    'C387434 Add "Discovery display name" as notice token in Settings (volaris)',
    { tags: ['criticalPath', 'volaris'] },
    () => {
      NewNoticePolicyTemplate.editTemplate(testData.noticeTemplateBody.name);
      NewNoticePolicyTemplate.clearBody();
      NewNoticePolicyTemplate.addToken('item.effectiveLocationDiscoveryDisplayName');
      NewNoticePolicyTemplate.saveAndClose();
      NewNoticePolicyTemplate.waitLoading();
      NoticePolicyTemplate.checkPreview('Main Library');
    },
  );
});
