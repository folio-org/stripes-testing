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

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Automated linking', () => {
  const testData = {};

  const marcFiles = [
    {
      marc: 'marcBibFileForC388536.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388536.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 25,
    },
  ];

  const linkingTagAndValues = [
    {
      rowIndex: 82,
      value: 'Stelfreeze, Brian',
      tag: 700,
    },
    {
      rowIndex: 83,
      value: 'Sprouse, Chris',
      tag: 700,
    },
  ];

  const createdAuthorityIDs = [];

  const linkableFields = [
    100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811,
    830,
  ];

  const matchingNaturalIds = [
    {
      rowIndex: 33,
      tag: '100',
      naturalId: 'n2008001084',
    },
    {
      rowIndex: 37,
      tag: '240',
      naturalId: 'no2020024230',
    },
    {
      rowIndex: 65,
      tag: '600',
      naturalId: 'n2016004081',
    },
    {
      rowIndex: 62,
      tag: '630',
      naturalId: 'no2023006889',
    },
    {
      rowIndex: 73,
      tag: '655',
      naturalId: 'gf2014026266',
    },
    {
      rowIndex: 84,
      tag: '700',
      naturalId: 'no2011137752',
    },
    {
      rowIndex: 86,
      tag: '700',
      naturalId: 'n77020008',
    },
    {
      rowIndex: 87,
      tag: '700',
      naturalId: 'n91065740',
    },
    {
      rowIndex: 88,
      tag: '710',
      naturalId: 'no2008081921',
    },
    {
      rowIndex: 89,
      tag: '711',
      naturalId: 'n84745425',
    },
    {
      rowIndex: 91,
      tag: '800',
      naturalId: 'n79023811',
    },
    {
      rowIndex: 94,
      tag: '830',
      naturalId: 'no2018018754',
    },
  ];

  const notMatchingNaturalIds = [
    {
      rowIndex: 34,
      tag: '110',
      naturalId: 'no20061082779',
    },
    {
      rowIndex: 35,
      tag: '111',
      naturalId: 'no20091764299',
    },
    {
      rowIndex: 36,
      tag: '130',
      naturalId: 'n800269809',
    },
    {
      rowIndex: 60,
      tag: '610',
      naturalId: 'nb20090244889',
    },
    {
      rowIndex: 61,
      tag: '611',
      naturalId: 'n822167579',
    },
    {
      rowIndex: 67,
      tag: '650',
      naturalId: 'sh20091259899',
    },
    {
      rowIndex: 71,
      tag: '651',
      naturalId: 'sh850015319',
    },
    {
      rowIndex: 85,
      tag: '700',
      naturalId: 'n831692679',
    },
    {
      rowIndex: 90,
      tag: '730',
      naturalId: 'n790660959',
    },
    {
      rowIndex: 92,
      tag: '810',
      naturalId: 'n800955859',
    },
    {
      rowIndex: 93,
      tag: '811',
      naturalId: 'no20181255879',
    },
  ];

  before('Creating user and data', () => {
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

        linkableFields.forEach((tag) => {
          QuickMarcEditor.setRulesForField(tag, true);
        });
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

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting created user and data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
    createdAuthorityIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C388536 Some of linkable fields are linked (and some are not) after clicking on the "Link headings" button when edit "MARC bib" except already linked fields (spitfire)',
    { tags: [TestTypes.smoke, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(
        82,
        '700',
        '1',
        '\\',
        '$a Stelfreeze, Brian',
        '$e artist.',
        '$0 id.loc.gov/authorities/names/n91065740',
        '',
      );
      QuickMarcEditor.verifyTagFieldAfterLinking(
        83,
        '700',
        '1',
        '\\',
        '$a Sprouse, Chris',
        '$e artist.',
        '$0 id.loc.gov/authorities/names/nb98017694',
        '',
      );
      QuickMarcEditor.checkLinkHeadingsButton();

      for (let i = 82; i < 87; i++) {
        QuickMarcEditor.clickArrowDownButton(i);
      }
      QuickMarcEditor.deleteField(83);
      QuickMarcEditor.deleteField(82);
      QuickMarcEditor.afterDeleteNotification('700');

      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout(
        'Field 100, 240, 600, 630, 655, 700, 710, 711, 800, and 830 has been linked to MARC authority record(s).',
      );
      QuickMarcEditor.checkCallout(
        'Field 110, 111, 130, 610, 611, 650, 651, 700, 730, 810, and 811 must be set manually by selecting the link icon.',
      );
      QuickMarcEditor.checkLinkHeadingsButton();
      QuickMarcEditor.afterDeleteNotification('700');
      QuickMarcEditor.verifyTagFieldAfterLinking(
        87,
        '700',
        '1',
        '\\',
        '$a Stelfreeze, Brian',
        '$e artist.',
        '$0 id.loc.gov/authorities/names/n91065740',
        '',
      );
      matchingNaturalIds.forEach((matchs) => {
        QuickMarcEditor.verifyTagWithNaturalIdExistance(
          matchs.rowIndex,
          matchs.tag,
          matchs.naturalId,
        );
      });
      notMatchingNaturalIds.forEach((matchs) => {
        QuickMarcEditor.verifyTagWithNaturalIdExistance(
          matchs.rowIndex,
          matchs.tag,
          matchs.naturalId,
          `records[${matchs.rowIndex}].content`,
        );
      });

      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.clickRestoreDeletedField();
      QuickMarcEditor.verifyTagFieldAfterLinking(
        82,
        '700',
        '1',
        '\\',
        '$a Sprouse, Chris',
        '$e artist.',
        '$0 id.loc.gov/authorities/names/nb98017694',
        '',
      );
      QuickMarcEditor.verifyTagFieldAfterUnlinking(
        83,
        '700',
        '1',
        '\\',
        '$a Martin, Laura $c (Comic book artist), $e colorist. $0 n2014052262',
      );

      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout('Field 700 has been linked to MARC authority record(s).');
      QuickMarcEditor.checkCallout(
        'Field 110, 111, 130, 610, 611, 650, 651, 700, 730, 810, and 811 must be set manually by selecting the link icon.',
      );
      QuickMarcEditor.verifyTagWithNaturalIdExistance(83, '700', 'n2014052262');
      notMatchingNaturalIds.forEach((matchs) => {
        QuickMarcEditor.verifyTagWithNaturalIdExistance(
          matchs.rowIndex,
          matchs.tag,
          matchs.naturalId,
          `records[${matchs.rowIndex}].content`,
        );
      });
      QuickMarcEditor.checkLinkHeadingsButton();

      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.verifyTagFieldAfterLinking(
        82,
        '700',
        '1',
        '\\',
        '$a Sprouse, Chris',
        '$e artist.',
        '$0 id.loc.gov/authorities/names/nb98017694',
        '',
      );
      QuickMarcEditor.verifyTagFieldAfterLinking(
        87,
        '700',
        '1',
        '\\',
        '$a Stelfreeze, Brian',
        '$e artist.',
        '$0 id.loc.gov/authorities/names/n91065740',
        '',
      );
      // Wait for requests to be finished.
      cy.wait(3000);
    },
  );
});
