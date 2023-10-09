import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

describe('Manual Unlinking Bib field from Authority 1XX', () => {
  const testData = {};

  const marcFiles = [
    {
      marc: 'marcBibFileForC365602.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC365602.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 2,
    },
  ];

  const linkingTagAndValues = [
    {
      rowIndex: 76,
      value: 'Sprouse, Chris',
      tag: 700,
    },
    {
      rowIndex: 77,
      value: 'Martin, Laura',
      tag: 700,
    },
  ];

  const createdAuthorityIDs = [];

  before('Creating user and records', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
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
        InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        linkingTagAndValues.forEach((linking) => {
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
  });

  after('Deleting created user and records', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
    createdAuthorityIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C365602 Derive | Unlink "MARC Bibliographic" field from "MARC Authority" record and use the "Save & close" button in deriving window. (spitfire)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.deriveNewMarcBibRecord();
      QuickMarcEditor.verifyRemoveLinkingModal(
        'Do you want to remove authority linking for this new bibliographic record?',
      );

      QuickMarcEditor.clickKeepLinkingButton();
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(76);
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(77);
      QuickMarcEditor.checkButtonSaveAndCloseEnable();
      QuickMarcEditor.verifyTagFieldAfterLinking(
        76,
        '700',
        '1',
        '\\',
        '$a Sprouse, Chris',
        '$e artist.',
        '$0 1357871',
        '',
      );

      QuickMarcEditor.clickUnlinkIconInTagField(76);
      QuickMarcEditor.verifyTagFieldAfterUnlinking(
        76,
        '700',
        '1',
        '\\',
        '$a Sprouse, Chris $e artist. $0 1357871',
      );

      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout('Creating record may take several seconds.');
      QuickMarcEditor.checkCallout('Record created.');
      InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane('Contributor');
    },
  );
});
