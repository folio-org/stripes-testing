import { getTestEntityValue } from '../../support/utils/stringTools';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import LoansPage from '../../support/fragments/loans/loansPage';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';

describe('Effective call number column is sortable', () => {
  const testData = {
    user: {},
    patronGroup: {
      name: getTestEntityValue('PatronGroup'),
      description: 'Patron_group_description',
    },
    effectiveCallNumber1: { prefix: '055', number: '1234562' },
    effectiveCallNumber2: { prefix: '056', number: '1234562' },
    servicePoint: {},
    defaultLocation: {},
    folioInstances: InventoryInstances.generateFolioInstances({
      count: 2,
      itemsProperties: [
        { itemLevelCallNumber: '1234562', itemLevelCallNumberPrefix: '055' },
        { itemLevelCallNumber: '1234562', itemLevelCallNumberPrefix: '056' },
      ],
    }),
  };

  before('Create test data', () => {
    cy.getAdminToken();
    PatronGroups.createViaApi(testData.patronGroup.name, testData.patronGroup.description).then(
      (patronGroupResponse) => {
        testData.patronGroup.id = patronGroupResponse;
        ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
          testData.servicePoint = sp;
          testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
          Location.createViaApi(testData.defaultLocation).then((location) => {
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: testData.folioInstances,
              location,
            });
          });
        });

        cy.createTempUser(
          [Permissions.uiUsersViewLoans.gui, Permissions.inventoryAll.gui],
          testData.patronGroup.name,
        ).then((userProperties) => {
          testData.user = userProperties;
          UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.user.userId);
          Checkout.checkoutItemViaApi({
            itemBarcode: testData.folioInstances[0].barcodes[0],
            servicePointId: testData.servicePoint.id,
            userBarcode: testData.user.barcode,
          });
          Checkout.checkoutItemViaApi({
            itemBarcode: testData.folioInstances[1].barcodes[0],
            servicePointId: testData.servicePoint.id,
            userBarcode: testData.user.barcode,
          });
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
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
    PatronGroups.deleteViaApi(testData.patronGroup.id);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C440071 Verify that Effective call number column is sortable for open loans (volaris)',
    { tags: ['extendedPath', 'volaris', 'C440071'] },
    () => {
      // Step 1: Search for test user by barcode
      UsersSearchPane.searchByBarcode(testData.user.barcode);

      // Step 2: Expand Loans accordion and click on open loans
      Users.expandLoansAccordion();
      Users.clickOpenLoansLink();

      // Step 3: Expand Select columns dropdown and check Effective call number string
      LoansPage.clickSelectColumnsDropdown();
      LoansPage.verifyEffectiveCallNumberCheckboxChecked(true);
      LoansPage.verifyEffectiveCallNumberColumnVisibility('visible');
      LoansPage.clickSelectColumnsDropdown();

      // Step 4: Click on Effective call number string column header for ascending sort
      LoansPage.clickEffectiveCallNumberHeader();
      LoansPage.verifyCallNumbersAscending();

      cy.waitForAuthRefresh(() => {
        cy.reload();
      }, 20_000);

      // Step 5: Click on Effective call number string column header again for descending sort
      LoansPage.clickEffectiveCallNumberHeader();
      LoansPage.verifyCallNumbersDescending();
    },
  );
});
