import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import { getTestEntityValue } from '../../support/utils/stringTools';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TestTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import NewNoticePolicyTemplate from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import NoticePolicyTemplate from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';

describe('Patron Notices', () => {
  let userData;
  let servicePointId;
  const testData = {};
  const newNoticeTemplateName = getTestEntityValue('newNoticePolicy');
  const patronGroup = { name: getTestEntityValue('groupNoticePolicy') };
  const template = NoticePolicyTemplate.getDefaultTemplate();

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
        servicePointId = servicePoints[0].id;
      });
      NoticePolicyTemplate.createViaApi(template).then((noticeTemplateResp) => {
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
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    NoticePolicyTemplate.deleteViaApi(testData.noticeTemplateBody.id);
    NoticePolicyTemplate.getViaApi({ query: `name=${newNoticeTemplateName}` }).then(
      (templateId) => {
        NoticePolicyTemplate.deleteViaApi(templateId);
      },
    );
  });

  it(
    'C396392 Verify that patron notice duplication works as expected (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      NewNoticePolicyTemplate.openToSide({ name: testData.noticeTemplateBody.name });
      NewNoticePolicyTemplate.duplicateTemplate();
      NewNoticePolicyTemplate.verifyMetadataObjectIsVisible();
      NewNoticePolicyTemplate.verifyGeneralInformationForDuplicate(testData.noticeTemplateBody);
      NewNoticePolicyTemplate.typeTemplateName(newNoticeTemplateName);
      NewNoticePolicyTemplate.saveAndClose();
      NewNoticePolicyTemplate.waitLoading();
      NewNoticePolicyTemplate.checkAfterSaving({
        name: newNoticeTemplateName,
        description: testData.noticeTemplateBody.description,
        category: testData.noticeTemplateBody.category,
        subject: 'Email subject: Loan',
        body: 'Email body {{item.title}}',
      });
    },
  );
});
