import uuid from 'uuid';
import Permissions from '../../../../support/dictionary/permissions';
import NoticePolicyTemplate from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('Permissions -> Circulation', () => {
  const userData = {};
  const newNoticePolicyTemplate = {
    name: uuid(),
    description: 'description',
    subject: 'subject',
    body: 'body',
  };
  const duplicateNoticePolicyTemplate = {
    name: uuid(),
    description: 'duplicate description',
    subject: 'duplicate subject',
    body: 'duplicate body',
  };
  const editNoticePolicyTemplate = {
    name: uuid(),
    description: 'new description',
    subject: 'edit subject',
    body: 'edit body',
  };

  before('Prepare test data', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([Permissions.uiCirculationSettingsNoticeTemplates.gui])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
        })
        .then(() => {
          cy.waitForAuthRefresh(() => {
            cy.login(userData.username, userData.password, {
              path: SettingsMenu.circulationPatronNoticeTemplatesPath,
              waiter: NoticePolicyTemplate.waitLoading,
            });
          });
        });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    NoticePolicyTemplate.deleteNoticePolicyTemplateByNameViaAPI(newNoticePolicyTemplate.name);
    NoticePolicyTemplate.deleteNoticePolicyTemplateByNameViaAPI(duplicateNoticePolicyTemplate.name);
    NoticePolicyTemplate.deleteNoticePolicyTemplateByNameViaAPI(editNoticePolicyTemplate.name);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C1217 Can create, edit and remove patron notice templates (vega)',
    { tags: ['extendedPath', 'vega', 'C1217'] },
    () => {
      // Create a new patron notice policy
      NoticePolicyTemplate.startAdding();
      NoticePolicyTemplate.create(newNoticePolicyTemplate);
      InteractorsTools.checkCalloutMessage(
        `The Patron notice templates ${newNoticePolicyTemplate.name} was successfully created.`,
      );
      NoticePolicyTemplate.verifyNoticePolicyTemplate(newNoticePolicyTemplate);

      // Duplicate a patron notice policy
      NoticePolicyTemplate.duplicateTemplate();
      NoticePolicyTemplate.create(duplicateNoticePolicyTemplate);
      InteractorsTools.checkCalloutMessage(
        `The Patron notice templates ${duplicateNoticePolicyTemplate.name} was successfully created.`,
      );
      NoticePolicyTemplate.verifyNoticePolicyTemplate(duplicateNoticePolicyTemplate);

      // Create a new patron notice policy
      NoticePolicyTemplate.editTemplate(duplicateNoticePolicyTemplate.name);
      NoticePolicyTemplate.create(editNoticePolicyTemplate);
      InteractorsTools.checkCalloutMessage(
        `The Patron notice templates ${editNoticePolicyTemplate.name} was successfully updated.`,
      );
      NoticePolicyTemplate.verifyNoticePolicyTemplate(editNoticePolicyTemplate);

      // Create a new patron notice policy
      NoticePolicyTemplate.delete();
      InteractorsTools.checkCalloutMessage(
        `The Patron notice templates ${editNoticePolicyTemplate.name} was successfully deleted.`,
      );
      NoticePolicyTemplate.verifyRequestPolicyInNotInTheList(editNoticePolicyTemplate.name);
    },
  );
});
