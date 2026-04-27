import { getTestEntityValue } from '../../../../support/utils/stringTools';
import TagsGeneral from '../../../../support/fragments/settings/tags/tags-general';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import TopMenu from '../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Users', () => {
  let userData;
  const newTag = getTestEntityValue('tag');
  const { user, memberTenant } = parseSanityParameters();

  before('Preconditions', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false });
    cy.createTempUser().then((userProperties) => {
      userData = userProperties;
    });
    cy.login(user.username, user.password, {
      path: SettingsMenu.tagsGeneralPath,
      waiter: TagsGeneral.waitLoading,
    });
  });

  it(
    'C9318 Add and remove tags from a user (volaris)',
    { tags: ['dryRun', 'volaris', 'C9318'] },
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
