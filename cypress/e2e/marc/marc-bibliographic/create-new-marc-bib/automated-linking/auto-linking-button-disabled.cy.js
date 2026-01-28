import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          tags: {
            tag245: '245',
          },
          fieldContents: {
            tag245Content: 'Test: created record with all linkable fields without linking',
          },
          fileName: `C389484 testMarcFile.${getRandomPostfix()}.mrc`,
        };

        const newFields = [
          {
            rowIndex: 4,
            tag: '100',
            content: '$aC389484 Coates, Ta-Nehisi,$eauthor. $0 n2008001084',
          },
          { rowIndex: 5, tag: '240', content: '$aC389484 Black Panther $0 no2020024230' },
          {
            rowIndex: 6,
            tag: '600',
            content: '$aC389484 Black Panther$c(Fictitious character)$2fast $0 n2016004081',
          },
          { rowIndex: 7, tag: '610', content: '$aC389484 Black Panther $0 nb2009024488' },
          { rowIndex: 8, tag: '611', content: '$aC389484 Panther Photographic $0n 82216757' },
          { rowIndex: 9, tag: '630', content: '$aC389484 Black Panther $0 no2023006889' },
          { rowIndex: 10, tag: '650', content: '$aC389484 Good and evil.$2fast $0 sh2009125989' },
          { rowIndex: 11, tag: '651', content: '$aC389484 Africa.$2fast $0 sh 85001531' },
          {
            rowIndex: 12,
            tag: '655',
            content: '$aC389484 Comics (Graphic works)$2fast $0 gf2014026266',
          },
          {
            rowIndex: 13,
            tag: '700',
            content:
              '$aC389484 Lee, Stan,$d1922-2018,$ecreator.$0 http://id.loc.gov/authorities/names/n83169267',
          },
          { rowIndex: 14, tag: '710', content: '$aC389484 Robinson $0 no2008081921' },
          { rowIndex: 15, tag: '711', content: '$aC389484 Delaware $0 n  84745425' },
          { rowIndex: 16, tag: '730', content: '$aC389484 Gone T $0n 79066095' },
          { rowIndex: 17, tag: '800', content: '$aC389484 Neilson, Donald $0 n 79023811' },
          { rowIndex: 18, tag: '810', content: '$aC389484 Black Panther Party $0 n 80095585' },
          {
            rowIndex: 19,
            tag: '811',
            content: '$aC389484 Stockholm International Film Festival $0 no2018125587',
          },
          { rowIndex: 20, tag: '830', content: '$aC389484 Black Panther $0 no2018018754' },
        ];

        let userData = {};

        const linkableFields = [
          100, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, 830,
        ];

        const marcFiles = [
          {
            marc: 'marcAuthFileForC389484.mrc',
            fileName: `C389484 testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 20,
          },
        ];

        const createdAuthorityIDs = [];
        let createdInstanceID;

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C389484*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdAuthorityIDs.push(record.authority.id);
                });
              });
            });

            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, false);
            });
            cy.waitForAuthRefresh(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          linkableFields.forEach((tag) => {
            QuickMarcEditor.setRulesForField(tag, true);
          });
          Users.deleteViaApi(userData.userId);
          createdAuthorityIDs.forEach((id) => {
            MarcAuthority.deleteViaAPI(id);
          });
          InventoryInstance.deleteInstanceViaApi(createdInstanceID);
        });

        it(
          'C389484 "Link headings" button is NOT displayed in create "MARC bib" window when auto-link for all heading types is disabled (spitfire) (TaaS)',
          { tags: ['criticalPathFlaky', 'spitfire', 'C389484'] },
          () => {
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            newFields.forEach((newField) => {
              MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
              cy.wait(500);
            });
            newFields.forEach((newField) => {
              QuickMarcEditor.verifyTagField(
                newField.rowIndex + 1,
                newField.tag,
                '\\',
                '\\',
                newField.content,
                '',
              );
            });
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.getId().then((id) => {
              createdInstanceID = id;
            });
            InventoryInstance.viewSource();
            newFields.forEach((newField) => {
              InventoryViewSource.verifyLinkedToAuthorityIcon(newField.rowIndex + 1, false);
            });
          },
        );
      });
    });
  });
});
