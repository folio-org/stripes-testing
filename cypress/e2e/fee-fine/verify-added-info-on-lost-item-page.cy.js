import moment from 'moment';
import getRandomPostfix from '../../support/utils/stringTools';
import LostItemsRequiringActualCostPage from '../../support/fragments/users/lostItemsRequiringActualCostPage';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../support/dictionary';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import Checkout from '../../support/fragments/checkout/checkout';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Lost items requiring actual cost', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    userServicePoint: ServicePoints.getDefaultServicePoint(),
  };
  let instanceTitle;
  const ownerData = UsersOwners.getDefaultNewOwner();
  const patronGroup = {
    name: 'patronGroup' + getRandomPostfix(),
  };

  before('Create test entities', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.userServicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.userServicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation)
        .then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        })
        .then(() => {
          PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
            patronGroup.id = patronGroupResponse;
          });
        })
        .then(() => {
          UsersOwners.createViaApi({
            ...ownerData,
            servicePointOwner: [
              {
                value: testData.userServicePoint.id,
                label: testData.userServicePoint.name,
              },
            ],
          }).then((ownerResponse) => {
            testData.owner = ownerResponse;
          });
        });
    });
    instanceTitle = testData.folioInstances[0].instanceTitle;
    cy.createTempUser([Permissions.uiUserLostItemRequiringActualCost.gui], patronGroup.name).then(
      (user) => {
        testData.user = user;
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          testData.user.userId,
          testData.userServicePoint.id,
        ).then(() => {
          Checkout.checkoutItemViaApi({
            itemBarcode: testData.folioInstances[0].barcodes[0],
            userBarcode: testData.user.barcode,
            servicePointId: testData.userServicePoint.id,
          });
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchResultsPane.waitLoading,
          });
        });
        UserLoans.getUserLoansIdViaApi(user.userId).then((userLoans) => {
          UserLoans.declareLoanLostViaApi(
            {
              servicePointId: testData.userServicePoint.id,
              declaredLostDateTime: moment.utc().format(),
            },
            userLoans.loans[0].id,
          );
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.userServicePoint,
      shouldCheckIn: true,
    });
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(testData.user.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    UsersOwners.deleteViaApi(testData.owner.id);
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C365613 Verify additional information in "Patron" column on the "Lost items requiring actual cost" page (vega) (TaaS)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      // Click on "Actions" dropdown => Click "Lost items requiring actual cost" action
      UsersSearchPane.openLostItemsRequiringActualCostPane();
      LostItemsRequiringActualCostPage.waitLoading();

      // Click on "Declared lost" checkbox
      LostItemsRequiringActualCostPage.searchByLossType('Declared lost');
      LostItemsRequiringActualCostPage.checkResultsLossType(instanceTitle, 'Declared lost');

      // Observe "Patron" column
      LostItemsRequiringActualCostPage.checkResultsPatronColumn(instanceTitle, patronGroup.name);
    },
  );
});
