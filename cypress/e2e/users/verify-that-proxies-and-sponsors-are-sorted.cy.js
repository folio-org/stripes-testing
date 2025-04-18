import uuid from 'uuid';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';

describe('Users', () => {
  const testData = {};
  const usersData = [];
  const patronGroup = {
    name: getTestEntityValue('GroupUser'),
  };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.wrap(['e', 'c', 'a', 'd', 'b', 'z'])
        .each((user) => {
          Users.createViaApi({
            active: true,
            patronGroup: patronGroup.id,
            username: getTestEntityValue(user),
            barcode: uuid(),
            personal: {
              preferredContactTypeId: '002',
              lastName: `${user}${getRandomPostfix()}`,
              email: 'test@folio.org',
            },
            type: 'staff',
          }).then((newUserProperties) => {
            usersData.push(newUserProperties);
          });
        })
        .then(() => {
          testData.mainUsername = usersData[[usersData.length - 1]].username;
          testData.mainUserId = usersData[[usersData.length - 1]].id;
        });
      cy.loginAsAdmin({
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.wrap(usersData).each((user) => {
      cy.getProxyApi({ query: `userId=${user.id}` }).then((proxies) => {
        cy.wrap(proxies).each((proxy) => {
          cy.deleteProxyApi(proxy.id);
        });
      });
      Users.deleteViaApi(user.id);
    });
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C410869 Verify that proxies and sponsors are sorted (volaris)',
    { tags: ['extendedPath', 'volaris', 'C410869', 'eurekaPhase1'] },
    () => {
      UsersSearchPane.searchByKeywords(testData.mainUsername);
      UserEdit.openEdit();
      UserEdit.addProxySponsor(usersData.slice(0, -1).map((user) => user.username));
      UserEdit.saveAndClose();
      UsersCard.waitLoading();
      UsersCard.verifySponsorsAlphabeticalOrder();
    },
  );
});
