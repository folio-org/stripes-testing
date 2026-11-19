import CapabilitySets from '../../support/dictionary/capabilitySets';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';

describe('Users', () => {
  const testData = {};
  // Specific patterns for uniqueness-check requests triggered by barcode/username fields
  const barcodeQueryUrl = /\/users\?query=.*barcode/;
  const usernameQueryUrl = /\/users\?query=.*username/;
  // Broad pattern for the "no requests" assertion: catches any method to any /users endpoint
  // (uniqueness GETs, form-submission PUTs/POSTs, etc.)
  const anyUsersRequestUrl = /\/users[?/]/;

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([]).then((userProps) => {
        testData.user = userProps;
        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [CapabilitySets.uiUsersEdit, CapabilitySets.uiUsersCreate],
        );
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    if (testData.user) Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1415774 DevTools | Unnecessary requests are not created when entering username, barcode and email (vega)',
    { tags: ['extendedPath', 'vega', 'C1415774'] },
    () => {
      // === Edit user form ===

      // Step 1: Navigate to user details pane and open Edit form
      UsersSearchPane.openUserCard(testData.user.username);
      UsersCard.waitLoading();
      UserEdit.openEdit();

      // Step 2: Enter barcode → exactly one users?query=(barcode...) request (debounce fires once)
      let editBarcodeCount = 0;
      cy.intercept('GET', barcodeQueryUrl, () => {
        editBarcodeCount++;
      });
      UserEdit.changeBarcode('testeditbarcode');
      cy.wait(1500);
      cy.then(() => expect(editBarcodeCount, 'edit barcode: exactly one request').to.equal(1));

      // Step 3: Edit username → exactly one users?query=(username...) request
      let editUsernameCount = 0;
      cy.intercept('GET', usernameQueryUrl, () => {
        editUsernameCount++;
      });
      UserEdit.changeUsername('testeditusername');
      cy.wait(1500);
      cy.then(() => expect(editUsernameCount, 'edit username: exactly one request').to.equal(1));

      // Step 4: Edit email → no requests to /users at all (no uniqueness check, no form submission)
      let editEmailCount = 0;
      cy.intercept(anyUsersRequestUrl, () => {
        editEmailCount++;
      });
      UserEdit.changeEmail('edit@example.com');
      cy.wait(1000);
      cy.then(() => expect(editEmailCount, 'edit email: no /users requests').to.equal(0));

      // Step 5: Edit phone → no requests to /users at all
      let editPhoneCount = 0;
      cy.intercept(anyUsersRequestUrl, () => {
        editPhoneCount++;
      });
      UserEdit.changePhone('1234567890');
      cy.wait(1000);
      cy.then(() => expect(editPhoneCount, 'edit phone: no /users requests').to.equal(0));

      // Step 6: Quickly enter couple chars in barcode → still exactly one request (debounce)
      let editBarcodeQuickCount = 0;
      cy.intercept('GET', barcodeQueryUrl, () => {
        editBarcodeQuickCount++;
      });
      UserEdit.changeBarcode('xy');
      cy.wait(1500);
      cy.then(() =>
        expect(editBarcodeQuickCount, 'edit barcode quick: exactly one request').to.equal(1),
      );

      // Step 7: Cancel without saving
      UserEdit.cancelChanges();

      // === Create user form ===

      // Step 8: Open Create User form from search results pane Actions menu
      UsersSearchResultsPane.openNewUser();
      UserEdit.waitLoadingCreateUser();

      // Step 9: Enter barcode → exactly one users?query=(barcode...) request
      let createBarcodeCount = 0;
      cy.intercept('GET', barcodeQueryUrl, () => {
        createBarcodeCount++;
      });
      UserEdit.changeBarcode('testnewbarcode');
      cy.wait(1500);
      cy.then(() => expect(createBarcodeCount, 'create barcode: exactly one request').to.equal(1));

      // Step 10: Enter username → exactly one users?query=(username...) request
      let createUsernameCount = 0;
      cy.intercept('GET', usernameQueryUrl, () => {
        createUsernameCount++;
      });
      UserEdit.changeUsername('testnewusername');
      cy.wait(1500);
      cy.then(() =>
        expect(createUsernameCount, 'create username: exactly one request').to.equal(1),
      );

      // Step 11: Enter email → no requests to /users at all
      let createEmailCount = 0;
      cy.intercept(anyUsersRequestUrl, () => {
        createEmailCount++;
      });
      UserEdit.changeEmail('create@example.com');
      cy.wait(1000);
      cy.then(() => expect(createEmailCount, 'create email: no /users requests').to.equal(0));

      // Step 12: Enter phone → no requests to /users at all
      let createPhoneCount = 0;
      cy.intercept(anyUsersRequestUrl, () => {
        createPhoneCount++;
      });
      UserEdit.changePhone('9876543210');
      cy.wait(1000);
      cy.then(() => expect(createPhoneCount, 'create phone: no /users requests').to.equal(0));

      // Step 13: Quickly enter couple chars in barcode → still exactly one request (debounce)
      let createBarcodeQuickCount = 0;
      cy.intercept('GET', barcodeQueryUrl, () => {
        createBarcodeQuickCount++;
      });
      UserEdit.changeBarcode('ab');
      cy.wait(1500);
      cy.then(() =>
        expect(createBarcodeQuickCount, 'create barcode quick: exactly one request').to.equal(1),
      );

      // Step 14: Cancel without saving — Create User page closes, user was not created
      UserEdit.cancelChanges();
    },
  );
});
