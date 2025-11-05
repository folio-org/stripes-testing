import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import CapabilitiySets from '../../../support/dictionary/capabilitySets';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Courses from '../../../support/fragments/courses/courses';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';

describe('Eureka', () => {
  describe('Login', () => {
    const capabSetsToAssign = [
      CapabilitiySets.uiInventory,
      CapabilitiySets.uiCheckin,
      CapabilitiySets.uiCourses,
      CapabilitiySets.uiMarcAuthoritiesAuthorityRecordView,
    ];

    let tempUser;

    before('Create users, data', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((createdUserProperties) => {
        tempUser = createdUserProperties;
        cy.assignCapabilitiesToExistingUser(tempUser.userId, [], capabSetsToAssign);
      });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(tempUser.userId);
    });

    it(
      'C451519 Original URL restored after logging in (eureka)',
      { tags: ['smoke', 'eureka', 'C451519'] },
      () => {
        cy.login(tempUser.username, tempUser.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        cy.logout();

        cy.login(tempUser.username, tempUser.password, {
          path: TopMenu.checkInPath,
          waiter: CheckInActions.verifyAccessDeniedModal,
          authRefresh: true,
        });
        CheckInActions.closeAccessDeniedModal();
        cy.logout();

        cy.login(tempUser.username, tempUser.password, {
          path: TopMenu.coursesPath,
          waiter: Courses.waitLoading,
          authRefresh: true,
        });
        cy.logout();

        cy.login(tempUser.username, tempUser.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
          authRefresh: true,
        });
        cy.logout();

        cy.login(tempUser.username, tempUser.password);
      },
    );
  });
});
