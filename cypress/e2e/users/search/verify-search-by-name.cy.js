import { getTestEntityValue } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../../support/fragments/users/usersSearchResultsPane';

describe('Users', () => {
  describe('Search (Users)', () => {
    const createExtraordinarySpellingString = () => {
      const letters = 'abcdefghijklmnopqrstuvwxyzäåæàâçéèêëðïîĳłñöøœôõüùûÿþăħșț';
      return Array.from({ length: 10 }, () => (Math.random() < 0.5
        ? letters[Math.floor(Math.random() * letters.length)].toUpperCase()
        : letters[Math.floor(Math.random() * letters.length)])).join('');
    };
    const usersWithSameName = Array(4);
    const sameName = createExtraordinarySpellingString();
    const usersWithSameLastName = Array(2);
    const sameLastName = createExtraordinarySpellingString();

    before('Preconditions', () => {
      cy.getAdminToken().then(() => {
        cy.wrap(usersWithSameName).each((_, index) => {
          Users.createViaApi({
            active: true,
            username: getTestEntityValue('username'),
            personal: {
              preferredContactTypeId: '002',
              firstName: sameName,
              lastName: getTestEntityValue('lastName'),
              email: 'test@folio.org',
            },
            departments: [],
          }).then((newUserProperties) => {
            usersWithSameName[index] = newUserProperties;
          });
        });
        cy.wrap(usersWithSameLastName).each((_, index) => {
          Users.createViaApi({
            active: true,
            username: getTestEntityValue('username'),
            personal: {
              preferredContactTypeId: '002',
              firstName: sameName,
              lastName: sameLastName,
              email: 'test@folio.org',
            },
            departments: [],
          }).then((newUserProperties) => {
            usersWithSameLastName[index] = newUserProperties;
          });
        });
        cy.waitForAuthRefresh(() => {
          cy.loginAsAdmin({
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      cy.wrap([...usersWithSameName, ...usersWithSameLastName]).each((user) => {
        Users.deleteViaApi(user.id);
      });
    });

    it(
      'C415 Search: Verify search by Name (volaris)',
      { tags: ['criticalPath', 'volaris', 'C415'] },
      () => {
        UsersSearchPane.searchByKeywords(sameName);
        UsersSearchResultsPane.checkSearchResultsCount(
          [...usersWithSameName, ...usersWithSameLastName].length,
        );
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByKeywords(`${sameName}, ${sameLastName}`);
        UsersSearchResultsPane.checkSearchResultsCount(usersWithSameLastName.length);
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByLastName(sameLastName);
        UsersSearchResultsPane.checkSearchResultsCount(usersWithSameLastName.length);
      },
    );
  });
});
