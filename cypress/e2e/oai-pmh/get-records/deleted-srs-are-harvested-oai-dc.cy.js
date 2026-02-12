import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import {
  AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES,
  AUTHORITY_LDR_FIELD_STATUS_DROPDOWN,
} from '../../../support/constants';

let user;
const marcInstance = { title: `AT_C376996_MarcInstance_${getRandomPostfix()}` };

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
        marcInstance.id = instanceId;
      });

      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C376996 GetRecords: SRS & Inventory - Verify that deleted SRS are harvested (oai_dc) (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C376996', 'nonParallel'] },
      () => {
        // Step 1: Search for SRS instance by selecting "MARC" option from "Source" filter
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 2: Click "Actions" button => Select "Edit MARC bibliographic record"
        InstanceRecordView.editMarcBibliographicRecord();

        // Step 3-4: Edit 05 position of "LDR" field to "d" => Save & close
        QuickMarcEditor.updateLDR06And07Positions();
        QuickMarcEditor.selectFieldsDropdownOption(
          'LDR',
          AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.D,
        );
        QuickMarcEditor.pressSaveAndClose();
        InstanceRecordView.verifyInstanceIsSetForDeletion();

        // Step 5: Send GetRecord request with oai_dc and verify deleted record is harvested
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'oai_dc').then((response) => {
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, true, true);
          OaiPmh.verifyOaiPmhHeaderDatestamp(response, marcInstance.id);
          OaiPmh.verifyMetadataAbsent(response, marcInstance.id);
        });
      },
    );
  });
});
