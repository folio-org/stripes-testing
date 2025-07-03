import { getTestEntityValue } from '../../support/utils/stringTools';
import TagsGeneral from '../../support/fragments/settings/tags/tags-general';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import InteractorsTools from '../../support/utils/interactorsTools';
import TopMenu from '../../support/fragments/topMenu';

describe('Users', () => {
  let userData;
  const newTag = getTestEntityValue('tag');

  before('Preconditions', () => {
    cy.getAdminToken();
    cy.createTempUser().then((userProperties) => {
      userData = userProperties;
    });
    cy.loginAsAdmin({
      path: SettingsMenu.tagsGeneralPath,
      waiter: TagsGeneral.waitLoading,
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C9318 Add and remove tags from a user (volaris)',
    { tags: ['criticalPath', 'volaris', 'C9318', 'eurekaPhase1'] },
    () => {
      TagsGeneral.changeEnableTagsStatus('enable');
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(userData.username);
      UsersCard.openTagsPane();
      UsersCard.addTag(newTag);
      InteractorsTools.checkCalloutMessage('New tag created');
      UsersCard.verifyTagsNumber('1');
      UsersCard.openTagsPane();
      UsersCard.deleteTag(newTag);
      UsersCard.verifyTagsNumber('0');
    },
  );
});
