import TopMenu from '../../support/fragments/topMenu';
import NewRequest from '../../support/fragments/requests/newRequest';
import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { REQUEST_TYPES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import EditRequest from '../../support/fragments/requests/edit-request';
import getRandomPostfix from '../../support/utils/stringTools';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Requests from '../../support/fragments/requests/requests';

describe('ui-requests: Request: Create a New Request with Patron Comment.', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
  };
  const patronGroup = {
    name: `groupCheckIn ${getRandomPostfix()}`,
  };
  let requestUserData;
  let requestId;

  before(() => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);

    InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
      testData.instance = instanceData;
    });

    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    cy.createTempUser([Permissions.requestsAll.gui], patronGroup.name).then((userProperties) => {
      requestUserData = userProperties;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        requestUserData.userId,
        testData.servicePoint.id,
      );
      cy.login(requestUserData.username, requestUserData.password);
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(requestUserData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    Requests.deleteRequestViaApi(requestId);
    Users.deleteViaApi(requestUserData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C199704 Request: Patron comments field is not editable after request is created (vega) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      cy.visit(TopMenu.requestsPath);
      NewRequest.openNewRequestPane();
      NewRequest.verifyRequestInformation();
      NewRequest.enterHridInfo(testData.instance.instanceId);
      NewRequest.enterRequestAndPatron('Test patron comment');
      NewRequest.enterRequesterInfoWithRequestType(
        {
          requesterBarcode: requestUserData.barcode,
          pickupServicePoint: 'Circ Desk 1',
        },
        REQUEST_TYPES.HOLD,
      );
      NewRequest.saveRequestAndClose();
      cy.intercept('POST', 'circulation/requests').as('createRequest');
      cy.wait('@createRequest').then((intercept) => {
        requestId = intercept.response.body.id;
        cy.location('pathname').should('eq', `/requests/view/${requestId}`);
      });
      EditRequest.openRequestEditForm();
      EditRequest.verifyPatronCommentsFieldIsNotEditable();
      EditRequest.closeRequestPreview();
    },
  );
});
