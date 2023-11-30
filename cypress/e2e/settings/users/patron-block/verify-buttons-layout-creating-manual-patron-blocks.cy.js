import { Permissions } from '../../../../support/dictionary';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../../../support/fragments/requests/newRequest';
import { Locations, ServicePoints } from '../../../../support/fragments/settings/tenant';
import TopMenu from '../../../../support/fragments/topMenu';
import PatronBlocks from '../../../../support/fragments/users/patronBlocks';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

describe('Manual Patron Blocks', () => {
  let userData;
  const blockDescription = getTestEntityValue('Test description');
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.uiUsersPatronBlocks.gui,
      Permissions.uiUsersView.gui,
      Permissions.uiRequestsAll.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      ServicePoints.createViaApi(testData.userServicePoint);
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userData.userId,
        testData.userServicePoint.id,
      );
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.userServicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
      testData.itemBarcode = testData.folioInstances[0].barcodes[0];
      cy.login(userData.username, userData.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.userServicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C374699 Verify buttons layout creating manual Patron blocks (vega) (TaaS)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      UsersSearchPane.searchByKeywords(userData.barcode);
      UsersCard.startBlock();
      PatronBlocks.waitLoading();
      PatronBlocks.verifyCancelButtonDisabled(false);
      PatronBlocks.verifySaveButtonDisabled();
      UsersCard.fillDescription(blockDescription);
      PatronBlocks.verifySaveButtonDisabled(false);
      UsersCard.saveAndClose();
      UsersCard.waitLoading();
      Users.checkIsPatronBlocked(blockDescription, 'Borrowing, Renewals, Requests');

      UsersCard.startRequest();
      NewRequest.checkPatronblockedModal(blockDescription);
      NewRequest.openBlockDetails();

      Users.verifyFirstNameOnUserDetailsPane(userData.firstName);
      UsersCard.selectPatronBlock(blockDescription);
      PatronBlocks.verifyCancelButtonDisabled(false);
      PatronBlocks.verifySaveButtonDisabled();
      PatronBlocks.deletePatronBlock(blockDescription);
      Users.checkPatronIsNotBlocked(userData.userId);
    },
  );
});
