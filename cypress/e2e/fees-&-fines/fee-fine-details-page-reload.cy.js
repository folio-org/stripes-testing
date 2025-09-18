import moment from 'moment/moment';
import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../support/fragments/topMenu';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import FeeFinesDetails from '../../support/fragments/users/feeFineDetails';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Fees/Fines', () => {
  describe('Fee/fine details page reload', () => {
    const testData = {
      ownerData: {},
      user: {},
    };
    const feeFineType = {};
    let userData;
    let feeFine;

    before('Create test data', () => {
      cy.getAdminToken();

      ServicePoints.getCircDesk1ServicePointViaApi()
        .then((servicePoint) => {
          testData.servicePoint = servicePoint;

          return UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner());
        })
        .then(({ id, owner }) => {
          testData.ownerData.name = owner;
          testData.ownerData.id = id;
        })
        .then(() => {
          UsersOwners.addServicePointsViaApi(testData.ownerData, [testData.servicePoint]);

          ManualCharges.createViaApi({
            ...ManualCharges.defaultFeeFineType,
            ownerId: testData.ownerData.id,
          }).then((manualCharge) => {
            feeFineType.id = manualCharge.id;
            feeFineType.name = manualCharge.feeFineType;
            feeFineType.amount = manualCharge.amount;
          });
        });

      cy.createTempUser([Permissions.uiFeeFines.gui, Permissions.uiUsersfeefinesView.gui])
        .then((userProperties) => {
          userData = userProperties;
          testData.user = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);

          return cy.createTempUser([]);
        })
        .then((targetUserProperties) => {
          testData.targetUser = targetUserProperties;
          return cy.getAdminSourceRecord();
        })
        .then((adminSourceRecord) => {
          feeFine = {
            id: uuid(),
            ownerId: testData.ownerData.id,
            feeFineId: feeFineType.id,
            amount: 15,
            userId: testData.targetUser.userId,
            feeFineType: feeFineType.name,
            feeFineOwner: testData.ownerData.name,
            createdAt: testData.servicePoint.id,
            dateAction: moment.utc().format(),
            source: adminSourceRecord,
          };

          return NewFeeFine.createViaApi(feeFine);
        })
        .then((id) => {
          feeFine.id = id;

          cy.login(userData.username, userData.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
            authRefresh: true,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      ManualCharges.deleteViaApi(feeFineType.id);
      NewFeeFine.deleteFeeFineAccountViaApi(feeFine.id);
      UsersOwners.deleteViaApi(testData.ownerData.id);
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      Users.deleteViaApi(userData.userId);
      Users.deleteViaApi(testData.targetUser.userId);
    });

    it(
      'C808511 Fee/fine details page can be reloaded without errors (volaris)',
      { tags: ['extendedPath', 'volaris', 'C808511'] },
      () => {
        UsersSearchPane.searchByKeywords(testData.targetUser.username);
        UsersSearchPane.selectUserFromList(testData.targetUser.username);
        UsersCard.waitLoading();

        UsersCard.openFeeFines(1);
        UsersCard.viewAllFeesFines();
        UserAllFeesFines.waitLoading();

        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFinesDetails.waitLoading();

        cy.reload();
        FeeFinesDetails.waitLoading();

        cy.url().then((url) => {
          const originalUrl = url;

          cy.visit(originalUrl);
          FeeFinesDetails.waitLoading();

          cy.url().should('eq', originalUrl);
        });
      },
    );
  });
});
