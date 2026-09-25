import Permissions from '../../support/dictionary/permissions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import SelectUser from '../../support/fragments/check-out-actions/selectUser';
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
    'C350534 Display preferred first name in the user search modal in Checkout (vega)',
    { tags: ['extendedPath', 'vega', 'C350534'] },
    () => {
      const personal = patronUser.personal;

      // #1 Go to the Check out app
      CheckOutActions.checkIsInterfacesOpened();

      // #2 Click on the "Patron lookup" hotlink
      CheckOutActions.openPatronLookup();
      SelectUser.verifySelectUserModalExists();

      // #3 Search for the user with preferred name from preconditions
      SelectUser.searchUser(personal.preferredFirstName);

      // #4 Review the Name field of the search results
      SelectUser.verifyFoundUserContainsPartialName(
        `${personal.lastName}, ${personal.preferredFirstName} (${personal.firstName}) ${personal.middleName}`,
      );
    },
  );
});
