import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DateTools from '../../../support/utils/dateTools';

let user;
let currentDate;
const folioInstance = {
  title: `AT_C376976_FolioInstance_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      currentDate = DateTools.getCurrentDateForOaiPmh();

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        cy.getLocations({ limit: 1 }).then((res) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: folioInstance.title,
            },
            holdings: [
              {
                permanentLocationId: res.id,
              },
            ],
          }).then((instanceData) => {
            folioInstance.id = instanceData.instanceId;
          });
        });
      });

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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C376976 ListIdentifiers: Verify Instance FOLIO suppressed from discovery settings in case Skip suppressed from discovery records (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C376976', 'nonParallel'] },
      () => {
        // Step 1-2: Search for FOLIO instance
        InventorySearchAndFilter.selectSearchOption(
          'Keyword (title, contributor, identifier, HRID, UUID)',
        );
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 3-5: Edit instance and suppress from discovery
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.clickDiscoverySuppressCheckbox();
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();

        // Step 6: Send OAI-PMH ListIdentifiers request - verify suppressed record is NOT present
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', currentDate).then((response) => {
          OaiPmh.verifyIdentifierInListResponse(response, folioInstance.id, false);
        });
      },
    );
  });
});
