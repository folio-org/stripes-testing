import {
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_STATUS_DROPDOWN,
} from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const marcInstance = {
  title: `AT_C388544_MarcInstance_${getRandomPostfix()}`,
};
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
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
        (instanceId) => {
          marcInstance.id = instanceId;
        },
      );

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        cy.wait(5000);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C388544 GetRecord: SRS - Verify that value LDR 05 are properly return in the response (firebird)',
      { tags: ['extendedPath', 'firebird', 'C388544'] },
      () => {
        // Step 1-3: Send initial OAI-PMH GetRecord request with marc21 prefix
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id).then((response) => {
          // Step 4: Verify LDR position 05 has valid value (a, c, n, p)
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, false);
          OaiPmh.verifyMarcLeaderPosition05Value(response, marcInstance.id, 'n');
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '245',
            { ind1: '1', ind2: '0' },
            { a: marcInstance.title },
          );
        });

        // Step 5: Edit MARC record and change LDR position 05 to "d"
        cy.getUserToken(user.username, user.password);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.updateLDR06And07Positions();
        QuickMarcEditor.selectFieldsDropdownOption(
          'LDR',
          INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          INVENTORY_LDR_FIELD_STATUS_DROPDOWN.D,
        );

        // Step 6: Save & close
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // Step 7: Send GetRecord request with marc21_withholdings - should show deleted status
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, true, true);
        });

        // Step 8: Change LDR position 05 to "p"
        cy.getUserToken(user.username, user.password);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.selectFieldsDropdownOption(
          'LDR',
          INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          INVENTORY_LDR_FIELD_STATUS_DROPDOWN.P,
        );

        // Step 9: Save & close
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // Step 10: Send ListRecords request with marc21_withholdings
        cy.getAdminToken();
        OaiPmh.listRecordsRequest('marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '245',
            { ind1: '1', ind2: '0' },
            { a: marcInstance.title },
          );
          OaiPmh.verifyMarcLeaderPosition05Value(response, marcInstance.id, 'p');
        });

        // Step 11: Change LDR position 05 to "d"
        cy.getUserToken(user.username, user.password);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.selectFieldsDropdownOption(
          'LDR',
          INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          INVENTORY_LDR_FIELD_STATUS_DROPDOWN.D,
        );

        // Step 12: Save & close
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // Step 13: Send ListRecords request with marc21 - should show deleted
        cy.getAdminToken();
        OaiPmh.listRecordsRequest('marc21').then((response) => {
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, true);
        });

        // Step 14: Change LDR position 05 to "n"
        cy.getUserToken(user.username, user.password);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.selectFieldsDropdownOption(
          'LDR',
          INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          INVENTORY_LDR_FIELD_STATUS_DROPDOWN.N,
        );

        // Step 15: Save & close
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // Step 16: Send ListIdentifiers request with marc21_withholdings
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings').then((response) => {
          OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id);
        });

        // Step 17: Change LDR position 05 to "d"
        cy.getUserToken(user.username, user.password);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.selectFieldsDropdownOption(
          'LDR',
          INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          INVENTORY_LDR_FIELD_STATUS_DROPDOWN.D,
        );

        // Step 18: Save & close
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // Step 19: Send ListIdentifiers request with marc21 - should show deleted
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21').then((response) => {
          OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, true, true);
        });

        // Step 20: Change LDR position 05 to "a"
        cy.getUserToken(user.username, user.password);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.selectFieldsDropdownOption(
          'LDR',
          INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          INVENTORY_LDR_FIELD_STATUS_DROPDOWN.A,
        );

        // Step 21: Save & close
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // Step 22: Final GetRecord request with marc21_withholdings - should be active again
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, false);
          OaiPmh.verifyMarcLeaderPosition05Value(response, marcInstance.id, 'a');
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '245',
            { ind1: '1', ind2: '0' },
            { a: marcInstance.title },
          );
        });
      },
    );
  });
});
