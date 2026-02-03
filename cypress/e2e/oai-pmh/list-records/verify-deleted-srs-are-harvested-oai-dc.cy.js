import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
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
import DateTools from '../../../support/utils/dateTools';

let user;
const marcInstance = { title: `AT_C376985_MarcInstance_${getRandomPostfix()}` };

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

      cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
        marcInstance.id = instanceId;

        cy.getInstanceById(instanceId).then((instanceData) => {
          marcInstance.hrid = instanceData.hrid;
        });
      });

      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
        // For clear test results, it is necessary to wait to ensure that
        // deleting the record is treated as an update to the Instance record
        cy.wait(60_000);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
    });

    it(
      'C376985 ListRecords: Verify that deleted SRS are harvested (oai_dc) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C376985'] },
      () => {
        // Step 1: Search for any SRS inventory instance by selecting "MARC" option from "Source" filter
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 2: Click "Actions" button => Select "Edit MARC bibliographic record"
        InstanceRecordView.editMarcBibliographicRecord();

        // Step 3: Edit 05 position of "LDR" field to "d"
        QuickMarcEditor.updateLDR06And07Positions();
        QuickMarcEditor.selectFieldsDropdownOption(
          'LDR',
          AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.D,
        );

        // Step 4: Click on the "Save & close" button
        const dateAndTimeOfDeletion = DateTools.getCurrentDateForOaiPmh();

        QuickMarcEditor.pressSaveAndClose();
        InstanceRecordView.verifyInstanceIsSetForDeletion();

        // Step 5: Send ListRecords request with oai_dc and verify deleted record is harvested
        cy.getAdminToken();
        OaiPmh.listRecordsRequest('oai_dc', dateAndTimeOfDeletion).then((response) => {
          // Verify that the record is present with deleted status in OAI-PMH response
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, true, true);
        });
      },
    );
  });
});
