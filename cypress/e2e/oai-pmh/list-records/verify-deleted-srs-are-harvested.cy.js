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
  LOCATION_NAMES,
} from '../../../support/constants';

let user;
const marcInstance = { title: `AT_C375950_MarcInstance_${getRandomPostfix()}` };
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
];

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
        (instanceId) => {
          marcInstance.id = instanceId;

          cy.getInstanceById(instanceId).then((instanceData) => {
            marcInstance.hrid = instanceData.hrid;

            cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
              (location) => {
                cy.createSimpleMarcHoldingsViaAPI(
                  instanceData.id,
                  instanceData.hrid,
                  location.code,
                );
              },
            );
          });
        },
      );

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
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
    });

    it(
      'C375950 ListRecords: Verify that deleted SRS are harvested (firebird)',
      { tags: ['criticalPath', 'firebird', 'C375950'] },
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
        QuickMarcEditor.pressSaveAndClose();
        InstanceRecordView.verifyInstanceIsSetForDeletion();

        // Step 5: Send ListRecords request and verify deleted record is harvested
        cy.getAdminToken();
        OaiPmh.listRecordsRequest().then((response) => {
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, true, true);
        });
      },
    );
  });
});
