import moment from 'moment';
import uuid from 'uuid';
import { recurse } from 'cypress-recurse';
import { Permissions } from '../../support/dictionary';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import FileManager from '../../support/utils/fileManager';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Loans', () => {
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const userData = {};
  const overdueUser = {};
  let loanPolicyId;
  let overdueItemData;

  const EXPECTED_CSV_COLUMNS = [
    'Borrower name',
    'Borrower barcode',
    'Borrower ID',
    'Due date',
    'Loan date',
    'Loan policy',
    'Loan policy ID',
    'Loan ID',
    'Fee/Fine',
    'Item title',
    'Material type',
    'Item status',
    'Barcode',
    'Call number prefix',
    'Call number',
    'Call number suffix',
    'Volume',
    'Enumeration',
    'Chronology',
    'Copy number',
    'Contributors',
    'Location',
    'Instance ID',
    'Holdings ID',
    'Item ID',
  ];

  before('Create test data', () => {
    cy.getAdminToken();

    ServicePoints.createViaApi(testData.userServicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
    Location.createViaApi(testData.defaultLocation);

    // Create a loan policy with 1 minute duration to make the loan overdue quickly
    const loanPolicyBody = {
      id: uuid(),
      name: getTestEntityValue('1_minute_loan_policy'),
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
        period: {
          duration: 1,
          intervalId: 'Minutes',
        },
        profileId: 'Rolling',
      },
      renewable: false,
    };

    LoanPolicy.createViaApi(loanPolicyBody).then((policy) => {
      loanPolicyId = policy.id;
    });

    // Create inventory instance for overdue loan
    overdueItemData = InventoryInstances.generateFolioInstances({
      count: 1,
    })[0];

    InventoryInstances.createFolioInstancesViaApi({
      folioInstances: [overdueItemData],
      location: testData.defaultLocation,
    });

    // Create user with overdue loan
    cy.createTempUser([Permissions.uiUsersView.gui, Permissions.uiUsersViewLoans.gui]).then(
      (userProperties) => {
        overdueUser.username = userProperties.username;
        overdueUser.password = userProperties.password;
        overdueUser.userId = userProperties.userId;
        overdueUser.barcode = userProperties.barcode;
        overdueUser.firstName = userProperties.firstName;
        overdueUser.lastName = userProperties.lastName;
        overdueUser.middleName = userProperties.middleName;

        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          overdueUser.userId,
          testData.userServicePoint.id,
        );

        // Checkout item with past due date to create overdue loan
        const pastDueDate = moment().subtract(2, 'days').toISOString();
        Checkout.checkoutItemViaApi({
          itemBarcode: overdueItemData.barcodes[0],
          servicePointId: testData.userServicePoint.id,
          userBarcode: overdueUser.barcode,
        }).then((loan) => {
          // Update the loan to have a past due date
          cy.okapiRequest({
            method: 'PUT',
            path: `circulation/loans/${loan.id}`,
            body: {
              ...loan,
              dueDate: pastDueDate,
            },
            isDefaultSearchParamsRequired: false,
          });
        });
      },
    );

    // Create admin user for accessing Users app
    cy.createTempUser([Permissions.uiUsersView.gui, Permissions.uiUsersViewLoans.gui]).then(
      (userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(overdueUser.userId, [testData.userServicePoint.id]);

    // Check in the item manually to avoid circulation rules error
    cy.okapiRequest({
      method: 'GET',
      path: `circulation/loans?query=(userId=="${overdueUser.userId}")`,
      isDefaultSearchParamsRequired: false,
    }).then((response) => {
      if (response.body.loans && response.body.loans.length > 0) {
        const loanId = response.body.loans[0].id;
        cy.okapiRequest({
          method: 'PUT',
          path: `circulation/loans/${loanId}`,
          body: {
            ...response.body.loans[0],
            status: { name: 'Closed' },
            action: 'checkedin',
            checkinServicePointId: testData.userServicePoint.id,
          },
          isDefaultSearchParamsRequired: false,
        });
      }
    });

    Users.deleteViaApi(overdueUser.userId);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: overdueItemData,
      servicePoint: testData.userServicePoint,
      shouldCheckIn: false,
    });
    LoanPolicy.deleteApi(loanPolicyId);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  });

  it(
    'C779 Loans: export all overdue loans (vega)',
    { tags: ['extendedPath', 'vega', 'C779'] },
    () => {
      cy.login(userData.username, userData.password);
      cy.visit(TopMenu.usersPath);

      // Click "overdue loans export" from Actions menu
      UsersSearchResultsPane.exportOverdueLoans();

      // Wait for CSV file to download using recurse pattern
      const fileNameMask = '*.csv';

      recurse(
        () => FileManager.findDownloadedFilesByMask(fileNameMask),
        (x) => typeof x === 'object' && !!x && x.length > 0,
        {
          timeout: 30000,
          delay: 1000,
        },
      ).then((foundFiles) => {
        const lastDownloadedFile = foundFiles.sort()[foundFiles.length - 1];
        const fileName = lastDownloadedFile.split('/').pop();

        cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
          // Verify all required columns are present
          EXPECTED_CSV_COLUMNS.forEach((column) => {
            expect(fileContent).to.include(column);
          });

          // Verify overdue loan data is present in export
          expect(fileContent).to.include(overdueUser.userId);
          expect(fileContent).to.include(overdueItemData.barcodes[0]);
          expect(fileContent).to.include(overdueItemData.instanceTitle);
          expect(fileContent).to.include(overdueItemData.instanceId);
        });
      });
    },
  );
});
