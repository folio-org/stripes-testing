import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../support/utils/stringTools';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import MarcAuthoritiesDelete from '../../support/fragments/marcAuthority/marcAuthoritiesDelete';

describe('MARC -> MARC Authority', () => {
  const testData = {
    marcValue: 'Chin, Staceyann, 1972- C369084',
    markedValue: 'Chin, Staceyann,',
    searchOption: 'Personal name',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC369084.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 2,
    },
    {
      marc: 'marcAuthFileForC369084.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 2,
    },
  ];

  const createdAuthorityIDs = [];

  const linkingTagForFirstMarcBib = [
    {
      rowIndex: 17,
      value: 'Chin, Staceyann, 1972- C369084',
      tag: 100,
    },
    {
      rowIndex: 28,
      value: 'Chin, Staceyann, 1972- C369084',
      tag: 600,
    },
  ];

  const linkingTagForSecondMarcBib = [
    {
      rowIndex: 11,
      value: 'Chin, Staceyann, 1972- C369084',
      tag: 100,
    },
    {
      rowIndex: 19,
      value: 'Feminist poetry C369084',
      tag: 650,
    },
  ];

  const twoMarcBibsToLink = [
    {
      marcBibRecord: 'The other side of paradise : a memoir / Staceyann Chin.',
      linkingFields: linkingTagForFirstMarcBib,
    },
    {
      marcBibRecord: 'Crossfire : a litany for survival : poems 1998-2019 / Staceyann Chin',
      linkingFields: linkingTagForSecondMarcBib,
    },
  ];

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile('Completed');
            Logs.openFileDetails(marcFile.fileName);
            for (let i = 0; i < marcFile.numOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((link) => {
                createdAuthorityIDs.push(link.split('/')[5]);
              });
            }
          },
        );
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.waitContentLoading();
        twoMarcBibsToLink.forEach((marcBib) => {
          InventoryInstance.searchByTitle(marcBib.marcBibRecord);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          marcBib.linkingFields.forEach((linking) => {
            QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(linking.value);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
          });
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
        });
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
    });
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    for (let i = 0; i < 2; i++) {
      InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[i]);
    }
    MarcAuthority.deleteViaAPI(createdAuthorityIDs[2]);
  });

  it(
    'C369084 Delete authorized "MARC Authority" record that has two linked field in different "MARC Bib" records (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      MarcAuthorities.switchToBrowse();
      MarcAuthorities.searchByParameter(testData.searchOption, testData.marcValue);

      MarcAuthorities.selectTitle(testData.marcValue);
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedValue);
      MarcAuthoritiesDelete.clickDeleteButton();
      MarcAuthoritiesDelete.checkDeleteModal();
      MarcAuthoritiesDelete.checkDeleteModalMessage(
        `Are you sure you want to permanently delete the authority record:  ${testData.marcValue} ? If you proceed with deletion, then 2 linked bibliographic records will retain authorized value and will become uncontrolled.`,
      );
      MarcAuthoritiesDelete.clickCancelButton();

      MarcAuthoritiesDelete.clickDeleteButton();
      MarcAuthoritiesDelete.checkDeleteModal();
      MarcAuthoritiesDelete.checkDeleteModalMessage(
        `Are you sure you want to permanently delete the authority record:  ${testData.marcValue} ? If you proceed with deletion, then 2 linked bibliographic records will retain authorized value and will become uncontrolled.`,
      );
      MarcAuthoritiesDelete.confirmDelete();
      MarcAuthoritiesDelete.checkAfterDeletion(testData.marcValue);

      cy.visit(TopMenu.inventoryPath);
      InventoryInstance.searchByTitle(twoMarcBibsToLink[1].marcBibRecord);
      InventoryInstances.selectInstance();
      InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane('Contributor');
      InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane('Subject');
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(
        11,
        '100',
        '1',
        '\\',
        '$a Chin, Staceyann, $d 1972- C369084 $e Author $e Narrator $0 id.loc.gov/authorities/names/n2008052404 $1 http://viaf.org/viaf/24074052',
      );
      QuickMarcEditor.verifyTagFieldAfterLinking(
        19,
        '650',
        '\\',
        '0',
        '$a Feminist poetry C369084',
        '',
        '$0 id.loc.gov/authorities/subjects/sh85047755',
        '',
      );
      QuickMarcEditor.checkLinkButtonExist('100');

      QuickMarcEditor.closeEditorPane();
      InventoryInstance.searchByTitle(twoMarcBibsToLink[0].marcBibRecord);
      InventoryInstances.selectInstance();
      InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane('Contributor');
      InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane('Subject');
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(
        17,
        '100',
        '1',
        '\\',
        '$a Chin, Staceyann, $d 1972- C369084 $e author. $0 id.loc.gov/authorities/names/n2008052404',
      );
      QuickMarcEditor.verifyTagFieldAfterUnlinking(
        28,
        '600',
        '1',
        '0',
        '$a Chin, Staceyann, $d 1972- C369084 $x Childhood and youth. $0 id.loc.gov/authorities/names/n2008052404',
      );
      QuickMarcEditor.pressCancel();

      // Wait for the content to be loaded.
      cy.wait(4000);
      InventoryInstance.viewSource();
      InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
    },
  );
});
