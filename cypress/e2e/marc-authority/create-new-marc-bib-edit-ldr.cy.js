import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { replaceByIndex } from '../../support/utils/stringTools';
import { randomizeArray } from '../../support/utils/arrays';

describe('MARC -> MARC Bibliographic -> Create new MARC bib', () => {
  const testData = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },

    fieldContents: {
      tag245Content: 'Created_Bib_C380707',
    },

    LDRValues: {
      validLDRvalue: '00000naa\\a2200000uu\\4500',
      updatedLDRValues: {
        LDRValueWithUpdatedPos10: '00000naa\\a0200000uu\\4500',
        LDRValueWithUpdatedPos11: '00000naa\\a2d00000uu\\4500',
        LDRValueWithUpdatedPos20: '00000naa\\a2200000uu\\X500',
        LDRValueWithUpdatedPos21: '00000naa\\a2200000uu\\4200',
        LDRValueWithUpdatedPos22: '00000naa\\a2200000uu\\45\\0',
        LDRValueWithUpdatedPos23: '00000naa\\a2200000uu\\450t'
      },
      validLDR06Values: randomizeArray(['a', 'c', 'd', 'e', 'f', 'g', 'i', 'j', 'k', 'm', 'o', 'p', 'r', 't']),
      validLDR07Values: randomizeArray(['a', 'c', 'd', 'i', 'm', 's']),
      invalidLDR06Value: 'b'
    }
  };

  // this function waits until Bib record is created in back-end, and then opens it in search
  function waitAndCheckFirstBibRecordCreated(marcBibTitle, timeOutSeconds = 120) {
    let timeCounter = 0;
    function checkBib() {
      cy.okapiRequest({ path: 'instance-storage/instances',
        searchParams: { 'query': `(title all "${marcBibTitle}")` },
        isDefaultSearchParamsRequired : false }).then(({ body }) => {
        if (body.instances[0] || timeCounter >= timeOutSeconds) {
          cy.expect(body.instances[0].title).equals(marcBibTitle);
        } else {
          // wait 1 second before retrying request
          cy.wait(1000);
          checkBib();
          timeCounter++;
        }
      });
    }
    checkBib();
    cy.visit(TopMenu.inventoryPath);
    InventoryInstance.searchByTitle(marcBibTitle);
    InventoryInstances.selectInstance();
  }

  const updatedLDRValuesArray = Object.values(testData.LDRValues.updatedLDRValues);

  const createdInstanceIDs = [];

  const users = {};

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
    ]).then(createdUserProperties => {
      users.C380707UserProperties = createdUserProperties;
    });
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then(createdUserProperties => {
      users.C380704UserProperties = createdUserProperties;
    });
  });

  after('Deleting created users, Instances', () => {
    Object.values(users).forEach((user) => {
      Users.deleteViaApi(user.userId);
    });
    createdInstanceIDs.forEach(instanceID => {
      InventoryInstance.deleteInstanceViaApi(instanceID);
    });
  });

  it('C380707 Editing LDR 10, 11, 20-23 values when creating a new "MARC bib" record (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    cy.login(users.C380707UserProperties.username, users.C380707UserProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });

    InventoryInstance.newMarcBibRecord();
    QuickMarcEditor.updateExistingField(testData.tags.tagLDR, testData.LDRValues.validLDRvalue);
    QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${testData.fieldContents.tag245Content}`);

    updatedLDRValuesArray.forEach(LDRValue => {
      QuickMarcEditor.updateExistingField(testData.tags.tagLDR, LDRValue);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkNonEditableLdrCalloutBib();
    });
  });

  it('C380704 Creating a new "MARC bib" record with valid LDR 06, 07 values. (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    cy.login(users.C380704UserProperties.username, users.C380704UserProperties.password, { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });

    for (let i = 0; i < testData.LDRValues.validLDR07Values.length; i++) {
      const updatedLDRvalue = `${testData.LDRValues.validLDRvalue.substring(0, 6)}${testData.LDRValues.validLDR06Values[i]}${testData.LDRValues.validLDR07Values[i]}${testData.LDRValues.validLDRvalue.substring(8)}`;
      const updatedLDRmask = new RegExp(`\\d{5}${updatedLDRvalue.substring(5, 12).replace('\\', '\\\\')}\\d{5}${updatedLDRvalue.substring(17).replace('\\', '\\\\')}`);
      const bibTitle = `Created_Bib_C380704_${getRandomPostfix()}`;

      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${bibTitle}`);
      QuickMarcEditor.updateExistingField(testData.tags.tagLDR, replaceByIndex(testData.LDRValues.validLDRvalue, 6, testData.LDRValues.invalidLDR06Value));
      QuickMarcEditor.checkSubfieldsAbsenceInTag008();
      QuickMarcEditor.updateExistingField(testData.tags.tagLDR, testData.LDRValues.validLDRvalue);
      QuickMarcEditor.check008FieldContent();
      QuickMarcEditor.updateExistingField(testData.tags.tagLDR, updatedLDRvalue);
      QuickMarcEditor.checkSubfieldsPresenceInTag008();
      QuickMarcEditor.pressSaveAndClose();

      if (i === 0) {
        cy.expect(QuickMarcEditor.calloutAfterSaveAndClose.exists());
        waitAndCheckFirstBibRecordCreated(bibTitle);
      } else QuickMarcEditor.checkAfterSaveAndClose();

      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.saveInstanceIdToArrayInQuickMarc(createdInstanceIDs);
      QuickMarcEditor.checkFieldContentMatch('textarea[name="records[0].content"]', updatedLDRmask);
      QuickMarcEditor.closeWithoutSaving();

      if (i === 0) InventoryInstances.resetAllFilters();
    }
  });
});
