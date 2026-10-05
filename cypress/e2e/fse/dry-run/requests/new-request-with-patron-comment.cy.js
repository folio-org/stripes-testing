import { LOCATION_IDS } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import EditRequest from '../../../../support/fragments/requests/edit-request';
import NewRequest from '../../../../support/fragments/requests/newRequest';
import TitleLevelRequests from '../../../../support/fragments/settings/circulation/titleLevelRequests';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../../../support/fragments/topMenu';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Requests', () => {
  const folioInstances = InventoryInstances.generateFolioInstances();
  const testData = {};
  const patronGroup = {
    name: `groupCheckIn ${getRandomPostfix()}`,
  };
  let requestUserData;
  const { user, memberTenant } = parseSanityParameters();

  before(() => {
    cy.setTenant(memberTenant.id);
    cy.wrap(true).then(() => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();
    }).then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
        testData.servicePoint = servicePoint;
        testData.locationId = LOCATION_IDS.MAIN_LIBRARY;
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances,
          location: { id: testData.locationId },
        });
      });
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

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.requestsPath,
        waiter: () => cy.wait(2000),
      });
      cy.allure().logCommandSteps();
    });
  });

  after('Deleting created entities', () => {
    cy.allure().logCommandSteps(false);
    cy.getUserToken(user.username, user.password);
    cy.allure().logCommandSteps();
    InventoryInstances.deleteInstanceViaApi({
      instance: folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
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
        requesterBarcode: requestUserData.barcode,
        pickupServicePoint: 'Circ Desk 1',
      });
      NewRequest.saveRequestAndClose();
      EditRequest.openRequestEditForm();
      EditRequest.verifyPatronCommentsFieldIsNotEditable();
      EditRequest.closeRequestPreview();
    },
  );
});
