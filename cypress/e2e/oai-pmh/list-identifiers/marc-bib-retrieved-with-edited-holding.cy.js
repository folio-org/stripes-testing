import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import { LOCATION_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';

let user;
let afterHoldingCreatedTimestamp;
const marcInstance = {
  title: `AT_C380621_MarcInstance_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
          marcInstance.id = instanceId;

          cy.getInstanceById(marcInstance.id).then((instanceData) => {
            marcInstance.hrid = instanceData.hrid;

            cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
              (location) => {
                cy.createSimpleMarcHoldingsViaAPI(
                  marcInstance.id,
                  marcInstance.hrid,
                  location.code,
                ).then((holdingsId) => {
                  marcInstance.holdingsId = holdingsId;
                });
              },
            );
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });

        // For clear test results, it is necessary to wait to ensure that
        // editing holdings is treated as an update to the Instance record
        cy.wait(60_000);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C380621 verb=ListIdentifiers: Verify that MARC BIB is retrieved in case its Holding MARC is edited (marc21_withholdings) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C380621'] },
      () => {
        afterHoldingCreatedTimestamp = DateTools.getCurrentDateForOaiPmh();

        // Step 1-3: Go to Inventory app and find MARC instance with MARC holdings
        InventoryInstances.searchByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings(['']);

        // Step 4-5: Verify that response doesn't initially include Instance MARC record
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterHoldingCreatedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, false);
          },
        );

        // Step 6: Click "View holdings" button
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();

        // Step 7: Click Actions menu => click "Edit in quickMARC"
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();

        // Step 8: Edit any field of MARC Holdings (edit 852 field with different location)
        QuickMarcEditor.updateExistingField('852', '$b KU/CC/DI/A');

        // Step 9: Click the "Save & close" button
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();

        // Step 10: Close Holdings window
        HoldingsRecordView.checkHoldingRecordViewOpened();
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();

        // Step 11: Send ListIdentifiers request and verify Instance MARC is now retrieved
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterHoldingCreatedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, true);
          },
        );
      },
    );
  });
});
