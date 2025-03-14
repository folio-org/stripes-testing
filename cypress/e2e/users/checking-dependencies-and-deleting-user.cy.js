import moment from 'moment';
import uuid from 'uuid';
import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../support/fragments/topMenu';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';

describe('Users', () => {
  const testData = {
    userWithTransactions: {},
    userWithoutTransactions: {},
  };
  const ownerData = {};
  const feeFineType = {};
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
  let feeFineAccount;

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([
        Permissions.uiUsersCheckTransactions.gui,
        Permissions.uiUserEdit.gui,
        Permissions.uiUsersDelete.gui,
      ]).then((userProperties) => {
        testData.userWithTransactions = userProperties;
        testData.userWithTransactions.userFullName = `${userProperties.personal.lastName}, ${userProperties.personal.preferredFirstName} ${userProperties.personal.middleName}`;
      });
      cy.createTempUser([]).then(
        (userProperties) => {
          testData.userWithoutTransactions = userProperties;
          testData.userWithoutTransactions.userFullName = `${userProperties.personal.lastName}, ${userProperties.personal.preferredFirstName} ${userProperties.personal.middleName}`;
        },
      );

      // Create owner, service point, fee fine type, and waive reason
      ServicePoints.createViaApi(servicePoint);
      UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner())
        .then(({ id, owner }) => {
          ownerData.name = owner;
          ownerData.id = id;
        })
        .then(() => {
          ManualCharges.createViaApi({
            ...ManualCharges.defaultFeeFineType,
            ownerId: ownerData.id,
          }).then((manualCharge) => {
            feeFineType.id = manualCharge.id;
            feeFineType.name = manualCharge.feeFineType;
            feeFineType.amount = manualCharge.amount;
          });

          cy.getAdminSourceRecord().then((adminSourceRecord) => {
            feeFineAccount = {
              id: uuid(),
              ownerId: ownerData.id,
              feeFineId: feeFineType.id,
              amount: 100,
              userId: testData.userWithTransactions.userId,
              feeFineType: feeFineType.name,
              feeFineOwner: ownerData.name,
              createdAt: servicePoint.id,
              dateAction: moment.utc().format(),
              source: adminSourceRecord,
            };
            NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
              feeFineAccount.id = feeFineAccountId;
            });
          });
        });
    });
  });

  after('Deleting created users and data', () => {
    cy.getAdminToken();
    ManualCharges.deleteViaApi(feeFineType.id);
    NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
    UsersOwners.deleteViaApi(ownerData.id);
    ServicePoints.deleteViaApi(servicePoint.id);
    Users.deleteViaApi(testData.userWithTransactions.userId);
    Users.deleteViaApi(testData.userWithoutTransactions.userId);
  });

  it(
    'C345422 Check for dependencies and delete user (volaris)',
    { tags: ['criticalPath', 'volaris', 'C345422'] },
    () => {
      cy.login(testData.userWithTransactions.username, testData.userWithTransactions.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });

      UsersSearchPane.searchByKeywords(testData.userWithTransactions.username);
      Users.checkTransactions();
      Users.checkOpenTransactionsModal(testData.userWithTransactions.userFullName,
        { loans: 0, requests: 0, feesFines: 1, blocks: 0, unexpiredProxy: 0 });
      Users.closeOpenTransactionsModal();

      UsersSearchPane.searchByKeywords(testData.userWithoutTransactions.username);
      Users.checkTransactions();
      Users.checkNoOpenTransactionsModal(testData.userWithoutTransactions.userFullName);
      Users.closeNoOpenTransactionsModal();

      Users.checkTransactions();
      Users.checkNoOpenTransactionsModal(testData.userWithoutTransactions.userFullName);
      Users.deleteUserFromTransactionsModal();
      Users.successMessageAfterDeletion(
        `User ${testData.userWithoutTransactions.userFullName} deleted successfully.`,
      );
      UsersSearchPane.searchByKeywords(testData.userWithoutTransactions.username);
      UsersSearchResultsPane.verifyUserIsNotPresentInTheList(testData.userWithoutTransactions.username);
    },
  );
});
