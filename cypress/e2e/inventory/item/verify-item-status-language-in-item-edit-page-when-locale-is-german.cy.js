import {
  Accordion,
  Button,
  KeyValue,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectOption,
  including,
} from '../../../../interactors';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import Checkout from '../../../support/fragments/checkout/checkout';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TemporarySessionLocale from '../../../support/fragments/settings/developer/session-locale/temporarySessionLocale';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const titlePrefix = `AT_C494106_FolioInstance_${randomPostfix}`;
    const germanLanguage = 'German (Germany) / Deutsch (Deutschland)';
    const germanPaneHeaderTitle = 'TEMPORÄRES Session-Gebietsschema';
    const defaultLanguage = 'American English / American English';
    const defaultPaneHeaderTitle = 'TEMPORARY Session locale';
    const availableBarcode = `${titlePrefix}_Available`;
    const checkedOutBarcode = `${titlePrefix}_CheckedOut`;
    // German UI labels, taken verbatim from TestRail - never guessed/translated by this test
    const germanLabels = {
      available: 'Verfügbar',
      checkedOut: 'Ausgeliehen',
      itemStatusAccordion: 'Exemplarstatus',
      holdingsAccordion: 'Bestand: Main Library',
      actions: 'Aktionen',
      edit: 'Bearbeiten',
      status: 'Status',
    };

    const testData = {};
    let instanceId;
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C494106_');

      cy.then(() => {
        cy.getMainLibraryLocation().then((location) => {
          testData.location = location;
        });
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          testData.materialTypeId = res.id;
        });
        ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
          testData.servicePoint = servicePoint;
        });
      })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              title: titlePrefix,
              instanceTypeId: testData.instanceTypeId,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.location.id,
              },
            ],
            items: [
              {
                barcode: availableBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
              {
                barcode: checkedOutBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((createdInstance) => {
            instanceId = createdInstance.instanceId;
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiSettingsDeveloperSessionLocale.gui,
          ]).then((createdUser) => {
            user = createdUser;
          });
        })
        .then(() => {
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            user.userId,
            testData.servicePoint.id,
          );
          // Transition the second item to "Checked out" - the first stays "Available"
          Checkout.checkoutItemViaApi({
            itemBarcode: checkedOutBarcode,
            servicePointId: testData.servicePoint.id,
            userBarcode: user.barcode,
          });
        })
        .then(() => {
          cy.login(user.username, user.password, {
            path: SettingsMenu.sessionLocalePath,
            waiter: TemporarySessionLocale.waitLoading,
          });
          TemporarySessionLocale.selectCountry(germanLanguage);
          TemporarySessionLocale.verifyTitleOfPaneHeader(germanPaneHeaderTitle);
        });
    });

    after('Delete test data, restore session locale', () => {
      cy.visit(SettingsMenu.sessionLocalePath);
      TemporarySessionLocale.waitLoading();
      TemporarySessionLocale.selectCountry(defaultLanguage);
      TemporarySessionLocale.verifyTitleOfPaneHeader(defaultPaneHeaderTitle);
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C494106 Verify the item status language in the instance\'s item edit page when session locale is "German" (promin)',
      { tags: ['extendedPath', 'promin', 'nonParallel', 'C494106'] },
      () => {
        // Step 1: "Exemplar" (Item) tab + "Exemplarstatus" (Item status) facet shows both
        // statuses in German. switchToItem() is locale-safe (id-based). The facet's own
        // toggle/multiselect are id-based too (see searchByStatus in inventorySearchAndFilter.js),
        // so only the option text itself needs to be German - written inline here since the
        // shared searchByStatus() clicks an option rather than just checking both are listed
        TopMenu.openInventoryApp();
        InventorySearchAndFilter.switchToItem();
        cy.do([
          Button({ id: 'accordion-toggle-button-itemStatus' }).click(),
          MultiSelect({ id: 'itemStatus-multiselect' }).open(),
        ]);
        cy.expect([
          MultiSelectOption(including(germanLabels.available)).exists(),
          MultiSelectOption(including(germanLabels.checkedOut)).exists(),
        ]);

        // Step 2: search and select the Instance
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 3: "Bestand" (Holdings) accordion - both Items show their status in German.
        // checkHoldingsStatus() unconditionally toggles the accordion header on every call, so
        // calling it twice would re-collapse it before the second check - expand once here and
        // check both rows directly instead (row 1 is the first item under the holdings, row 2
        // the second; row 0 is the holdings row itself)
        const holdingsAccordion = Accordion({ label: including(germanLabels.holdingsAccordion) });
        cy.do(holdingsAccordion.clickHeader());
        cy.expect([
          holdingsAccordion
            .find(MultiColumnListRow({ rowIndexInParent: 'row-1' }))
            .find(MultiColumnListCell({ content: germanLabels.available }))
            .exists(),
          holdingsAccordion
            .find(MultiColumnListRow({ rowIndexInParent: 'row-2' }))
            .find(MultiColumnListCell({ content: germanLabels.checkedOut }))
            .exists(),
        ]);

        // Step 4: open the "Verfügbar" item by its (locale-independent) barcode, edit it via
        // the German "Aktionen" -> "Bearbeiten" buttons (the shared ItemRecordView fragment
        // hardcodes the English "Actions"/"Edit" labels, so this test uses its own German
        // button text directly instead of modifying that shared, English-default fragment)
        InventoryInstance.openItemByBarcode(availableBarcode);
        cy.do([Button(germanLabels.actions).click(), Button(germanLabels.edit).click()]);
        cy.expect(KeyValue(germanLabels.status).has({ value: germanLabels.available }));

        // Step 5: repeat for the "Ausgeliehen" item
        cy.go('back');
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openItemByBarcode(checkedOutBarcode);
        cy.do([Button(germanLabels.actions).click(), Button(germanLabels.edit).click()]);
        cy.expect(KeyValue(germanLabels.status).has({ value: germanLabels.checkedOut }));
      },
    );
  });
});
