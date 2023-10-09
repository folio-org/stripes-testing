import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';

describe('MARC -> MARC Bibliographic -> Create new MARC bib', () => {
  const testData = {
    tags: {
      tag100: '100',
      tag600: '600',
      tag700: '700',
      tag800: '800',
      tag240: '240',
      tag245: '245',
      tagLDR: 'LDR',
    },

    fieldContents: {
      tag100Content: 'Author, Person',
      tag600Content: 'New subject',
      tag700Content: 'Co-author, Person',
      tag800Content: 'New series',
      tag240Content: 'New alt. title',
      tag245Content: 'New title',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },

    accordions: {
      contributor: 'Contributor',
      subject: 'Subject',
      titleData: 'Title data',
    },
  };

  const importedInstanceID = [];

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(importedInstanceID[0]);
  });

  it(
    'C380701 User can create a new "MARC bib" record using "Save & close" button. (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        `$a ${testData.fieldContents.tag245Content}`,
      );
      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      MarcAuthority.addNewField(
        4,
        testData.tags.tag100,
        `$a ${testData.fieldContents.tag100Content}`,
      );
      MarcAuthority.addNewField(
        5,
        testData.tags.tag600,
        `$a ${testData.fieldContents.tag600Content}`,
      );
      MarcAuthority.addNewField(
        6,
        testData.tags.tag700,
        `$a ${testData.fieldContents.tag700Content}`,
      );
      MarcAuthority.addNewField(
        7,
        testData.tags.tag800,
        `$a ${testData.fieldContents.tag800Content}`,
      );
      MarcAuthority.addNewField(
        8,
        testData.tags.tag240,
        `$a ${testData.fieldContents.tag240Content}`,
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();

      InventoryInstance.getId().then((id) => {
        importedInstanceID.push(id);
      });
      InventoryInstance.checkInstanceTitle(testData.fieldContents.tag245Content);
      InventoryInstance.checkDetailViewOfInstance(
        testData.accordions.contributor,
        testData.fieldContents.tag100Content,
      );
      InventoryInstance.checkDetailViewOfInstance(
        testData.accordions.contributor,
        testData.fieldContents.tag700Content,
      );
      InventoryInstance.checkDetailViewOfInstance(
        testData.accordions.subject,
        testData.fieldContents.tag600Content,
      );
      InventoryInstance.checkDetailViewOfInstance(
        testData.accordions.titleData,
        testData.fieldContents.tag800Content,
      );
      InventoryInstance.checkDetailViewOfInstance(
        testData.accordions.titleData,
        testData.fieldContents.tag240Content,
      );

      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.check008FieldContent();
      QuickMarcEditor.checkFieldContentMatch('textarea[name="records[1].content"]', /in\d{11}/gm);
      QuickMarcEditor.checkFieldContentMatch(
        'textarea[name="records[3].content"]',
        /\d{14}\.\d{1}/gm,
      );
      QuickMarcEditor.verifyTagField(10, '999', 'f', 'f', '$s', '$i');
    },
  );
});
