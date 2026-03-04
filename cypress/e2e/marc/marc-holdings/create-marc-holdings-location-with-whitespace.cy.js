import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Create MARC holdings', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(5);
      const testData = {
        user: {},
        marcTitle: `AT_C805766_MarcBibInstance_${randomPostfix}`,
        locationName: `AT_C805766_Location_${randomPostfix}`,
        locationCode: `ATC805766LOC ${randomLetters}`,
        tag852: '852',
        tag868: '868',
        tag868Content: '$a test "whitespace"',
        servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      };

      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiInventoryViewCreateEditHoldings.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ])
          .then((userProperties) => {
            testData.user = userProperties;

            cy.createSimpleMarcBibViaAPI(testData.marcTitle).then((instanceId) => {
              createdInstanceId = instanceId;
            });
            ServicePoints.createViaApi(testData.servicePoint);
            testData.locationData = Location.getDefaultLocation(
              testData.servicePoint.id,
              testData.locationName,
              testData.locationCode,
            );
            Locations.createViaApi(testData.locationData);
          })
          .then(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(createdInstanceId);
        Users.deleteViaApi(testData.user.userId);
        ServicePoints.deleteViaApi(testData.servicePoint.id);
        Locations.deleteViaApi(testData.locationData);
      });

      it(
        'C805766 Create "MARC holdings" record with location which has "whitespace" in it\'s code (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C805766'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          InventoryInstance.goToMarcHoldingRecordAdding();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.selectExistingHoldingsLocation(testData.locationData);
          QuickMarcEditor.checkContentByTag(testData.tag852, `$b ${testData.locationCode} `);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkContentByTag(testData.tag852, `$b ${testData.locationCode}`);

          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.checkEmptyFieldAdded(5);
          QuickMarcEditor.addValuesToExistingField(4, testData.tag868, testData.tag868Content);
          QuickMarcEditor.checkContentByTag(testData.tag868, testData.tag868Content);

          cy.intercept({ method: 'PUT', url: /\/records-editor\/records(\/.*)?$/ }).as(
            'saveRecordRequest',
          );
          QuickMarcEditor.clickSaveAndKeepEditing();
          cy.wait('@saveRecordRequest').its('response.statusCode').should('eq', 202);
          QuickMarcEditor.checkContentByTag(testData.tag868, testData.tag868Content);
        },
      );
    });
  });
});
