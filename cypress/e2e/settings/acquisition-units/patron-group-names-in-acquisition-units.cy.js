import permissions from '../../../support/dictionary/permissions';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Acquisition Units', () => {
  describe('Settings (ACQ Units)', () => {
    const testData = {
      patronGroup1: {
        name: getTestEntityValue('PatronGroup1'),
        description: getTestEntityValue('Description1'),
      },
      patronGroup2: {
        name: getTestEntityValue('PatronGroup2'),
      },
      au1: AcquisitionUnits.getDefaultAcquisitionUnit(),
      au2: AcquisitionUnits.getDefaultAcquisitionUnit(),
      newAU: {
        name: getTestEntityValue('ZNewAU'),
      },
      user1: {},
      user2: {},
    };
    let user;

    before('Create test data', () => {
      cy.getAdminToken();

      // Create patron groups
      PatronGroups.createViaApi(testData.patronGroup1.name, testData.patronGroup1.description).then(
        (patronGroupId) => {
          testData.patronGroup1.id = patronGroupId;

          // Create User #1 with Patron group #1
          cy.createTempUser([], testData.patronGroup1.name).then((userProperties) => {
            testData.user1 = userProperties;

            PatronGroups.createViaApi(testData.patronGroup2.name).then((patronGroup2Id) => {
              testData.patronGroup2.id = patronGroup2Id;

              // Create User #2 with Patron group #2
              cy.createTempUser([], testData.patronGroup2.name).then((user2Properties) => {
                testData.user2 = user2Properties;

                // Create acquisition units
                AcquisitionUnits.createAcquisitionUnitViaApi(testData.au1).then(() => {
                  // Assign User #1 and User #2 to AU1
                  AcquisitionUnits.assignUserViaApi(testData.user1.userId, testData.au1.id);
                  AcquisitionUnits.assignUserViaApi(testData.user2.userId, testData.au1.id);
                });

                AcquisitionUnits.createAcquisitionUnitViaApi(testData.au2).then(() => {
                  // Assign User #2 to AU2
                  AcquisitionUnits.assignUserViaApi(testData.user2.userId, testData.au2.id);
                });

                // Create user with required permissions
                cy.createTempUser([
                  permissions.uiSettingsAcquisitionUnitsViewEditCreateDelete.gui,
                ]).then((mainUserProperties) => {
                  user = mainUserProperties;

                  cy.login(user.username, user.password, {
                    path: SettingsMenu.acquisitionUnitsPath,
                    waiter: AcquisitionUnits.waitLoading,
                  });
                });
              });
            });
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(testData.user1.userId);
      Users.deleteViaApi(testData.user2.userId);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.au1.id);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.au2.id);
      // Delete new AU created during the test
      AcquisitionUnits.getAcquisitionUnitViaApi({ query: `name=="${testData.newAU.name}"` }).then(
        (response) => {
          if (response.acquisitionsUnits?.length) {
            AcquisitionUnits.deleteAcquisitionUnitViaApi(response.acquisitionsUnits[0].id);
          }
        },
      );
      PatronGroups.deleteViaApi(testData.patronGroup1.id);
      PatronGroups.deleteViaApi(testData.patronGroup2.id);
    });

    it(
      'C934326 Patron group names are correctly shown for assigned users, with proper focus behavior when creating or editing acquisition units (thunderjet)',
      { tags: ['smoke', 'thunderjet', 'C934326'] },
      () => {
        AcquisitionUnits.selectAU(testData.au1.name);
        AcquisitionUnits.verifyFocusOnDetailsPane(testData.au1.name);
        AcquisitionUnits.verifyAssignedUsersAccordion();
        AcquisitionUnits.verifyAssignedUsersTableContainsText(testData.user1.lastName);
        AcquisitionUnits.verifyAssignedUsersTableContainsText(testData.user2.lastName);
        AcquisitionUnits.verifyAssignedUsersTableContainsText(testData.patronGroup1.name, false);
        AcquisitionUnits.verifyAssignedUsersTableContainsText(testData.patronGroup2.name, false);

        AcquisitionUnits.editAU();
        AcquisitionUnits.verifyEditAUPage(testData.au1.name);
        AcquisitionUnits.verifyAssignedUsersTableContainsText(testData.patronGroup1.name, false);
        AcquisitionUnits.verifyAssignedUsersTableContainsText(testData.patronGroup2.name, false);

        AcquisitionUnits.closeEditAUPage();
        AcquisitionUnits.selectAU(testData.au2.name);
        AcquisitionUnits.verifyFocusOnDetailsPane(testData.au2.name);
        AcquisitionUnits.verifyAssignedUsersAccordion();
        AcquisitionUnits.verifyAssignedUsersTableContainsText(testData.user2.lastName);
        AcquisitionUnits.verifyAssignedUsersTableContainsText(testData.patronGroup2.name, false);

        AcquisitionUnits.newAcquisitionUnit();
        AcquisitionUnits.fillName(testData.newAU.name);
        AcquisitionUnits.clickSaveButton();
        cy.wait(4000);
        AcquisitionUnits.verifyFocusOnDetailsPane(testData.newAU.name);
        AcquisitionUnits.checkNoAssignedUsers();
        AcquisitionUnits.verifyFocusOnDetailsPane(testData.newAU.name);

        AcquisitionUnits.selectAU(testData.au2.name);
        AcquisitionUnits.verifyFocusOnDetailsPane(testData.au2.name);
        AcquisitionUnits.verifyAssignedUsersTableContainsText(testData.user2.lastName);

        AcquisitionUnits.editAU();
        AcquisitionUnits.verifyEditAUPage(testData.au2.name);
        AcquisitionUnits.verifyAssignedUsersTableContainsText(testData.patronGroup2.name, false);

        AcquisitionUnits.fillDescription(getTestEntityValue('TestDescription'));
        AcquisitionUnits.clickSaveButton();
        cy.wait(4000);
        AcquisitionUnits.verifyFocusOnDetailsPane(testData.au2.name);
        AcquisitionUnits.verifyAssignedUsersTableContainsText(testData.user2.lastName);
        AcquisitionUnits.verifyFocusOnDetailsPane(testData.au2.name);
      },
    );
  });
});
