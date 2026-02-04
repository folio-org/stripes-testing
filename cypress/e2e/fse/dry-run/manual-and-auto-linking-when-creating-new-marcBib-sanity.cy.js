import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../support/utils/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const { user, memberTenant } = parseSanityParameters();
        const testData = {
          tags: {
            tag245: '245',
          },
          fieldContents: {
            tag245Content: 'New title C388565',
          },
          naturalIds: {
            tag100: '0255861',
            tag240: 'n99036055',
            tag600: 'n93094741',
            tag711: 'n79084162',
          },
          searchOptions: {
            identifierAll: 'Identifier (all)',
          },
          marcValue: 'C422149Radio "Vaticana". Hrvatski program',
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
            content: '$0 n93094741',
          },
          {
            rowIndex: 7,
            tag: '711',
            content: '$0 n79084162',
          },
          {
            rowIndex: 8,
            tag: '830',
            content: '',
          },
        ];

        const linkableFields = [100, 240, 610, 711, 830];

        const marcFiles = [
          {
            marc: 'marcAuthFileForC422149_1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 5,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC422149_2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 3,
            propertyName: 'authority',
          },
        ];

        const createdAuthorityIDs = [];
        const createdInstanceIDs = [];

        before('Setup', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422149*');
          InventoryInstances.deleteFullInstancesByTitleViaApi('New title C388565');

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          cy.setTenant(memberTenant.id);
          cy.getUserToken(user.username, user.password).then(() => {
            // Fetch user details (REQUIRED)
            cy.getUserDetailsByUsername(user.username).then((details) => {
              user.id = details.id;
              user.personal = details.personal;
              user.barcode = details.barcode;
            });
          });

          cy.allure().logCommandSteps(false);
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.allure().logCommandSteps();
        });

        after('Cleanup', () => {
          cy.setTenant(memberTenant.id);
          cy.getUserToken(user.username, user.password);
          for (let i = 0; i < createdAuthorityIDs.length; i++) {
            MarcAuthority.deleteViaAPI(createdAuthorityIDs[i], true);
          }
          for (let j = 0; j < createdInstanceIDs.length; j++) {
            InventoryInstance.deleteInstanceViaApi(createdInstanceIDs[j], true);
          }
        });

        it(
          'C422149 Link certain fields manually and then use auto-linking when creating new "MARC Bib" record (spitfire)',
          { tags: ['dryRun', 'spitfire', 'C422149'] },
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
              cy.wait(1000);
            });

            QuickMarcEditor.clickLinkIconInTagField(newFields[0].rowIndex + 1);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResultsWithOption(
              testData.searchOptions.identifierAll,
              testData.naturalIds.tag100,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              newFields[0].tag,
              newFields[0].rowIndex + 1,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              5,
              '100',
              '\\',
              '\\',
              '$a C422149Jackson, Peter, $d 1950-2022 $c Inspector Banks series ;',
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
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              newFields[1].tag,
              newFields[1].rowIndex + 1,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              6,
              '240',
              '\\',
              '\\',
              '$a Hosanna Bible',
              '',
              '$0 http://id.loc.gov/authorities/names/n99036055',
              '',
            );
            cy.getAdminToken();
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
              '$a C422149Jackson, Peter, $d 1950-2022 $c Inspector Banks series ;',
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
              '$0 http://id.loc.gov/authorities/names/n99036055',
              '',
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.verifyKeywordsAsDefault();
            BrowseSubjects.select();
            BrowseSubjects.waitForSubjectToAppear(testData.marcValue, true, true);
            BrowseSubjects.browse(testData.marcValue);
            BrowseSubjects.checkRowWithValueAndAuthorityIconExists(testData.marcValue);
            InventorySearchAndFilter.selectFoundItemFromBrowseResultList(testData.marcValue);
            InventorySearchAndFilter.verifyInstanceDisplayed(testData.fieldContents.tag245Content);
            InventoryInstance.getId().then((id) => {
              createdInstanceIDs.push(id);
            });
            cy.wait(1000);
            InventoryInstance.viewSource();
            InventoryViewSource.contains('Linked to MARC authority\n\t100');
            InventoryViewSource.contains('Linked to MARC authority\n\t240');
            InventoryViewSource.contains('Linked to MARC authority\n\t610');
            InventoryViewSource.contains('Linked to MARC authority\n\t711');
          },
        );
      });
    });
  });
});
