import Permissions from '../../support/dictionary/permissions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Check out', () => {
  const patronModel = Users.generateUserModel();
  let servicePoint;
  let staffUser;
  let patronUser;

  before('Create test data', () => {
    patronModel.type = 'patron';

    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
          servicePoint = sp;
        });
      })
      .then(() => {
        cy.createTempUserParameterized(patronModel, [], { userType: 'patron' }).then(
          (userProperties) => {
            patronUser = { ...patronModel, ...userProperties };
          },
        );

        cy.createTempUser([Permissions.checkoutAll.gui]).then((userProperties) => {
          staffUser = userProperties;
          UserEdit.addServicePointViaApi(servicePoint.id, staffUser.userId, servicePoint.id);
        });
      })
      .then(() => {
        cy.login(staffUser.username, staffUser.password, {
          path: TopMenu.checkOutPath,
          waiter: Checkout.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(patronUser.userId);
    Users.deleteViaApi(staffUser.userId);
  });

  it(
    'C347838 Add preferred name to Check out UI (vega)',
    { tags: ['extendedPath', 'vega', 'C347838'] },
    () => {
      const personal = patronUser.personal;

      // Step 1: Scan patron barcode in Check out app
      CheckOutActions.checkOutUser(patronUser.barcode);

      // Step 2: Verify user record displays with Last name, preferred first name, middle name
      CheckOutActions.checkUserInfo(
        { barcode: patronUser.barcode, personal: { lastname: personal.lastName } },
      );
      CheckOutActions.verifyUserContainsPartialName(
        `${personal.lastName}, ${personal.preferredFirstName} ${personal.middleName}`,
      );
    },
  );
});
