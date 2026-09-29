import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import LoansPage from '../../support/fragments/loans/loansPage';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { LOCATION_NAMES } from '../../support/constants';

describe('Users', () => {
  const testData = {
    user: {},
    servicePoint: {},
    location: {},
    callNumbers: ['aBa cde', 'Abb and test', 'abc', 'ABD'],
    folioInstances: InventoryInstances.generateFolioInstances({
      count: 4,
      itemsProperties: [
        {
          itemLevelCallNumberPrefix: 'aBa',
          itemLevelCallNumber: 'cde',
          itemLevelCallNumberSuffix: '',
        },
        {
          itemLevelCallNumberPrefix: 'Abb',
          itemLevelCallNumber: 'and',
          itemLevelCallNumberSuffix: 'test',
        },
        {
          itemLevelCallNumberPrefix: '',
          itemLevelCallNumber: 'abc',
          itemLevelCallNumberSuffix: '',
        },
        {
          itemLevelCallNumberPrefix: '',
          itemLevelCallNumber: '',
          itemLevelCallNumberSuffix: 'ABD',
        },
      ],
    }),
  };

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
      testData.servicePoint = sp;
    });
    cy.createTempUser([Permissions.uiUsersViewLoans.gui]).then((userProperties) => {
      testData.user = userProperties;
      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
        testData.location = res;
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location: res,
        });
      });
      UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.user.userId);
      testData.folioInstances.forEach((instance) => {
        Checkout.checkoutItemViaApi({
          itemBarcode: instance.barcodes[0],
          servicePointId: testData.servicePoint.id,
          userBarcode: testData.user.barcode,
        });
      });
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    testData.folioInstances.forEach((item) => {
      InventoryInstances.deleteFullInstancesByTitleViaApi(item.title);
    });
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1504467 Loan sorting by call number is case-insensitive (vega)',
    { tags: ['extendedPath', 'vega', 'C1504467'] },
    () => {
      // Step 1
      UsersSearchPane.searchByBarcode(testData.user.barcode);
      Users.expandLoansAccordion();
      Users.clickOpenLoansLink();
      testData.callNumbers.forEach((callNumber) => {
        LoansPage.verifyCallNumberPresent(callNumber);
      });

      // Step 2
      LoansPage.clickEffectiveCallNumberHeader();
      LoansPage.verifyCallNumbersCaseInsensitivelySorted(false);

      // Step 3
      LoansPage.clickEffectiveCallNumberHeader();
      LoansPage.verifyCallNumbersCaseInsensitivelySorted(true);
    },
  );
});
