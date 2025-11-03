import {
  INSTANCE_SOURCE_NAMES,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      tagLDR: 'LDR',
      tag001: '001',
      tag004: '004',
      tag005: '005',
      tag151: '151',
      tag400: '400',
      tag852: '852',
      tag866: '866',
      tag999: '999',
      tag866Value: 'Test',
      headerTitle: 'Create a new MARC Holdings record',
      headerSubtitle: 'New',
      tagLDRValueInSourceMask: /LEADER\s\d{5}[c,d,n][u,v,x,y]\s{3}22\d{5}[1,2,3,4,5,m,u,z].\s4500/,
      tag001ValueInSourceMask: /[a-z]+\d+/,
      tag004ValueInSourceMask: /[a-z]+\d+/,
      tag005ValueInSourceMask: /\d+.\d+/,
      tag999ValueInSourceMask: /f\sf\$s\s.+\s\$i\s.+\S/,
      default008BoxesValues: [
        '0',
        'u',
        '\\\\\\\\',
        '0',
        '\\',
        '\\',
        '\\',
        '0',
        '\\\\\\',
        'u',
        'u',
        'eng',
        '0',
        '\\\\\\\\\\\\',
      ],
      sourceMARC: INSTANCE_SOURCE_NAMES.MARC,
      tag852callout: 'Record cannot be saved. An 852 is required.',
    };

    const bibTitlePrefix = `AutoMARC ${getRandomPostfix()}`;

    let user;
    const instanceIds = [];
    const holdingsIds = [];
    let location;

    before('Create user, data', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;

        cy.getLocations().then((loc) => {
          location = loc;
          cy.log(JSON.stringify(loc, null, 2));

          for (let i = 0; i < 3; i++) {
            cy.createSimpleMarcBibViaAPI(`${bibTitlePrefix} ${i}`);
            QuickMarcEditor.getCreatedMarcBib(`${bibTitlePrefix} ${i}`).then((bib) => {
              instanceIds.push(bib.id);
            });
          }
        });
      });
    });

    before('Create first holdings', () => {
      cy.createSimpleMarcBibViaAPI(`${bibTitlePrefix} Initial`);
      QuickMarcEditor.getCreatedMarcBib(`${bibTitlePrefix} Initial`).then((bib) => {
        instanceIds.push(bib.id);
        cy.createSimpleMarcHoldingsViaAPI(
          bib.id,
          bib.hrid,
          location.code,
          `${bibTitlePrefix} Initial`,
        );
        QuickMarcEditor.getCreatedMarcHoldings(bib.id, `${bibTitlePrefix} Initial`).then((hold) => {
          holdingsIds.push(hold.id);
        });
      });
    });

    beforeEach('Login', () => {
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      holdingsIds.forEach((holdingsId) => {
        cy.deleteHoldingRecordViaApi(holdingsId);
      });
      instanceIds.forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C704300 "008" field existence validation when create new "MARC Holdings" (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C704300'], retries: 1 },
      () => {
        InventoryInstances.searchByTitle(instanceIds[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.updateExistingField('852', QuickMarcEditor.getExistingLocation());
        QuickMarcEditor.updateExistingTagValue(4, '00');
        QuickMarcEditor.checkDeleteButtonExist(4);
        QuickMarcEditor.deleteFieldAndCheck(4, '008');
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkDelete008Callout();
        QuickMarcEditor.undoDelete();
        QuickMarcEditor.updateExistingTagValue(4, '008');
        QuickMarcEditor.checkSubfieldsPresenceInTag008();
        QuickMarcEditor.clearCertain008Boxes(
          'AcqStatus',
          'AcqMethod',
          'Gen ret',
          'Compl',
          'Lend',
          'Repro',
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.LANG,
          'Sep/comp',
        );
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
          // "Edit in quickMARC" option might not be active immediately after creating MARC Holdings
          // this option becomes active after reopening Holdings view window
          HoldingsRecordView.close();
          InventoryInstance.openHoldingView();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.check008FieldsEmptyHoldings();
          InventorySteps.verifyHiddenFieldValueIn008(
            holdingsID,
            'Date Ent',
            DateTools.getCurrentDateYYMMDD(),
          );
          holdingsIds.push(holdingsID);
        });
      },
    );

    it(
      'C350646 Create a new MARC Holdings record for existing "Instance" record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'shiftLeft', 'C350646'] },
      () => {
        InventoryInstances.searchBySource(INSTANCE_SOURCE_NAMES.MARC);
        InventoryInstances.searchByTitle(instanceIds[1]);
        InventoryInstance.checkExpectedMARCSource();
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.verifySaveAndCloseButtonEnabled(false);
        QuickMarcEditor.updateExistingField(testData.tag852, QuickMarcEditor.getExistingLocation());
        QuickMarcEditor.verifySaveAndCloseButtonEnabled();
        QuickMarcEditor.addEmptyFields(5);
        QuickMarcEditor.updateExistingTagValue(6, testData.tag866);
        QuickMarcEditor.updateExistingField(testData.tag866, testData.tag866Value);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
          holdingsIds.push(holdingsID);
          HoldingsRecordView.close();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.viewSource();
          HoldingsRecordView.closeSourceView();
          InventoryInstance.verifyLastUpdatedDate();
          InventoryInstance.verifyRecordStatus(`Source: ${user.lastName}, ${user.firstName}`);
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkUserNameInHeader(user.firstName, user.lastName);
        });
      },
    );

    it(
      'C350757 MARC fields behavior when creating "MARC Holdings" record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C350757'] },
      () => {
        InventoryInstances.searchByTitle(instanceIds[0]);
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkPaneheaderContains(testData.headerTitle);
        QuickMarcEditor.checkPaneheaderContains(testData.headerSubtitle);
        QuickMarcEditor.verifyInitialLDRFieldsValuesInMarcHoldingRecord();
        QuickMarcEditor.checkReadOnlyHoldingsTags();
        QuickMarcEditor.verifyHoldingsDefault008BoxesValues(testData.default008BoxesValues);
        QuickMarcEditor.verifyTagValue(5, testData.tag852);
        QuickMarcEditor.verifyTagValue(6, testData.tag999);
        QuickMarcEditor.checkContent('', 5);
        QuickMarcEditor.updateExistingField(testData.tag852, QuickMarcEditor.getExistingLocation());
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
          holdingsIds.push(holdingsID);
          HoldingsRecordView.close();
          InventoryInstance.openHoldingViewByID(holdingsID);
          HoldingsRecordView.viewSource();
          InventoryViewSource.checkFieldContentMatch(
            testData.tag001,
            testData.tag001ValueInSourceMask,
          );
          InventoryViewSource.checkFieldContentMatch(
            testData.tag004,
            testData.tag004ValueInSourceMask,
          );
          InventoryViewSource.checkFieldContentMatch(
            testData.tag005,
            testData.tag005ValueInSourceMask,
          );
          InventoryViewSource.checkFieldContentMatch(
            testData.tag999,
            testData.tag999ValueInSourceMask,
          );
          InventoryViewSource.checkFieldContentMatch(
            testData.tagLDR,
            testData.tagLDRValueInSourceMask,
          );
        });
      },
    );

    it(
      'C704299 Create MARC Holdings | Displaying of placeholder message when user deletes a row (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C704299'] },
      () => {
        InventoryInstances.searchBySource(testData.sourceMARC);
        InventoryInstances.selectInstance();
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.waitLoading();
        MarcAuthority.addNewField(5, '', '');
        MarcAuthority.addNewField(6, testData.tag151, '');
        MarcAuthority.addNewField(7, '', '$a');
        MarcAuthority.addNewField(8, testData.tag400, '$a value');
        QuickMarcEditor.deleteField(6);
        // here and below: wait for deleted field to disappear
        cy.wait(1000);
        QuickMarcEditor.deleteField(6);
        cy.wait(1000);
        QuickMarcEditor.deleteField(6);
        cy.wait(1000);
        QuickMarcEditor.deleteField(6);
        cy.wait(1000);
        QuickMarcEditor.checkNoDeletePlaceholder();
        QuickMarcEditor.updateExistingTagName(testData.tag852, '85');
        QuickMarcEditor.deleteFieldAndCheck(5, '85');
        QuickMarcEditor.afterDeleteNotification('85');
        QuickMarcEditor.undoDelete();
        QuickMarcEditor.verifyTagValue(5, '85');
        QuickMarcEditor.checkContent('', 5);
        QuickMarcEditor.updateExistingTagName('85', testData.tag852);
        QuickMarcEditor.updateExistingField(testData.tag852, `$b ${location.code}`);
        QuickMarcEditor.checkContentByTag(testData.tag852, `$b ${location.code}`);
        QuickMarcEditor.updateExistingTagName(testData.tag852, '85');
        QuickMarcEditor.deleteFieldAndCheck(5, testData.tag852);
        QuickMarcEditor.afterDeleteNotification('85');
        QuickMarcEditor.undoDelete();
        QuickMarcEditor.verifyTagValue(5, '85');
        QuickMarcEditor.checkContent('', 5);
        QuickMarcEditor.deleteFieldAndCheck(5, '85');
        QuickMarcEditor.afterDeleteNotification('85');
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkCallout(testData.tag852callout);
      },
    );
  });
});
