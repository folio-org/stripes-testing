import moment from 'moment/moment';
import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../support/fragments/topMenu';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFine from '../../support/fragments/users/payFeeFine';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  describe('Fees/Fines Pay Modal Text Verification', () => {
    const testData = {
      ownerData: {},
      user: {},
    };
    const feeFineType = {};
    const paymentMethod = {};
    let userData;
    let openFeeFine;
    let closedFeeFine;

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

          PaymentMethods.createViaApi(testData.ownerData.id).then(({ name, id }) => {
            paymentMethod.name = name;
            paymentMethod.id = id;
          });
        });

      cy.createTempUser([
        Permissions.uiFeeFines.gui,
        Permissions.uiUsersManualPay.gui,
        Permissions.uiUsersfeefinesView.gui,
      ])
        .then((userProperties) => {
          userData = userProperties;
          testData.user = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);

          cy.createTempUser([]).then((targetUserProperties) => {
            testData.targetUser = targetUserProperties;

            cy.getAdminSourceRecord()
              .then((adminSourceRecord) => {
                openFeeFine = {
                  id: uuid(),
                  ownerId: testData.ownerData.id,
                  feeFineId: feeFineType.id,
                  amount: 15,
                  userId: targetUserProperties.userId,
                  feeFineType: feeFineType.name,
                  feeFineOwner: testData.ownerData.name,
                  createdAt: testData.servicePoint.id,
                  dateAction: moment.utc().format(),
                  source: adminSourceRecord,
                };

                closedFeeFine = {
                  id: uuid(),
                  ownerId: testData.ownerData.id,
                  feeFineId: feeFineType.id,
                  amount: 10,
                  remaining: 0,
                  userId: targetUserProperties.userId,
                  feeFineType: feeFineType.name,
                  feeFineOwner: testData.ownerData.name,
                  createdAt: testData.servicePoint.id,
                  dateAction: moment.utc().format(),
                  source: adminSourceRecord,
                  paymentStatus: { name: 'Paid fully' },
                };

                // Create open fee/fine first
                return NewFeeFine.createViaApi(openFeeFine);
              })
              .then((openId) => {
                openFeeFine.id = openId;

                // Create closed fee/fine
                return NewFeeFine.createViaApi(closedFeeFine);
              })
              .then((closedId) => {
                closedFeeFine.id = closedId;

                // Pay the closed fee/fine to make it closed
                return PayFeeFine.payFeeFineViaApi(
                  {
                    amount: 10,
                    paymentMethod: paymentMethod.id,
                    notifyPatron: false,
                    servicePointId: testData.servicePoint.id,
                    userName: 'ADMINISTRATOR',
                  },
                  closedId,
                );
              });
          });

          cy.login(userData.username, userData.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      ManualCharges.deleteViaApi(feeFineType.id);
      PaymentMethods.deleteViaApi(paymentMethod.id);
      NewFeeFine.deleteFeeFineAccountViaApi(openFeeFine.id);

      NewFeeFine.deleteFeeFineAccountViaApi(closedFeeFine.id);
      UsersOwners.deleteViaApi(testData.ownerData.id);

      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      Users.deleteViaApi(userData.userId);
      Users.deleteViaApi(testData.targetUser.userId);
    });

    it(
      'C375239 Verify text on fee/fines popup (volaris)',
      { tags: ['extendedPath', 'volaris', 'C375239'] },
      () => {
        UsersSearchPane.searchByKeywords(testData.targetUser.username);
        UsersSearchPane.selectUserFromList(testData.targetUser.username);
        UsersCard.waitLoading();

        UsersCard.openFeeFines(1, 1);
        UsersCard.viewAllFeesFines();
        UserAllFeesFines.waitLoading();

        UserAllFeesFines.clickRowCheckbox(0);
        UserAllFeesFines.clickRowCheckbox(1);

        UserAllFeesFines.paySelectedFeeFines();
        PayFeeFine.waitWarningLoading();
        PayFeeFine.verifyDeselectToContinueText();
        PayFeeFine.verifyContinueIsDisabled();
      },
    );
  });
});
