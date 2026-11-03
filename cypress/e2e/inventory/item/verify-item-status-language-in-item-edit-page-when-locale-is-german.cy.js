import { Button, MultiColumnListCell, Pane, Section, including } from '../../../../interactors';
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
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const titlePrefix = `AT_C494106_FolioInstance_${randomPostfix}`;
    const germanLanguage = 'German (Germany) / Deutsch (Deutschland)';
    const germanPaneHeaderTitle = 'TEMPORÄRES Session-Gebietsschema';
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

    // InventoryInstance.openItemByBarcode() internally calls ItemRecordView.waitLoading(),
    // which does cy.contains('Item', ...) - hardcoded English, never matches under German
    // locale ("Exemplar"). The click itself (by barcode text) is locale-safe, so only the
    // wait needs replacing - with a locale-safe id-based check that the item pane opened
    const openItemByBarcode = (barcode) => {
      cy.wait(1500);
      cy.do(
        Section({ id: 'pane-instancedetails' })
          .find(MultiColumnListCell({ columnIndex: 1, content: barcode }))
          .find(Button(including(barcode)))
          .click(),
      );
      cy.expect(Pane({ id: 'item-view-pane' }).exists());
    };

    // Cancels the item edit form and navigates back to the instance view - specific to this
    // test's open item -> edit -> cancel -> close flow, so kept local rather than promoted to
    // a shared fragment method
    const cancelItemEditAndReturnToInstance = () => {
      ItemRecordEdit.cancel();
      cy.expect(Pane({ id: 'item-view-pane' }).exists());
      ItemRecordView.closeDetailView();
      InventoryInstance.waitLoading();
      InventoryInstance.waitInstanceRecordViewOpened();
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C494106_');

      cy.then(() => {
        cy.getMainLibraryLocation().then((location) => {
          testData.location = location;
        });
        cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1, query: 'source<>local' }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source<>local' }).then((res) => {
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
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      });
    });

    it(
      'C494106 Verify the item status language in the instance\'s item edit page when session locale is "German" (promin)',
      { tags: ['extendedPath', 'promin', 'nonParallel', 'C494106'] },
      () => {
        cy.login(user.username, user.password, {
          path: SettingsMenu.sessionLocalePath,
          waiter: TemporarySessionLocale.waitLoading,
        });
        TemporarySessionLocale.selectCountry(germanLanguage);
        TemporarySessionLocale.verifyTitleOfPaneHeader(germanPaneHeaderTitle);

        // Step 1: "Exemplar" (Item) tab + "Exemplarstatus" (Item status) facet shows both
        // statuses in German
        TopMenu.openInventoryApp();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.verifyItemStatusFacetOptionsExist([
          germanLabels.available,
          germanLabels.checkedOut,
        ]);

        // Step 2: search and select the Instance
        InventoryInstances.searchByTitle(titlePrefix);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 3: "Bestand" (Holdings) accordion - both Items show their status in German
        InventoryInstance.checkHoldingsAccordionContainsStatuses(
          [germanLabels.available, germanLabels.checkedOut],
          germanLabels.holdingsAccordion,
        );

        // Step 4: open the "Verfügbar" item by its (locale-independent) barcode, edit it via
        // the German "Aktionen" -> "Bearbeiten" buttons
        openItemByBarcode(availableBarcode);
        ItemRecordView.openItemEditFormWithLabels(germanLabels.actions, germanLabels.edit);
        ItemRecordEdit.checkTextFieldValue(germanLabels.status, germanLabels.available);

        // Step 5: repeat for the "Ausgeliehen" item
        cancelItemEditAndReturnToInstance();
        InventoryInstance.checkHoldingsAccordionContainsStatuses(
          [germanLabels.available, germanLabels.checkedOut],
          germanLabels.holdingsAccordion,
        );
        openItemByBarcode(checkedOutBarcode);
        ItemRecordView.openItemEditFormWithLabels(germanLabels.actions, germanLabels.edit);
        ItemRecordEdit.checkTextFieldValue(germanLabels.status, germanLabels.checkedOut);
      },
    );
  });
});
