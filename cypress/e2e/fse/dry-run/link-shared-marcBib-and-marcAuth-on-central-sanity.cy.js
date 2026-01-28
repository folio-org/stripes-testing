import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { parseSanityParameters } from '../../../support/utils/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tags: {
            tag245: '245',
          },
          fieldContents: {
            tag245Content: 'C422141 Created Shared Instance with linked field',
          },
          authorityTitle: 'C422141 Dante Alighieri, 1265-1321',
          searchOption: 'Personal name',
          marcAuthIcon: 'Linked to MARC authority',
          sharedLink: 'Shared',
          contributorAccordion: 'Contributor',
        };

        const newField = {
          rowIndex: 5,
          tag: '700',
          content: '$a Dante Alighieri',
          boxFourth: '$a C422141 Dante Alighieri, $d 1265-1321',
          boxFifth: '',
          boxSixth: '$0 http://id.loc.gov/authorities/names/n78095495',
          boxSeventh: '',
        };

        const marcFiles = [
          {
            marc: 'marcAuthFileForC422141.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
          },
        ];

        const { user, centralTenant, memberTenant } = parseSanityParameters();
        let instanceRecordId = null;
        let createdRecordsID = null;

        before('Create users, data', () => {
          cy.getAdminToken();
          cy.setTenant(centralTenant.id);
          InventoryInstances.deleteInstanceByTitleViaApi('C422141');
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422141');

          cy.setTenant(memberTenant.id);
          cy.getToken(user.username, user.password);

          cy.setTenant(centralTenant.id);
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordsID = record.authority.id;
              });
            });
          });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(centralTenant.id);
          if (createdRecordsID) {
            MarcAuthority.deleteViaAPI(createdRecordsID);
          }
          if (instanceRecordId) {
            InventoryInstance.deleteInstanceViaApi(instanceRecordId);
          }
        });

        it(
          'C422141 Link Shared MARC bib with Shared MARC auth on Central tenant in Create screen (consortia) (spitfire)',
          { tags: ['dryRunECS', 'spitfire', 'C422141'] },
          () => {
            cy.resetTenant();
            cy.allure().logCommandSteps(false);
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.allure().logCommandSteps();

            ConsortiumManager.switchActiveAffiliation(memberTenant.name, centralTenant.name);
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            MarcAuthority.addNewField(4, newField.tag, newField.content);
            QuickMarcEditor.updateIndicatorValue(newField.tag, '2', 0);
            QuickMarcEditor.updateIndicatorValue(newField.tag, '0', 1);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(
              newField.rowIndex,
              newField.tag,
              '2',
              '0',
              newField.content,
            );
            QuickMarcEditor.checkLinkButtonExist(newField.tag);
            InventoryInstance.verifyAndClickLinkIcon(newField.tag);
            MarcAuthorities.switchToBrowse();
            MarcAuthorityBrowse.checkSearchOptions();
            MarcAuthorityBrowse.searchBy(testData.searchOption, testData.authorityTitle);
            MarcAuthorities.checkRow(`${testData.sharedLink}${testData.authorityTitle}`);
            MarcAuthorities.verifyAbsenceOfSharedAccordion();
            MarcAuthorities.selectTitle(`${testData.sharedLink}\n${testData.authorityTitle}`);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(newField.tag, newField.rowIndex);
            QuickMarcEditor.verifyTagFieldAfterLinking(
              newField.rowIndex,
              newField.tag,
              '2',
              '0',
              `${newField.boxFourth}`,
              `${newField.boxFifth}`,
              `${newField.boxSixth}`,
              `${newField.boxSeventh}`,
            );

            QuickMarcEditor.fillEmptyTextAreaOfField(
              5,
              'records[5].subfieldGroups.uncontrolledAlpha',
              '$e writer',
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.getId().then((id) => {
              instanceRecordId = id;
            });
            InventoryInstance.checkPresentedText(testData.fieldContents.tag245Content);
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              testData.contributorAccordion,
              `Linked to MARC authority\n${testData.authorityTitle}`,
            );
            InventoryInstance.viewSource();
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t${newField.tag}\t2 0\t$a C422141 Dante Alighieri, $d 1265-1321 $e writer $0 http://id.loc.gov/authorities/names/n78095495 $9`,
            );

            ConsortiumManager.switchActiveAffiliation(centralTenant.name, memberTenant.name);
            InventoryInstances.searchByTitle(testData.fieldContents.tag245Content);
            InventoryInstances.selectInstance();
            InventoryInstance.verifySharedIcon();
            InventoryInstance.checkPresentedText(testData.fieldContents.tag245Content);
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              testData.contributorAccordion,
              `Linked to MARC authority\n${testData.authorityTitle}`,
            );
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              newField.rowIndex,
              newField.tag,
              '2',
              '0',
              `${newField.boxFourth}`,
              '$e writer',
              `${newField.boxSixth}`,
              `${newField.boxSeventh}`,
            );
          },
        );
      });
    });
  });
});
