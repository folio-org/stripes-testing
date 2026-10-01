import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      bibTitle: `AT_C422154_MarcBibInstance_${randomPostfix}`,
      tags: {
        tag004: '004',
        tag008: '008',
        tag014: '014',
        tag852: '852',
      },
      // At least 2 subfields, mirroring TestRail's own 852 example content
      tag852ExtraSubfields: `$z AT_C422154_CurrentIssues_${randomPostfix} $x AT_C422154_CheckInRecord_${randomPostfix}`,
    };

    // Row indexes in this freshly-created record: LDR(0),001(1),005(2),004(3),008(4),852(5),999(6)
    const tag852RowIndex = 5;

    let user;
    let instanceId;
    let location;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((res) => {
          location = res;
        });

        cy.createSimpleMarcBibViaAPI(testData.bibTitle).then((id) => {
          instanceId = id;

          cy.getInstanceById(id).then((instanceData) => {
            cy.createMarcHoldingsViaAPI(instanceData.id, [
              { tag: testData.tags.tag004, content: instanceData.hrid },
              { tag: testData.tags.tag008, content: QuickMarcEditor.defaultValid008HoldingsValues },
              {
                tag: testData.tags.tag852,
                content: `$b ${location.code} ${testData.tag852ExtraSubfields}`,
                indicators: ['\\', '\\'],
              },
            ]);
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      if (instanceId) InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    });

    it(
      'C422154 Copy and paste from the MARC source view of the record to editing window of "MARC holdings" (promin)',
      { tags: ['extendedPath', 'promin', 'C422154'] },
      () => {
        let textFromSource;

        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 1: Open the "Holdings" detail view
        InventoryInstance.openHoldingView();

        // Step 2: View source - "$" is used as the subfield delimiter (implicitly verified below
        // via the literal "$"-prefixed content match)
        HoldingsRecordView.viewSource();
        InventoryViewSource.contains(testData.tag852ExtraSubfields);

        // Step 3: Copy at least 2 subfields from "852"
        InventoryViewSource.getContentFromRow(tag852RowIndex).then((copiedText) => {
          const lastTwoSubfields = copiedText.split('$').slice(-2).join('$');
          textFromSource = `$${lastTwoSubfields}`.trim();

          // Step 4: Close the source view - back to the "Holdings" detail view
          InventoryViewSource.close();
          HoldingsRecordView.waitLoading();

          // Step 5: Edit in quickMARC
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          // Step 6: Paste the copied value into a new field, NOT "852"
          QuickMarcEditor.addNewField(testData.tags.tag014, textFromSource, tag852RowIndex);
          QuickMarcEditor.checkContentByTag(testData.tags.tag014, textFromSource);

          // Step 7: Save & keep editing - the pasted value persists
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.checkContentByTag(testData.tags.tag014, textFromSource);
        });
      },
    );
  });
});
