import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import Users from '../../../support/fragments/users/users';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../support/fragments/topMenu';

describe('Permissions --> My Profile', () => {
  let userData;
  let servicePointId;

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
        servicePointId = servicePoints[0].id;
      });
      cy.createTempUser([permissions.uiUsersCanViewCustomFields.gui])
        .then((userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
        })
        .then(() => {
          cy.login(userData.username, userData.password);
        });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C388654 permission insufficient to view custom fields on user settings (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      cy.visit(TopMenu.customFieldsPath);
      CustomFields.waitLoading();
    },
  );
});
