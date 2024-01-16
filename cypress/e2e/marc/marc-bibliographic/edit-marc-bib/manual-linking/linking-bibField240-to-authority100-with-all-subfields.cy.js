import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Manual Linking Bib field to Authority 1XX', () => {
  const testData = {
    tag240: '240',
    tag240content:
      '$a Fail $d PASS (editable) $t test $f fail $g fail $h fail $k fail $l fail $m fail $n fail $o fail $p fail $r fail $s fail $1 pass (editable) $2 pass (editable) $6 pass (editable) $7 pass (editable) $8  pass(editable)',
    browseSearchOption: 'nameTitle',
    searchOption: 'Keyword',
    searchValue: 'Fail PASS (editable) test',
    placeholderMessage: 'Fail PASS (editable) test would be here',
    authorityMarkedValue: 'Dowland, John',
    tag240rowindex: 29,
    authority100FieldValue:
      'Dowland, John, num 1 test purpose 1563?-1626. (valery pilko) pass (read only) pass (read only) epass (read only) pass (read only) pass (read only) pass (read only) pass (read only) pass (read only) pass (read only) pass (read only)',
    changesSavedCallout:
      'This record has successfully saved and is in process. Changes may not appear immediately.',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC380763.mrc',
      fileName: `testMarcFileC380763${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC380763.mrc',
      fileName: `testMarcFileC380763${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];
  const bib240AfterLinkingToAuth100 = [
    29,
    testData.tag240,
    '1',
    '0',
    '$a pass (read only) $f pass (read only) $g pass (read only) $h pass (read only) $k pass (read only) $l epass (read only) $m pass (read only) $n pass (read only) $o pass (read only) $p pass (read only) $r pass (read only) $s pass (read only)',
    '$d PASS (editable) $t test',
    '$0 id.loc.gov/authorities/names/n80030866',
    '$1 pass (editable) $2 pass (editable) $6 pass (editable) $7 pass (editable) $8 pass(editable)',
  ];
  const bib110UnlinkedFieldValues = [
    29,
    testData.tag240,
    '1',
    '0',
    '$a pass (read only) $f pass (read only) $g pass (read only) $h pass (read only) $k pass (read only) $l epass (read only) $m pass (read only) $n pass (read only) $o pass (read only) $p pass (read only) $r pass (read only) $s pass (read only) $d PASS (editable) $t test $0 id.loc.gov/authorities/names/n80030866 $1 pass (editable) $2 pass (editable) $6 pass (editable) $7 pass (editable) $8 pass(editable)',
  ];

  const createdAuthorityIDs = [];

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            Logs.waitFileIsImported(marcFile.fileName);
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
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[1]);
    });
  });

  it(
    'C380763 Link the "240" of "MARC Bib" field with "1XX" field of "MARC Authority" record (all subfields) (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire', 'nonParallel'] },
    () => {
      InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.checkSearchOption(testData.browseSearchOption);
      MarcAuthorities.checkSearchInput(testData.searchValue);
      MarcAuthorities.verifyEmptyAuthorityField();
      MarcAuthorities.checkRow(testData.placeholderMessage);
      MarcAuthorities.switchToSearch();
      MarcAuthorities.checkSearchOption(testData.browseSearchOption);
      MarcAuthorities.checkSearchInput('');
      MarcAuthorities.verifyEmptyAuthorityField();
      MarcAuthorities.searchByParameter(testData.searchOption, testData.authorityMarkedValue);
      MarcAuthorities.selectTitle(testData.authority100FieldValue);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
      QuickMarcEditor.checkUnlinkTooltipText(testData.tag240, 'Unlink from MARC Authority record');
      QuickMarcEditor.checkViewMarcAuthorityTooltipText(testData.tag240rowindex);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib240AfterLinkingToAuth100);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.clickUnlinkIconInTagField(testData.tag240rowindex);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib110UnlinkedFieldValues);
      QuickMarcEditor.checkLinkButtonExist(testData.tag240);
      QuickMarcEditor.pressSaveAndKeepEditing(testData.changesSavedCallout);
      QuickMarcEditor.checkContent(bib110UnlinkedFieldValues[4], bib110UnlinkedFieldValues[0]);
    },
  );
});
