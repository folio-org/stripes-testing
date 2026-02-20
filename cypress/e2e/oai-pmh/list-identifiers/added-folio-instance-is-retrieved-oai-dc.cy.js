import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import DateTools from '../../../support/utils/dateTools';

let user;
let folioInstanceId;
const folioInstance = {
  title: `AT_C376979_FolioInstance_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();

      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(folioInstanceId);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C376979 verb=ListIdentifiers: Verify that added Instance FOLIO is retrieved (oai_dc) (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C376979', 'nonParallel'] },
      () => {
        // Step 1: Go to Inventory app → Select Actions → Select "+New" button
        InventoryInstances.addNewInventory();

        // Step 2: Fill in "Resource title*" field with Instance's title
        // Step 3: Select from "Resource type*" dropdown
        InventoryNewInstance.fillRequiredValues(folioInstance.title);

        const fromDate = DateTools.getCurrentDateForOaiPmh();

        // Step 4: Click "Save and close" button
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitLoading();

        // Capture instance ID from URL
        cy.location('pathname').then((pathname) => {
          folioInstanceId = pathname.split('/').pop().split('?')[0];

          // Step 5: Send ListIdentifiers request with oai_dc metadata format
          cy.getAdminToken();
          const untilDate = DateTools.getCurrentDateForOaiPmh(1);

          OaiPmh.listIdentifiersRequest('oai_dc', fromDate, untilDate).then((response) => {
            // Verify instance appears in response
            OaiPmh.verifyIdentifierInListResponse(response, folioInstanceId);
          });
        });
      },
    );
  });
});
