import { getTestEntityValue } from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Permissions Tags', () => {
  let userData;
  const newTag = getTestEntityValue('tag');

  before('Preconditions', () => {
    cy.getAdminToken();
    cy.createTempUser().then((userProperties) => {
      userData = userProperties;
    });
    cy.loginAsAdmin({
      path: TopMenu.usersPath,
      waiter: UsersSearchPane.waitLoading,
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C9318 Add and remove tags from a user (volaris)',
    { tags: ['criticalPath', 'volaris'] },
    () => {
      UsersSearchPane.searchByUsername(userData.username);
      UsersCard.openTagsPane();
      UsersCard.addTag(newTag);
      InteractorsTools.checkCalloutMessage('New tag created');
      UsersCard.verifyTagsNumber('1');
      cy.reload();
      UsersCard.openTagsPane();
      UsersCard.deleteTag(newTag);
      UsersCard.verifyTagsNumber('0');
    },
  );
});
