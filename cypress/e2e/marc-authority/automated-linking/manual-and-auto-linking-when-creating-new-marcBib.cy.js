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
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Automated linking', () => {
  const testData = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: 'New title C388565',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    naturalIds: {
      tag100: '0255869',
      tag240: 'n99036055',
      tag600: 'n93094742',
      tag711: 'n79084169',
    },
    searchOptions: {
      identifierAll: 'Identifier (all)',
    },
    marcValue: 'Radio "Vaticana". Hrvatski program',
  };

  const newFields = [
    {
      rowIndex: 4,
      tag: '100',
      content: '',
    },
    {
      rowIndex: 5,
      tag: '240',
      content: '$0 n99036088',
    },
    {
      rowIndex: 6,
      tag: '610',
      content: '$0 n93094742',
    },
    {
      rowIndex: 7,
      tag: '711',
      content: '$0 n79084169',
    },
    {
      rowIndex: 8,
      tag: '830',
      content: '',
    },
  ];

  const newFieldsForC388562 = [
    {
      rowIndex: 4,
      tag: '100',
      content: '$a Value100',
    },
    {
      rowIndex: 5,
      tag: '240',
      content: '$a Value240',
    },
    {
      rowIndex: 6,
      tag: '650',
      content: '$a Value650',
    },
    {
      rowIndex: 7,
      tag: '040',
      content: '$a Value040',
    },
  ];

  let userData = {};

  const linkableFields = [100, 240, 610, 711, 830];
  const linkableFieldsForC388562 = [100, 240, 650];

  const marcFiles = [
    {
      marc: 'marcAuthFileForC388565.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 5,
    },
    {
      marc: 'marcAuthFileForC388562.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 3,
    },
  ];

  const createdAuthorityIDs = [];

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      userData = createdUserProperties;

      cy.loginAsAdmin().then(() => {
        marcFiles.forEach((marcFile) => {
          cy.visit(TopMenu.dataImportPath);
          DataImport.waitLoading();
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
        });
      });
    });
  });

  beforeEach('Sign in to platform', () => {
    cy.login(userData.username, userData.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting created users, Instances', () => {
    Users.deleteViaApi(userData.userId);
    for (let i = 0; i < 8; i++) {
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[i]);
    }
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[8]);
  });

  it(
    'C388565 Link certain fields manually and then use auto-linking when creating new "MARC Bib" record (spitfire)',
    { tags: [TestTypes.smoke, DevTeams.spitfire] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        `$a ${testData.fieldContents.tag245Content}`,
      );
      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      newFields.forEach((newField) => {
        MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
      });

      QuickMarcEditor.clickLinkIconInTagField(newFields[0].rowIndex + 1);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResultsWithOption(
        testData.searchOptions.identifierAll,
        testData.naturalIds.tag100,
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(newFields[0].tag, newFields[0].rowIndex + 1);
      QuickMarcEditor.verifyTagFieldAfterLinking(
        5,
        '100',
        '\\',
        '\\',
        '$a Jackson, Peter, $c Inspector Banks series ; $d 1950-2022',
        '',
        '$0 3052044',
        '',
      );
      QuickMarcEditor.clickLinkIconInTagField(newFields[1].rowIndex + 1);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResultsWithOption(
        testData.searchOptions.identifierAll,
        testData.naturalIds.tag240,
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(newFields[1].tag, newFields[1].rowIndex + 1);
      QuickMarcEditor.verifyTagFieldAfterLinking(
        6,
        '240',
        '\\',
        '\\',
        '$a Hosanna Bible',
        '',
        '$0 id.loc.gov/authorities/names/n99036055',
        '',
      );

      linkableFields.forEach((tag) => {
        QuickMarcEditor.setRulesForField(tag, true);
      });
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.verifyTagWithNaturalIdExistance(
        newFields[2].rowIndex + 1,
        newFields[2].tag,
        testData.naturalIds.tag600,
      );
      QuickMarcEditor.verifyTagWithNaturalIdExistance(
        newFields[3].rowIndex + 1,
        newFields[3].tag,
        testData.naturalIds.tag711,
      );
      QuickMarcEditor.checkCallout(
        'Field 610 and 711 has been linked to MARC authority record(s).',
      );
      QuickMarcEditor.verifyTagFieldAfterLinking(
        5,
        '100',
        '\\',
        '\\',
        '$a Jackson, Peter, $c Inspector Banks series ; $d 1950-2022',
        '',
        '$0 3052044',
        '',
      );
      QuickMarcEditor.verifyTagFieldAfterLinking(
        6,
        '240',
        '\\',
        '\\',
        '$a Hosanna Bible',
        '',
        '$0 id.loc.gov/authorities/names/n99036055',
        '',
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();

      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      BrowseSubjects.select();
      BrowseSubjects.browse(testData.marcValue);
      BrowseSubjects.checkRowWithValueAndAuthorityIconExists(testData.marcValue);
      InventorySearchAndFilter.selectFoundItemFromBrowseResultList(testData.marcValue);
      InventorySearchAndFilter.verifyInstanceDisplayed(testData.fieldContents.tag245Content);
      InventoryInstance.getId().then((id) => {
        createdAuthorityIDs.push(id);
      });
      InventoryInstance.viewSource();
      InventoryViewSource.contains('Linked to MARC authority\n\t100');
      InventoryViewSource.contains('Linked to MARC authority\n\t240');
      InventoryViewSource.contains('Linked to MARC authority\n\t610');
      InventoryViewSource.contains('Linked to MARC authority\n\t711');
    },
  );

  it(
    'C388562 "Link headings" button disabling/enabling when creating new "MARC Bib" record (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
      QuickMarcEditor.updateExistingField(testData.tags.tag245, '$a A New Record');
      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      newFieldsForC388562.forEach((newField) => {
        MarcAuthority.addNewField(newField.rowIndex, newField.tag, '');
      });
      linkableFieldsForC388562.forEach((tag) => {
        QuickMarcEditor.setRulesForField(tag, true);
      });
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      newFieldsForC388562.forEach((newField) => {
        QuickMarcEditor.updateExistingField(newField.tag, newField.content);
      });
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();

      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        '$a A New Record $0 3052044C388562',
      );
      QuickMarcEditor.updateExistingField(
        newFieldsForC388562[3].tag,
        `${newFieldsForC388562[3].content} $0 y015016`,
      );
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();

      QuickMarcEditor.updateExistingField(
        newFieldsForC388562[0].tag,
        `${newFieldsForC388562[0].content} $0 y016017`,
      );
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout('Field 100 must be set manually by selecting the link icon.');
      InventoryInstance.verifyAndClickLinkIcon(newFieldsForC388562[0].tag);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResultsWithOption('Identifier (all)', '3052044C388562');
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
        newFieldsForC388562[0].tag,
        newFieldsForC388562[0].rowIndex + 1,
      );
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();

      QuickMarcEditor.updateExistingField(
        newFieldsForC388562[1].tag,
        `${newFieldsForC388562[1].content} $0 n99036055`,
      );
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingField(
        newFieldsForC388562[1].tag,
        newFieldsForC388562[1].content,
      );
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingField(
        newFieldsForC388562[1].tag,
        `${newFieldsForC388562[1].content} $0 y011022`,
      );
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingField(
        newFieldsForC388562[1].tag,
        newFieldsForC388562[1].content,
      );
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();

      QuickMarcEditor.updateExistingField(
        newFieldsForC388562[2].tag,
        `${newFieldsForC388562[1].content} $0 sh85095299C388562`,
      );
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout('Field 650 has been linked to MARC authority record(s).');
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
    },
  );
});
