import permissions from '../../../support/dictionary/permissions';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';

describe('Users', () => {
  describe('Custom Fields (Users)', () => {
    let userData;
    let servicePointId;

    before('Preconditions', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi().then(
          (servicePoint) => {
            servicePointId = servicePoint.id;
          },
        );
        cy.createTempUser([permissions.uiUsersCanViewCustomFields.gui])
          .then((userProperties) => {
            userData = userProperties;
            UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
          });
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C388654 permission insufficient to view custom fields on user settings (volaris)',
      { tags: ['extendedPath', 'volaris', 'C388654', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password,
          { path: TopMenu.customFieldsPath, waiter: CustomFields.waitLoading });
        CustomFields.waitLoading();
      },
    );
  });
});
