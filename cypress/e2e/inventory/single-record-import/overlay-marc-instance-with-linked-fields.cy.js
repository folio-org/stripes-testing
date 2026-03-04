import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('Inventory', () => {
  describe('Single record import', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(15);
    const testData = {
      tag008: '008',
      tag100: '100',
      tag245: '245',
      tag700: '700',
      tag700OriginalContent1: '$a Field700-1',
      oclcIdentifier: '1446125585',
      OCLCAuthentication: '100481406/PAOLF',
      newInstanceTitle:
        'Belarus : a silenced history : a chronological history book about Belarus from the Middle Ages to the war in Ukraine in 2022',
    };
    const instanceTitle = `AT_C396384_MarcBibRecord_${randomPostfix}`;
    const authorityHeading1 = `AT_C396384_MarcAuthority_${randomPostfix}_1`;
    const authorityHeading2 = `AT_C396384_MarcAuthority_${randomPostfix}_2`;
    const authData = { prefix: randomLetters, startWithNumber: 1 };
    const authorityFields1 = [
      {
        tag: '100',
        content: `$a ${authorityHeading1}`,
        indicators: ['1', '\\'],
      },
    ];
    const authorityFields2 = [
      {
        tag: '100',
        content: `$a ${authorityHeading2}`,
        indicators: ['1', '\\'],
      },
    ];
    const newFields = [
      {
        rowIndex: 5,
        tag: testData.tag100,
        content: `$a ${authorityHeading1} $0 ${authData.prefix}${authData.startWithNumber}`,
      },
      { rowIndex: 6, tag: testData.tag700, content: testData.tag700OriginalContent1 },
      {
        rowIndex: 7,
        tag: testData.tag700,
        content: `$a ${authorityHeading2} $0 ${authData.prefix}${authData.startWithNumber + 1}`,
      },
    ];
    const linkedFieldData100 = {
      rowIndex: newFields[0].rowIndex,
      tag: newFields[0].tag,
      ind1: '\\',
      ind2: '\\',
      controlledLetterSubfields: `$a ${authorityHeading1}`,
      uncontrolledLetterSubfields: '',
      controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
      uncontrolledDigitSubfields: '',
    };
    const linkedFieldData700 = {
      rowIndex: newFields[2].rowIndex,
      tag: newFields[2].tag,
      ind1: '\\',
      ind2: '\\',
      controlledLetterSubfields: `$a ${authorityHeading2}`,
      uncontrolledLetterSubfields: '',
      controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber + 1}`,
      uncontrolledDigitSubfields: '',
    };

    let user;
    const createdAuthorityIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C396384');

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ])
        .then((userProperties) => {
          user = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            authData.startWithNumber,
            authorityFields1,
          ).then((createdRecordId) => {
            createdAuthorityIds.push(createdRecordId);
          });

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            authData.startWithNumber + 1,
            authorityFields2,
          ).then((createdRecordId) => {
            createdAuthorityIds.push(createdRecordId);
          });
        })
        .then(() => {
          Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
      InventoryInstances.deleteInstanceByTitleViaApi(testData.newInstanceTitle);
      createdAuthorityIds.forEach((id) => {
        MarcAuthority.deleteViaAPI(id, true);
      });
    });

    it(
      'C422122 User cannot add a new field below "999 ff" field on "Create a new MARC bib record" pane (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422122'] },
      () => {
        InventoryInstance.newMarcBibRecord();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.updateLDR06And07Positions();

        QuickMarcEditor.updateExistingField(testData.tag245, `$a ${instanceTitle}`);
        QuickMarcEditor.checkContentByTag(testData.tag245, `$a ${instanceTitle}`);

        newFields.forEach((field) => {
          QuickMarcEditor.addEmptyFields(field.rowIndex - 1);
          QuickMarcEditor.checkEmptyFieldAdded(field.rowIndex);
          QuickMarcEditor.addValuesToExistingField(field.rowIndex - 1, field.tag, field.content);
          QuickMarcEditor.checkContent(field.content, field.rowIndex);
          QuickMarcEditor.verifyTagValue(field.rowIndex, field.tag);
        });

        QuickMarcEditor.clickLinkIconInTagField(newFields[0].rowIndex);
        InventoryInstance.verifySelectMarcAuthorityModal();
        MarcAuthority.waitLoading();
        MarcAuthority.contains(authorityHeading1);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
          linkedFieldData100.tag,
          linkedFieldData100.rowIndex,
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(...Object.values(linkedFieldData100));

        QuickMarcEditor.clickLinkIconInTagField(newFields[2].rowIndex);
        InventoryInstance.verifySelectMarcAuthorityModal();
        MarcAuthority.waitLoading();
        MarcAuthority.contains(authorityHeading2);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
          linkedFieldData700.tag,
          linkedFieldData700.rowIndex,
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(...Object.values(linkedFieldData700));

        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
        InventoryInstance.waitInstanceRecordViewOpened();

        InventoryInstance.getAssignedHRID().then((hrid) => {
          InventoryInstance.startOverlaySourceBibRecord();
          InventoryInstance.overlayWithOclc(testData.oclcIdentifier);
          InventoryInstance.waitLoading();
          InventoryInstance.checkInstanceTitle(testData.newInstanceTitle);

          InventorySearchAndFilter.closeInstanceDetailPane();
          InventorySearchAndFilter.executeSearch(hrid);
          InventoryInstance.waitLoading();
          InventoryInstance.checkInstanceTitle(testData.newInstanceTitle);

          InventoryInstance.viewSource();
          InventoryViewSource.contains(testData.newInstanceTitle);
          InventoryViewSource.notContains(instanceTitle);
          InventoryViewSource.notContains(authorityHeading1);
          InventoryViewSource.notContains(authorityHeading2);
          InventoryViewSource.verifyLinkedToAuthorityIconIsPresent(false);
        });
      },
    );
  });
});
