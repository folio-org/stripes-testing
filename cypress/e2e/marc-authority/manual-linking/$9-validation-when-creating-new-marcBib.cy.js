import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic -> Create new MARC bib -> Manual linking', () => {
  const fieldsToUpdate = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: 'The most important book',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    searchOptions: {
      personalName: 'Personal name',
    },
    marcValue: 'C380726 Jackson, Peter, 1950-2022 Inspector Banks series ;',
    browseResult: 'C380726 Jackson, Peter, Inspector Banks series ; 1950-2022',
  };

  let userData = {};

  const marcFiles = [
    {
      marc: 'marcAuthFileForC380726.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  const createdAuthorityIDs = [];

  before('Create user and data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
    ]).then((createdUserProperties) => {
      userData = createdUserProperties;

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

      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and data', () => {
    Users.deleteViaApi(userData.userId);
    MarcAuthority.deleteViaAPI(createdAuthorityIDs[0]);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[1]);
  });

  it(
    'C380733 "$9" validation when creating a new "MARC bib" record (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField(
        fieldsToUpdate.tags.tag245,
        `$a ${fieldsToUpdate.fieldContents.tag245Content}`,
      );
      QuickMarcEditor.updateExistingField(
        fieldsToUpdate.tags.tagLDR,
        fieldsToUpdate.fieldContents.tagLDRContent,
      );
      MarcAuthority.addNewField(4, '100', '');
      MarcAuthority.addNewField(5, '600', 'test');
      QuickMarcEditor.clickLinkIconInTagField(5);
      MarcAuthorities.searchByParameter(
        fieldsToUpdate.searchOptions.personalName,
        fieldsToUpdate.marcValue,
      );
      MarcAuthorities.selectTitle(fieldsToUpdate.marcValue);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(5);
      QuickMarcEditor.verifyTagFieldAfterLinking(
        5,
        '100',
        '\\',
        '\\',
        '$a C380726 Jackson, Peter, $c Inspector Banks series ; $d 1950-2022',
        '',
        '$0 3052044',
        '',
      );
      QuickMarcEditor.fillEmptyTextAreaOfField(
        5,
        'records[5].subfieldGroups.uncontrolledAlpha',
        '$9 test',
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout('$9 is an invalid subfield for linkable bibliographic fields.');
      QuickMarcEditor.fillEmptyTextAreaOfField(
        5,
        'records[5].subfieldGroups.uncontrolledAlpha',
        '$9 3d2ecd70-e44c-484b-b372-677a4a070a4b',
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout('$9 is an invalid subfield for linkable bibliographic fields.');
      QuickMarcEditor.fillEmptyTextAreaOfField(
        5,
        'records[5].subfieldGroups.uncontrolledAlpha',
        '',
      );

      QuickMarcEditor.updateExistingFieldContent(6, '$9 test');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout('$9 is an invalid subfield for linkable bibliographic fields.');
      QuickMarcEditor.updateExistingFieldContent(6, '$9 3d2ecd70-e44c-484b-b372-677a4a070a4b');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout('$9 is an invalid subfield for linkable bibliographic fields.');
      QuickMarcEditor.updateExistingFieldContent(6, 'test');

      MarcAuthority.addNewField(6, '035', '$a 123123 $9 test');
      MarcAuthority.addNewField(7, '300', '$9 123123');
      MarcAuthority.addNewField(8, '588', '$9 test $9 TEST');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.getId().then((id) => {
        createdAuthorityIDs.push(id);
      });
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(5);
      QuickMarcEditor.verifyTagFieldAfterUnlinking(7, '035', '\\', '\\', '$a 123123 $9 test');
      QuickMarcEditor.verifyTagFieldAfterUnlinking(8, '300', '\\', '\\', '$9 123123');
      QuickMarcEditor.verifyTagFieldAfterUnlinking(9, '588', '\\', '\\', '$9 test $9 TEST');

      QuickMarcEditor.closeEditorPane();
      InventoryInstance.viewSource();
      InventoryViewSource.contains(
        'Linked to MARC authority\n\t100\t   \t‡a C380726 Jackson, Peter, ‡c Inspector Banks series ; ‡d 1950-2022 ‡0 3052044 ‡9',
      );
      InventoryViewSource.contains('\t035\t   \t‡a 123123 ‡9 test ');
      InventoryViewSource.contains('\t300\t   \t‡9 123123 ');
      InventoryViewSource.contains('\t588\t   \t‡9 test ‡9 TEST ');
    },
  );
});
