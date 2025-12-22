import permissions from '../../support/dictionary/permissions';
import NewNoticePolicyTemplate from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import NoticePolicyTemplate from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import { NOTICE_CATEGORIES } from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Patron notices', () => {
  describe('Settings (Patron notices)', () => {
    let userData;
    let servicePointId;
    const testData = {};
    const patronGroup = {
      name: getTestEntityValue('groupNoticePolicy'),
    };
    const automatedFeeFineTemplate = NoticePolicyTemplate.getDefaultTemplate({
      category: NOTICE_CATEGORIES.AutomatedFeeFineCharge,
    });
    const automatedFeeFineTempText =
      'This is a text field intended to provide additional information for the patron regarding the fee/fine';

    before('Preconditions', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then(
          (servicePoint) => {
            servicePointId = servicePoint.id;
          },
        );
        NoticePolicyTemplate.createViaApi(automatedFeeFineTemplate).then((noticeTemplateResp) => {
          testData.feeFineTemplateBody = noticeTemplateResp;
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
      NoticePolicyTemplate.deleteViaApi(testData.feeFineTemplateBody.id);
    });

    it(
      'C411712 C385655 Verify that token "feeCharge.additionalInfo" is selectable in Patron notice template settings (volaris)',
      { tags: ['extendedPath', 'volaris', 'C411712'] },
      () => {
        NewNoticePolicyTemplate.editTemplate(testData.feeFineTemplateBody.name);
        NewNoticePolicyTemplate.clearBody();
        NewNoticePolicyTemplate.addToken('feeCharge.additionalInfo');
        NewNoticePolicyTemplate.saveAndClose();
        NewNoticePolicyTemplate.waitLoading();
        NoticePolicyTemplate.checkPreview(automatedFeeFineTempText);
      },
    );

    it(
      'C375248 Add "user.preferredFirstName" as staff slip token in Settings (volaris)',
      { tags: ['extendedPath', 'volaris', 'C375248'] },
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
      { tags: ['criticalPath', 'volaris', 'C387434'] },
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
});
