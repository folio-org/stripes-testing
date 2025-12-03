import permissions from '../../support/dictionary/permissions';
import NewNoticePolicyTemplate from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import { NOTICE_CATEGORIES } from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplate from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Patron notices', () => {
  let userData;
  let servicePointId;
  const testData = {};
  const newNoticeTemplateName = getTestEntityValue('newNoticePolicy');
  const patronGroup = { name: getTestEntityValue('groupNoticePolicy') };
  const template = NoticePolicyTemplate.getDefaultTemplate();

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
        servicePointId = servicePoint.id;
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
    cy.getAdminToken();
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
    { tags: ['extendedPath', 'volaris', 'C396392'] },
    () => {
      NewNoticePolicyTemplate.openToSide({ name: testData.noticeTemplateBody.name });
      NewNoticePolicyTemplate.duplicateTemplate();
      NewNoticePolicyTemplate.verifyMetadataObjectIsVisible({ creator: 'ADMINISTRATOR' });
      NewNoticePolicyTemplate.verifyGeneralInformationForDuplicate(testData.noticeTemplateBody);
      NewNoticePolicyTemplate.typeTemplateName(newNoticeTemplateName);
      NewNoticePolicyTemplate.saveAndClose();
      NewNoticePolicyTemplate.waitLoading();
      NewNoticePolicyTemplate.checkAfterSaving({
        name: newNoticeTemplateName,
        description: testData.noticeTemplateBody.description,
        category: NOTICE_CATEGORIES.loan,
        subject: 'Email subject: Loan',
        body: 'Email body {{item.title}}',
      });
    },
  );
});
