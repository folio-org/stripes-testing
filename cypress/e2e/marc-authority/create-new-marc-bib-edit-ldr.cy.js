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
      tag245ContentPrefix: 'Created_Bib_',
      valid008Values: [
        'a',
        'b',
        'ccc',
        'd',
        'e',
        'f',
        'g',
        'hhh',
        'i',
        'j',
        'k',
        'l',
        'm',
        '1111',
        '2222',
      ],
      tag245ValueWithAllSubfields:
        '$a testA $b testB $c testC $f testF $g testG $h testH $k testK $n testN $p testP $s testS $6 test6 $7 test7 $8 test8',
      instanceTitleWithSubfields: 'testA testB testC testF testG testH testK testN testP testS',
    },

    LDRValues: {
      validLDRvalue: '00000naa\\a2200000uu\\4500',
      updatedLDRValues: {
        LDRValueWithUpdatedPos10: '00000naa\\a0200000uu\\4500',
        LDRValueWithUpdatedPos11: '00000naa\\a2d00000uu\\4500',
        LDRValueWithUpdatedPos20: '00000naa\\a2200000uu\\X500',
        LDRValueWithUpdatedPos21: '00000naa\\a2200000uu\\4200',
        LDRValueWithUpdatedPos22: '00000naa\\a2200000uu\\45\\0',
        LDRValueWithUpdatedPos23: '00000naa\\a2200000uu\\450t',
      },
      validLDR06Values: randomizeArray([
        'a',
        'c',
        'd',
        'e',
        'f',
        'g',
        'i',
        'j',
        'k',
        'm',
        'o',
        'p',
        'r',
        't',
      ]),
      validLDR07Values: randomizeArray(['a', 'c', 'd', 'i', 'm', 's']),
      invalidLDR06Value: 'b',
      valid0607ValuesSets: [
        [randomizeArray(['a', 't']), randomizeArray(['a', 'c', 'd', 'm'])],
        [['m'], randomizeArray(['a', 'b', 'c', 'd', 'i', 'm', 's'])],
        [randomizeArray(['c', 'd', 'i', 'j']), randomizeArray(['a', 'b', 'c', 'd', 'i', 'm', 's'])],
        [['a'], randomizeArray(['b', 'i', 's'])],
        [randomizeArray(['g', 'k', 'r']), randomizeArray(['a', 'b', 'c', 'd', 'i', 'm', 's'])],
        [['p'], randomizeArray(['a', 'b', 'c', 'd', 'i', 'm', 's'])],
      ],
    },

    expected008BoxesSets: [
      [
        'DtSt',
        'Start date',
        'End date',
        'Ctry',
        'Ills',
        'Audn',
        'Form',
        'Cont',
        'GPub',
        'Conf',
        'Fest',
        'Indx',
        'LitF',
        'Biog',
        'Lang',
        'MRec',
        'Srce',
      ],
      [
        'DtSt',
        'Start date',
        'End date',
        'Ctry',
        'Audn',
        'Form',
        'File',
        'GPub',
        'Lang',
        'MRec',
        'Srce',
      ],
      [
        'DtSt',
        'Start date',
        'End date',
        'Ctry',
        'Comp',
        'FMus',
        'Part',
        'Audn',
        'Form',
        'AccM',
        'LTxt',
        'TrAr',
        'Lang',
        'MRec',
        'Srce',
      ],
      [
        'DtSt',
        'Start date',
        'End date',
        'Ctry',
        'Freq',
        'Regl',
        'SrTp',
        'Orig',
        'Form',
        'EntW',
        'Cont',
        'GPub',
        'Conf',
        'Alph',
        'S/L',
        'Lang',
        'MRec',
        'Srce',
      ],
      [
        'DtSt',
        'Start date',
        'End date',
        'Ctry',
        'Time',
        'Audn',
        'GPub',
        'Form',
        'TMat',
        'Tech',
        'Lang',
        'MRec',
        'Srce',
      ],
      ['DtSt', 'Start date', 'End date', 'Ctry', 'Form', 'Lang', 'MRec', 'Srce'],
    ],
  };

  const updatedLDRValuesArray = Object.values(testData.LDRValues.updatedLDRValues);
  const createdInstanceIDs = [];
  const userData = {};

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
    ]).then((createdUserProperties) => {
      userData.C380707UserProperties = createdUserProperties;
    });
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      userData.C380704UserProperties = createdUserProperties;
      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      }).then(() => {
        QuickMarcEditor.waitAndCheckFirstBibRecordCreated();
      });
    });
  });

  after('Deleting created users, Instances', () => {
    Object.values(userData).forEach((user) => {
      Users.deleteViaApi(user.userId);
    });
    createdInstanceIDs.forEach((instanceID) => {
      InventoryInstance.deleteInstanceViaApi(instanceID);
    });
  });

  it(
    'C380707 Editing LDR 10, 11, 20-23 values when creating a new "MARC bib" record (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      cy.login(userData.C380707UserProperties.username, userData.C380707UserProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });

      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField(testData.tags.tagLDR, testData.LDRValues.validLDRvalue);
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        `$a ${testData.fieldContents.tag245ContentPrefix + getRandomPostfix()}`,
      );

      updatedLDRValuesArray.forEach((LDRValue) => {
        QuickMarcEditor.updateExistingField(testData.tags.tagLDR, LDRValue);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkNonEditableLdrCalloutBib();
      });
    },
  );

  it(
    'C380704 Creating a new "MARC bib" record with valid LDR 06, 07 values. (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      cy.login(userData.C380704UserProperties.username, userData.C380704UserProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });

      for (let i = 0; i < testData.LDRValues.validLDR07Values.length; i++) {
        const updatedLDRvalue = `${testData.LDRValues.validLDRvalue.substring(0, 6)}${
          testData.LDRValues.validLDR06Values[i]
        }${testData.LDRValues.validLDR07Values[i]}${testData.LDRValues.validLDRvalue.substring(8)}`;
        const updatedLDRmask = new RegExp(
          `\\d{5}${updatedLDRvalue.substring(5, 12).replace('\\', '\\\\')}\\d{5}${updatedLDRvalue
            .substring(17)
            .replace('\\', '\\\\')}`,
        );
        const title = testData.fieldContents.tag245ContentPrefix + getRandomPostfix();

        InventoryInstance.newMarcBibRecord();
        QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${title}`);
        QuickMarcEditor.updateExistingField(
          testData.tags.tagLDR,
          replaceByIndex(testData.LDRValues.validLDRvalue, 6, testData.LDRValues.invalidLDR06Value),
        );
        QuickMarcEditor.checkSubfieldsAbsenceInTag008();
        QuickMarcEditor.updateExistingField(testData.tags.tagLDR, testData.LDRValues.validLDRvalue);
        QuickMarcEditor.check008FieldContent();
        QuickMarcEditor.updateExistingField(testData.tags.tagLDR, updatedLDRvalue);
        QuickMarcEditor.checkSubfieldsPresenceInTag008();
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
        InventoryInstance.checkInstanceTitle(title);

        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.saveInstanceIdToArrayInQuickMarc(createdInstanceIDs);
        QuickMarcEditor.checkFieldContentMatch(
          'textarea[name="records[0].content"]',
          updatedLDRmask,
        );
        QuickMarcEditor.closeWithoutSaving();
      }
    },
  );

  it(
    'C380711 Add all possible "245" subfields when creating a new "MARC bib" record (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      cy.login(userData.C380704UserProperties.username, userData.C380704UserProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField(testData.tags.tagLDR, testData.LDRValues.validLDRvalue);
      QuickMarcEditor.updateValuesIn008Boxes(testData.fieldContents.valid008Values);
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        testData.fieldContents.tag245ValueWithAllSubfields,
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkInstanceTitle(testData.fieldContents.instanceTitleWithSubfields);
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.saveInstanceIdToArrayInQuickMarc(createdInstanceIDs);
      QuickMarcEditor.checkContent(testData.fieldContents.tag245ValueWithAllSubfields, 4);
      QuickMarcEditor.checkValuesIn008Boxes(testData.fieldContents.valid008Values);
    },
  );

  it(
    'C380713 "008" field updated when valid LDR 06-07 combinations entered upon creation of "MARC bib" record (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      cy.login(userData.C380704UserProperties.username, userData.C380704UserProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      testData.LDRValues.valid0607ValuesSets.forEach((set, index) => {
        const updatedLDRvalue = `${testData.LDRValues.validLDRvalue.substring(0, 6)}${set[0][0]}${
          set[1][0]
        }${testData.LDRValues.validLDRvalue.substring(8)}`;
        const title = testData.fieldContents.tag245ContentPrefix + getRandomPostfix();
        InventoryInstance.newMarcBibRecord();
        QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${title}`);
        QuickMarcEditor.updateExistingField(testData.tags.tagLDR, updatedLDRvalue);
        QuickMarcEditor.check008FieldLabels(testData.expected008BoxesSets[index]);
        QuickMarcEditor.check008BoxesCount(testData.expected008BoxesSets[index].length);
        QuickMarcEditor.checkOnlyBackslashesIn008Boxes();
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
        QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
        InventoryInstance.checkInstanceTitle(title);
        InventoryInstance.getId().then((id) => {
          createdInstanceIDs.push(id);
        });
      });
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.check008FieldLabels(testData.expected008BoxesSets[5]);
      QuickMarcEditor.check008BoxesCount(testData.expected008BoxesSets[5].length);
    },
  );
});
