import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import EditRequest from '../../support/fragments/requests/edit-request';
import NewRequest from '../../support/fragments/requests/newRequest';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Requests', () => {
  const folioInstances = InventoryInstances.generateFolioInstances();
  const user = {};
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
  };
  const patronGroup = {
    name: `groupCheckIn ${getRandomPostfix()}`,
  };
  let requestUserData;

  before(() => {
    cy.getAdminToken()
      .then(() => {
        cy.getUsers({ limit: 1, query: '((barcode=" *") and active=="true")' }).then((users) => {
          user.barcode = users[0].barcode;
        });
      })
      .then(() => {
        cy.getLocations({ limit: 1 }).then((res) => {
          testData.locationId = res.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances,
          location: { id: testData.locationId },
        });
      })
      .then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
        Location.createViaApi(testData.defaultLocation);
      });

    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    cy.createTempUser([Permissions.uiRequestsAll.gui], patronGroup.name).then((userProperties) => {
      requestUserData = userProperties;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        requestUserData.userId,
        testData.servicePoint.id,
      );
      TitleLevelRequests.enableTLRViaApi();
      cy.login(requestUserData.username, requestUserData.password, {
        path: TopMenu.requestsPath,
        waiter: () => cy.wait(2000),
        authRefresh: true,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(requestUserData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    Users.deleteViaApi(requestUserData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C199704 Create a New Request with Patron Comment (vega) (TaaS)',
    { tags: ['criticalPath', 'vega', 'shiftLeft', 'C199704'] },
    () => {
      NewRequest.openNewRequestPane();
      NewRequest.verifyRequestInformation();
      NewRequest.enterItemInfo(folioInstances[0].barcodes[0]);
      NewRequest.enterRequestAndPatron('Test patron comment');
      NewRequest.enterRequesterInfoWithRequestType({
        requesterBarcode: user.barcode,
        pickupServicePoint: 'Circ Desk 1',
      });
      NewRequest.saveRequestAndClose();
      EditRequest.openRequestEditForm();
      EditRequest.verifyPatronCommentsFieldIsNotEditable();
      EditRequest.closeRequestPreview();
    },
  );
});
