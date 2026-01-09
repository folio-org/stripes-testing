import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tags: {
            tag245: '245',
          },
          fieldContents: {
            tag245Content: 'Link 240 to 111 test',
          },
          browseSearchOption: 'nameTitle',
          searchValue:
            'Date of meeting or treaty signing Date of a work Miscellaneous information Medium Form subheading Language of a work Medium of performance for music Number of part/section/meeting Arranged statement for music Name of part/section of a work Key Version',
          successMessage:
            'This record has successfully saved and is in process. Changes may not appear immediately.',
          searchQuery: 'C569598 Stockholm International Film Festival',
        };

        const newField = {
          rowIndex: 4,
          tag: '240',
          content:
            '$a Stockholm International Film Festival $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $j Relator term $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key $q Name of meeting following jurisdiction name entry element $s Version $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $1 1 $2 2 $6 Linkage $7 Data provenance $8 Field link and sequence number',
          marcValue:
            'C569598 Stockholm International Film Festival Location of meeting Date of meeting or treaty signing Date of a work Form subheading Language of a work Number of part/section/meeting Name of part/section of a work Name of meeting following jurisdiction name entry element Version title',
          searchOption: 'Keyword',
        };

        const fieldAfterLink = [
          5,
          '240',
          '\\',
          '\\',
          '$a title $d Date of meeting or treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $n Number of part/section/meeting $p Name of part/section of a work $s Version',
          '$c Location of meeting $e Subordinate unit $j Relator term $m Medium of performance for music $o Arranged statement for music $r Key $q Name of meeting following jurisdiction name entry element $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
          '$0 http://id.loc.gov/authorities/names/no2018125588',
          '$1 1 $2 2 $6 Linkage $7 Data provenance $8 Field link and sequence number',
        ];

        let userData = {};

        const marcFile = {
          marc: 'marcAuthFileForC569598.mrc',
          fileName: `testMarcFileC569598.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        };

        const recordsIDs = [];

        before('Create user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C569598*');

          cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
            testData.preconditionUserId = userProperties.userId;

            cy.getUserToken(userProperties.username, userProperties.password);
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                recordsIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;
            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });

        after('Delete created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.preconditionUserId);
          Users.deleteViaApi(userData.userId);
          MarcAuthority.deleteViaAPI(recordsIDs[0]);
          InventoryInstance.deleteInstanceViaApi(recordsIDs[1]);
        });

        it(
          'C736678 Link "240" field when MARC authority 111 has all subfields (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C736678'] },
          () => {
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateLDR06And07Positions();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
            cy.wait(500);
            InventoryInstance.verifyAndClickLinkIcon(newField.tag);
            InventoryInstance.verifySelectMarcAuthorityModal();
            // MarcAuthorities.checkSearchOption(testData.browseSearchOption);
            // MarcAuthorities.checkSearchInput(testData.searchValue);
            MarcAuthorities.switchToSearch();
            MarcAuthorities.searchByParameter(newField.searchOption, testData.searchQuery);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(fieldAfterLink[1], fieldAfterLink[0]);
            QuickMarcEditor.verifyTagFieldAfterLinking(...fieldAfterLink);
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(4000);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkCallout(testData.successMessage);
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.getId().then((id) => {
              recordsIDs.push(id);
            });
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(...fieldAfterLink);
          },
        );
      });
    });
  });
});
