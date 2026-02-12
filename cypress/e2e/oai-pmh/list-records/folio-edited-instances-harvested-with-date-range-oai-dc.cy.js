import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import DateTools from '../../../support/utils/dateTools';

let user;
const testData = {
  instanceTitle: `AT_C376980_FolioInstance_${getRandomPostfix()}`,
  editedTitle: `AT_C376980_Edited_${getRandomPostfix()}`,
  instanceId: null,
};

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('create test data', () => {
      cy.getAdminToken();

      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: testData.instanceTitle,
          },
        }).then((createdInstanceData) => {
          testData.instanceId = createdInstanceData.instanceId;
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C376980 ListRecords: FOLIO edited instances are harvested with start and end date (oai_dc) (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C376980', 'nonParallel'] },
      () => {
        // Step 1: Search for FOLIO instance by Source filter
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 2: Open instance detail view
        InstanceRecordView.verifyInstanceRecordViewOpened();

        // Step 3: Edit instance
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();

        // Step 4: Modify instance title
        InstanceRecordEdit.fillResourceTitle(testData.editedTitle);

        // Step 5: Save and note instance UUID
        InstanceRecordEdit.saveAndClose();

        const fromDate = DateTools.getCurrentDateForOaiPmh();

        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyResourceTitle(testData.editedTitle);

        // Step 6: Send ListRecords request with date range and verify response
        cy.getAdminToken();
        const untilDate = DateTools.getCurrentDateForOaiPmh(1);

        OaiPmh.listRecordsRequest('oai_dc', fromDate, untilDate).then((response) => {
          OaiPmh.verifyDublinCoreField(response, testData.instanceId, {
            title: testData.editedTitle,
            rights: 'discovery not suppressed',
          });
          OaiPmh.verifyOaiPmhRecordHeader(response, testData.instanceId, false, true);
        });
      },
    );
  });
});
