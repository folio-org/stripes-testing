import Permissions from '../../support/dictionary/permissions';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Users', () => {
  describe('Preferred contact', () => {
    const CONTACTS = {
      email: 'Email',
      mail: 'Mail (primary address)',
      sms: 'SMS text',
    };
    const EMAIL_CONTACT_TYPE_ID = '002';
    const testData = {
      patronGroup: {
        name: getTestEntityValue('C1453638_PatronGroup'),
        description: 'Patron_group_description',
      },
      newUserLastNames: {
        C1453638: getTestEntityValue('C1453638_LastName'),
        C1464338: getTestEntityValue('C1464338_LastName'),
      },
      // Existing users with "Preferred contact" = "Email", created via API
      existingUsers: {},
    };
    const patronGroupLabel = `${testData.patronGroup.name} (${testData.patronGroup.description})`;

    const createUserWithEmailPreferredContact = (caseId) => {
      const user = Users.generateUserModel();
      user.type = 'patron';
      user.patronGroup = testData.patronGroup.id;
      user.personal.lastName = getTestEntityValue(`${caseId}_LastName`);
      user.personal.preferredContactTypeIds = [EMAIL_CONTACT_TYPE_ID];
      return Users.createViaApi(user).then((createdUser) => {
        testData.existingUsers[caseId] = createdUser;
      });
    };

    const openNewUserForm = () => {
      UsersSearchResultsPane.openNewUser();
      Users.checkCreateUserPaneOpened();
    };

    before('Create test data', () => {
      cy.getAdminToken();
      PatronGroups.createViaApi(testData.patronGroup.name, testData.patronGroup.description).then(
        (patronGroupId) => {
          testData.patronGroup.id = patronGroupId;
          createUserWithEmailPreferredContact('C1453639');
          createUserWithEmailPreferredContact('C1464339');
        },
      );
      cy.createTempUser([Permissions.uiUsersCreate.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    beforeEach('Log in', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      // Covers both the API-created users and the users created in C1453638 and C1464338
      cy.getUsers({ query: `patronGroup=="${testData.patronGroup.id}"` }).then((users) => {
        users.forEach((user) => Users.deleteViaApi(user.id));
      });
      PatronGroups.deleteViaApi(testData.patronGroup.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1453638 - "Preferred contact" multi-select field: available options, default value, and edit behavior',
      { tags: ['extendedPath', 'helios', 'C1453638'] },
      () => {
        // Step 1: Click "Actions" → "New"
        openNewUserForm();

        // Step 2: "Preferred contact" is present in "Contact information" with "Email" pre-selected
        UserEdit.verifyPreferredContactSelected([CONTACTS.email]);

        // Step 3: Open the dropdown; three options are available
        UserEdit.openPreferredContactDropdown();
        UserEdit.verifyPreferredContactOptions([CONTACTS.email, CONTACTS.mail, CONTACTS.sms]);

        // Step 4: Select "Mail (primary address)"; both values have an "x" icon, dropdown stays open
        UserEdit.clickPreferredContactOption(CONTACTS.mail);
        UserEdit.verifyPreferredContactSelected([CONTACTS.email, CONTACTS.mail]);
        UserEdit.verifyPreferredContactRemoveIcons([CONTACTS.email, CONTACTS.mail]);
        UserEdit.verifyPreferredContactDropdownOpen();

        // Step 5: Remove "Email"; "Mail (primary address)" is the only selected value
        UserEdit.closePreferredContactDropdown();
        UserEdit.removePreferredContact(CONTACTS.email);
        UserEdit.verifyPreferredContactSelected([CONTACTS.mail]);

        // Step 6: Fill in the required fields (Email is required on the create form too) and save;
        // the app shows no success toast, so the save is verified by the user detail pane opening
        UserEdit.fillLastFirstNames(testData.newUserLastNames.C1453638);
        UserEdit.changePatronGroup(patronGroupLabel, { setExpirationDateIfModalExists: true });
        UserEdit.fillEmailAddress('test@folio.org');
        UserEdit.saveNewUser();
        UsersCard.waitLoading();

        // Step 7: "Preferred contact" in the detail pane shows "Mail (primary address)"
        Users.ensureAccordionOpen('Contact information');
        UsersCard.verifyPreferredContact(CONTACTS.mail);

        // Step 8: Edit; "Mail (primary address)" is selected, "Email" and "SMS text" are available
        UserEdit.openEdit();
        UserEdit.checkUserEditPaneOpened();
        UserEdit.verifyPreferredContactSelected([CONTACTS.mail]);
        UserEdit.openPreferredContactDropdown();
        UserEdit.verifyPreferredContactOptions([CONTACTS.email, CONTACTS.sms], { exact: false });
        UserEdit.closePreferredContactDropdown();

        // Step 9: Select "Email" and save; the detail pane lists both values
        UserEdit.changePreferredContact(CONTACTS.email);
        UserEdit.saveEditedUser();
        Users.ensureAccordionOpen('Contact information');
        UsersCard.verifyPreferredContact(`${CONTACTS.mail} and ${CONTACTS.email}`);
      },
    );

    it(
      'C1453639 - "Preferred contact" field: "Please select contact type" validation when no value is selected',
      { tags: ['extendedPath', 'helios', 'C1453639'] },
      () => {
        const { username } = testData.existingUsers.C1453639;

        // Precondition: the details pane of the user is open
        UsersSearchPane.searchByUsername(username);
        UsersCard.verifyUserDetailsPaneOpen();

        // Step 1: Click "Actions" → "Edit"
        UserEdit.openEdit();
        UserEdit.checkUserEditPaneOpened();

        // Step 2: Remove every selected value in "Preferred contact"
        UserEdit.removePreferredContact(CONTACTS.email);
        UserEdit.verifyPreferredContactSelected([]);

        // Step 3: Save is blocked with "Please select contact type". The browser's native
        // required-field tooltip shows first; leaving the field marks it as touched and dismisses
        // the tooltip, so the app's error becomes visible
        UserEdit.saveAndCloseStayOnEdit();
        UserEdit.leavePreferredContactField();
        UserEdit.verifyPreferredContactError('Please select contact type');
        UserEdit.checkUserEditPaneOpened();

        // Step 4: Select "Email" and save; the user detail pane opens
        UserEdit.changePreferredContact(CONTACTS.email);
        UserEdit.saveEditedUser();
        UsersCard.verifyUserDetailsPaneOpen();
      },
    );

    it(
      'C1464338 - Preferred contact selection persists on a new user record after save',
      { tags: ['criticalPath', 'helios', 'C1464338'] },
      () => {
        const savedContacts = [CONTACTS.email, CONTACTS.mail];

        // Step 1: Open the "Create user" form; "Preferred contact" is marked as required
        openNewUserForm();
        UserEdit.verifyPreferredContactRequired();

        // Step 2: Fill in Last name, Patron group, Email and Status = Active
        UserEdit.fillLastFirstNames(testData.newUserLastNames.C1464338);
        UserEdit.changePatronGroup(patronGroupLabel, { setExpirationDateIfModalExists: true });
        UserEdit.fillEmailAddress('test@folio.org');
        UserEdit.changeStatus('Active');

        // Step 3: Select "Email" and "Mail (primary address)"
        UserEdit.setPreferredContacts(savedContacts);
        UserEdit.verifyPreferredContactSelected(savedContacts);

        // Step 4: Save; the user details pane opens. The app shows no success toast
        UserEdit.saveNewUser();
        UsersCard.waitLoading();

        // Step 5: Reload the page; "Preferred contact" still shows both values
        cy.reload();
        UsersCard.waitLoading();
        Users.ensureAccordionOpen('Contact information');
        UsersCard.verifyPreferredContact(savedContacts.join(' and '));

        // Step 6: Edit; both values are still selected
        UserEdit.openEdit();
        UserEdit.checkUserEditPaneOpened();
        UserEdit.verifyPreferredContactSelected(savedContacts);
      },
    );

    it(
      'C1464339 - Preferred contact selection persists after editing an existing user record',
      { tags: ['extendedPath', 'helios', 'C1464339'] },
      () => {
        const { username } = testData.existingUsers.C1464339;

        // Step 1: Open the user's details and edit; "Preferred contact" = "Email"
        UsersSearchPane.searchByUsername(username);
        UsersCard.verifyUserDetailsPaneOpen();
        UserEdit.openEdit();
        UserEdit.checkUserEditPaneOpened();
        UserEdit.verifyPreferredContactSelected([CONTACTS.email]);

        // Step 2: Remove "Email" and select "Mail (primary address)"
        UserEdit.removePreferredContact(CONTACTS.email);
        UserEdit.changePreferredContact(CONTACTS.mail);
        UserEdit.verifyPreferredContactSelected([CONTACTS.mail]);

        // Step 3: Save & close; the form closes. The app shows no success toast
        UserEdit.saveEditedUser();
        UsersCard.verifyUserDetailsPaneOpen();

        // Step 4: Reload the page; "Preferred contact" shows only "Mail (primary address)"
        cy.reload();
        UsersCard.waitLoading();
        Users.ensureAccordionOpen('Contact information');
        UsersCard.verifyPreferredContact(CONTACTS.mail);

        // Step 5: Edit; only "Mail (primary address)" is selected
        UserEdit.openEdit();
        UserEdit.checkUserEditPaneOpened();
        UserEdit.verifyPreferredContactSelected([CONTACTS.mail]);
      },
    );
  });
});
