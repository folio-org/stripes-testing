import TopMenu from '../../support/fragments/topMenu';
import NewRequest from '../../support/fragments/requests/newRequest';
import { DevTeams, TestTypes } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import EditRequest from '../../support/fragments/requests/edit-request';

describe('ui-requests: Request: Create a New Request with Patron Comment.', () => {
  const folioInstances = InventoryInstances.generateFolioInstances();
  const user = {};
  const testData = {};

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken()
      .then(() => {
        cy.getUsers({ limit: 1, query: '"barcode"="" and "active"="true"' }).then((users) => {
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
      });
  });

  it(
    'C199704 Request: Patron comments field is not editable after request is created (vega) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      cy.visit(TopMenu.requestsPath);
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
