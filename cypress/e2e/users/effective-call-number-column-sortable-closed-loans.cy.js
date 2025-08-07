import { getTestEntityValue } from '../../support/utils/stringTools';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import LoansPage from '../../support/fragments/loans/loansPage';
import Checkout from '../../support/fragments/checkout/checkout';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../support/fragments/inventory/item/itemRecordEdit';

describe('Users', () => {
  const testData = {
    user: {},
    patronGroup: {
      name: getTestEntityValue('PatronGroup'),
      description: 'Patron_group_description',
    },
    testUser: {
      personal: {
        lastName: getTestEntityValue('TestUser'),
        email: 'test@folio.org',
      },
      status: 'Active',
      preferredContact: 'Email',
      effectiveCallNumber1: {
        prefix: '055',
        number: '1234562',
      },
      effectiveCallNumber2: {
        prefix: '056',
        number: '1234562',
      },
    },
    servicePoint: {},
    defaultLocation: {},
    folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
  };

  before('Create test data', () => {
    cy.getAdminToken();
    PatronGroups.createViaApi(testData.patronGroup.name, testData.patronGroup.description).then(
      (patronGroupResponse) => {
        testData.patronGroup.id = patronGroupResponse;
        testData.servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
        ServicePoints.createViaApi(testData.servicePoint).then(() => {
          testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
          Location.createViaApi(testData.defaultLocation).then((location) => {
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: testData.folioInstances,
              location,
            });
          });
        });
        cy.createTempUser([Permissions.uiUsersViewLoans.gui, Permissions.inventoryAll.gui]).then(
          (userProperties) => {
            testData.user = userProperties;
            cy.createTempUser([], testData.patronGroup.name).then((testUserProperties) => {
              testData.testUser.username = testUserProperties.username;
              testData.testUser.userId = testUserProperties.userId;
              testData.testUser.barcode = testUserProperties.barcode;
              UserEdit.addServicePointViaApi(testData.servicePoint.id, testUserProperties.userId);
              Checkout.checkoutItemViaApi({
                itemBarcode: testData.folioInstances[0].barcodes[0],
                servicePointId: testData.servicePoint.id,
                userBarcode: testUserProperties.barcode,
              });
              CheckInActions.checkinItemViaApi({
                itemBarcode: testData.folioInstances[0].barcodes[0],
                servicePointId: testData.servicePoint.id,
              });
              Checkout.checkoutItemViaApi({
                itemBarcode: testData.folioInstances[1].barcodes[0],
                servicePointId: testData.servicePoint.id,
                userBarcode: testUserProperties.barcode,
              });
              CheckInActions.checkinItemViaApi({
                itemBarcode: testData.folioInstances[1].barcodes[0],
                servicePointId: testData.servicePoint.id,
              });
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventorySearchAndFilter.switchToItem();
              InventorySearchAndFilter.searchByParameter(
                'Barcode',
                testData.folioInstances[0].barcodes[0],
              );
              ItemRecordView.waitLoading();
              ItemRecordView.openItemEditForm(testData.folioInstances[0].instanceTitle);
              ItemRecordEdit.addEffectiveCallNumber(
                testData.testUser.effectiveCallNumber1.prefix,
                testData.testUser.effectiveCallNumber1.number,
              );
              ItemRecordEdit.saveAndClose({ itemSaved: true });
              ItemRecordView.closeItemEditForm();

              InventorySearchAndFilter.switchToItem();
              InventorySearchAndFilter.searchByParameter(
                'Barcode',
                testData.folioInstances[1].barcodes[0],
              );
              ItemRecordView.waitLoading();
              ItemRecordView.openItemEditForm(testData.folioInstances[1].instanceTitle);
              ItemRecordEdit.addEffectiveCallNumber(
                testData.testUser.effectiveCallNumber2.prefix,
                testData.testUser.effectiveCallNumber2.number,
              );
              ItemRecordEdit.saveAndClose({ itemSaved: true });
              ItemRecordView.closeItemEditForm();
            });
          },
        );
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    testData.folioInstances.forEach((item) => {
      InventoryInstances.deleteInstanceViaApi({
        instance: item,
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
    });
    Users.deleteViaApi(testData.user.userId);
    Users.deleteViaApi(testData.testUser.userId);
    PatronGroups.deleteViaApi(testData.patronGroup.id);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C440072 Verify that Effective call number column is sortable for closed loans (volaris)',
    { tags: ['extendedPath', 'volaris', 'C440072'] },
    () => {
      // Step 1: Search for test user by barcode
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByBarcode(testData.testUser.barcode);

      // Step 2: Expand Loans accordion and click on closed loans
      Users.expandLoansAccordion();
      Users.clickClosedLoansLink();

      // Step 3: Click on Effective call number string column header for ascending sort
      LoansPage.clickEffectiveCallNumberHeader();
      LoansPage.verifyCallNumbersAscending();

      // Step 4: Click on Effective call number string column header again for descending sort
      LoansPage.clickEffectiveCallNumberHeader();
      LoansPage.verifyCallNumbersDescending();
    },
  );
});
